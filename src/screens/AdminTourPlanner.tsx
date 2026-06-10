import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Alert } from '../utils/alert';

import { MapWebView } from '../components/MapWebView';
import { CategoryFilter } from '../components/CategoryFilter';
import { SubCategoryFilter } from '../components/SubCategoryFilter';
import { SearchBar } from '../components/SearchBar';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { fetchListingsWithCoords } from '../services/supabaseService';
import { replacePublicTourStops } from '../services/publicToursService';
import { getErrorMessage } from '../utils/errors';
import { jsonEmbed } from '../utils/jsonEmbed';
import { matchesSubCategory } from '../config/subcategories';
import type { Listing, ListingCategory, PublicTour, PublicTourStop } from '../types';

const WINTERTHUR_LAT = 47.4994;
const WINTERTHUR_LON = 8.7274;

const CATEGORY_COLORS: Record<string, string> = {
  restaurants: '#E53E3E',
  cafes: '#DD6B20',
  bars: '#805AD5',
  hotels: '#2B6CB0',
  sightseeing: '#276749',
  kultur: '#B7791F',
  geschaefte: '#C05621',
  sport: '#2C7A7B',
  touren: '#2D3748',
};

function buildPlannerHTML(listings: Listing[], stops: PublicTourStop[]): string {
  const lite = listings
    .filter((l) => l.lat != null && l.lon != null && Number.isFinite(l.lat!) && Number.isFinite(l.lon!))
    .map((l) => ({
      id: l.id,
      lat: l.lat,
      lon: l.lon,
      name: l.name,
      color: CATEGORY_COLORS[l.category] ?? '#8B0000',
    }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #map { height: 100%; width: 100%; }
    .stop-badge {
      background: #FF6B00; color: #fff; width: 26px; height: 26px;
      border-radius: 13px; line-height: 22px; text-align: center;
      font-weight: 800; font-size: 13px; border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .leaflet-popup-content { margin: 8px 12px; font-size: 13px; line-height: 1.35; }
    .leaflet-popup-content button {
      display: inline-block; margin-top: 4px; color: #CC0000;
      font-weight: 700; cursor: pointer; text-decoration: none;
      background: none; border: none; padding: 0; font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Listings als ID-Lookup; Popup-HTML referenziert nur die ID, damit keine
    // JSON.stringify-Werte in HTML-Attribute eingebettet werden müssen (das
    // brach mit Apostrophen / Anführungszeichen).
    var listingsArr = ${jsonEmbed(lite)};
    var listingsById = {};
    listingsArr.forEach(function(l){ listingsById[l.id] = l; });
    var currentStops = ${jsonEmbed(
      stops.map((s) => ({
        listing_id: s.listing_id ?? null,
        lat: s.lat,
        lon: s.lon,
        name: s.name,
      })),
    )};

    function send(o) {
      var m = JSON.stringify(o);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) window.ReactNativeWebView.postMessage(m);
      else if (window.parent && window.parent !== window) window.parent.postMessage(m, '*');
    }

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var map = L.map('map', { zoomControl: true }).setView([${WINTERTHUR_LAT}, ${WINTERTHUR_LON}], 14);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',
      { attribution: '© swisstopo', maxZoom: 19 }).addTo(map);

    var listingLayers = {};
    listingsArr.forEach(function(l) {
      var lyr = L.circleMarker([l.lat, l.lon], {
        radius: 6, fillColor: l.color, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: 0.85
      }).addTo(map);
      lyr.on('click', function() { openListingPopup(l.id); });
      listingLayers[l.id] = lyr;
    });

    function openListingPopup(id) {
      var l = listingsById[id];
      if (!l) return;
      var isStop = currentStops.some(function(s){ return s.listing_id === id; });
      // UUIDs enthalten nur [0-9a-f-], damit ist die Inline-Verwendung
      // in HTML-Attribut sicher.
      var btn = isStop
        ? '<button onclick="removeByListingId(\\'' + id + '\\')">Stop entfernen</button>'
        : '<button onclick="addStopById(\\'' + id + '\\')">Als Stop hinzufügen</button>';
      L.popup({ closeButton: true })
        .setLatLng([l.lat, l.lon])
        .setContent('<b>' + esc(l.name) + '</b><br/>' + btn)
        .openOn(map);
    }

    var stopLayers = [];
    var routeLine = null;
    function redrawStops() {
      stopLayers.forEach(function(m){ map.removeLayer(m); });
      stopLayers = [];
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

      currentStops.forEach(function(s, idx) {
        var html = '<div class="stop-badge">' + (idx + 1) + '</div>';
        var icon = L.divIcon({ html: html, className: '', iconSize: [28, 28], iconAnchor: [14, 14] });
        var mk = L.marker([s.lat, s.lon], { icon: icon }).addTo(map);
        (function(localIdx, localStop){
          mk.on('click', function() {
            var label = localStop.name || '(Freier Punkt)';
            var nav = '';
            if (localIdx > 0) {
              nav += '<button onclick="moveAt(' + localIdx + ', -1)">↑ früher</button> ';
            }
            if (localIdx < currentStops.length - 1) {
              nav += '<button onclick="moveAt(' + localIdx + ', 1)">↓ später</button> ';
            }
            L.popup({ closeButton: true })
              .setLatLng([localStop.lat, localStop.lon])
              .setContent('<b>' + (localIdx + 1) + '. ' + esc(label) + '</b><br/>' +
                nav + '<button onclick="removeAt(' + localIdx + ')">Entfernen</button>')
              .openOn(map);
          });
        })(idx, s);
        stopLayers.push(mk);
      });

      if (currentStops.length >= 2) {
        var latlngs = currentStops.map(function(s){ return [s.lat, s.lon]; });
        routeLine = L.polyline(latlngs, { color: '#FF6B00', weight: 4, opacity: 0.7 }).addTo(map);
      }

      Object.keys(listingLayers).forEach(function(id){
        var isStop = currentStops.some(function(s){ return s.listing_id === id; });
        listingLayers[id].setStyle({
          weight: isStop ? 3.5 : 1.5,
          color: isStop ? '#FF6B00' : '#fff',
          radius: isStop ? 8 : 6,
        });
      });

      send({ type: 'stops_changed', count: currentStops.length, stops: currentStops });
    }

    function addStopById(id) {
      var l = listingsById[id];
      if (!l) return;
      currentStops.push({ listing_id: l.id, lat: l.lat, lon: l.lon, name: l.name });
      map.closePopup();
      redrawStops();
    }
    function removeByListingId(id) {
      var i = currentStops.findIndex(function(s){ return s.listing_id === id; });
      if (i >= 0) currentStops.splice(i, 1);
      map.closePopup();
      redrawStops();
    }
    function removeAt(idx) {
      currentStops.splice(idx, 1);
      map.closePopup();
      redrawStops();
    }
    function moveAt(idx, dir) {
      var target = idx + dir;
      if (target < 0 || target >= currentStops.length) return;
      var tmp = currentStops[idx];
      currentStops[idx] = currentStops[target];
      currentStops[target] = tmp;
      map.closePopup();
      redrawStops();
    }
    window.addStopById = addStopById;
    window.removeByListingId = removeByListingId;
    window.removeAt = removeAt;
    window.moveAt = moveAt;

    // Long-Press (Desktop: Rechtsklick) auf die Karte → freien Punkt als
    // Stop anlegen. Leaflet feuert auf Touch-Geräten 'contextmenu' bei
    // langem Druck.
    var freeCount = currentStops.filter(function(s){ return !s.listing_id; }).length;
    map.on('contextmenu', function(e) {
      freeCount += 1;
      currentStops.push({
        listing_id: null,
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        name: 'Punkt ' + freeCount,
      });
      redrawStops();
    });

    if (currentStops.length > 0) {
      var bounds = L.latLngBounds(currentStops.map(function(s){ return [s.lat, s.lon]; }));
      map.fitBounds(bounds.pad(0.3));
    }
    redrawStops();
  </script>
</body>
</html>`;
}

interface Props {
  tour: PublicTour;
  onClose: () => void;
  onSaved: (stops: PublicTourStop[]) => void;
}

export function AdminTourPlanner({ tour, onClose, onSaved }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stops, setStops] = useState<PublicTourStop[]>(tour.stops);
  const [saving, setSaving] = useState(false);

  // Filter / Suche – analog zur Karten-Hauptansicht.
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [subType, setSubType] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Search-Eingabe entprellen – sonst rebauen wir die HTML bei jedem Tastenanschlag.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setSubType('all');
  }, [category]);

  useEffect(() => {
    fetchListingsWithCoords()
      .then((rows) => setListings(rows))
      .catch((err) => setError(getErrorMessage(err, 'Konnte Listings nicht laden')))
      .finally(() => setLoading(false));
  }, []);

  const filteredListings = useMemo(() => {
    let rows = listings;
    if (category !== 'all') rows = rows.filter((l) => l.category === category);
    if (subType !== 'all') rows = rows.filter((l) => matchesSubCategory(l, subType));
    if (search) {
      rows = rows.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          (l.address ?? '').toLowerCase().includes(search),
      );
    }
    return rows;
  }, [listings, category, subType, search]);

  // Stops im Ref spiegeln, damit Filter-/Suche-Rebuilds die jeweils
  // aktuellsten Stops mitnehmen, ohne dass jeder Stop-Change die Karte
  // neu lädt (was Zoom/Pan kosten würde).
  const stopsRef = useRef(stops);
  useEffect(() => {
    stopsRef.current = stops;
  }, [stops]);

  const html = useMemo(
    () => (filteredListings.length || listings.length ? buildPlannerHTML(filteredListings, stopsRef.current) : ''),
    [filteredListings, listings.length],
  );

  const handleMessage = (raw: string) => {
    let msg: { type?: string; count?: number; stops?: PublicTourStop[] } | null = null;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg && msg.type === 'stops_changed' && Array.isArray(msg.stops)) {
      setStops(msg.stops);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const normalized = stops.map((s, idx) => ({
        position: idx + 1,
        lat: s.lat,
        lon: s.lon,
        name: s.name,
        listing_id: s.listing_id ?? null,
      }));
      await replacePublicTourStops(tour.id, normalized);
      onSaved(normalized);
    } catch (err) {
      Alert.alert('Fehler', getErrorMessage(err, 'Speichern fehlgeschlagen'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.linkText}>Abbrechen</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title} numberOfLines={1}>{tour.name}</Text>
          <Text style={styles.subtitle}>
            {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'} · {filteredListings.length} sichtbar
          </Text>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.linkText, { fontWeight: '700' }]}>{saving ? '…' : 'Speichern'}</Text>
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder="Listing suchen…"
      />
      <CategoryFilter selected={category} onSelect={setCategory} />
      {category !== 'all' && (
        <SubCategoryFilter category={category} selected={subType} onSelect={setSubType} />
      )}

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
      {!loading && !error && (
        <View style={{ flex: 1 }}>
          <MapWebView html={html} onAnyMessage={handleMessage} />
          <View style={styles.hint} pointerEvents="none">
            <Ionicons name="information-circle-outline" size={14} color="#fff" />
            <Text style={styles.hintText}>
              Marker tippen = Stop · Stop tippen = ordnen/entfernen · lange drücken = freier Punkt
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    linkText: { color: theme.colors.primary, fontSize: 15 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { color: theme.colors.error, fontSize: 13 },
    hint: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(26,26,26,0.85)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      justifyContent: 'center',
    },
    hintText: { color: '#fff', fontSize: 12 },
  });

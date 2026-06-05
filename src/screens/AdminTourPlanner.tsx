import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MapWebView } from '../components/MapWebView';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { fetchListingsWithCoords } from '../services/supabaseService';
import { replacePublicTourStops } from '../services/publicToursService';
import { getErrorMessage } from '../utils/errors';
import type { Listing, PublicTour, PublicTourStop } from '../types';

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

/** HTML/JS-string sicher in einer JS-Literalumgebung einbetten. */
function jsString(value: unknown): string {
  return JSON.stringify(value);
}

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
    .leaflet-popup-content a, .leaflet-popup-content button {
      display: inline-block; margin-top: 4px; color: #CC0000;
      font-weight: 700; cursor: pointer; text-decoration: none;
      background: none; border: none; padding: 0; font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var listings = ${jsString(lite)};
    var currentStops = ${jsString(
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
    }

    var map = L.map('map', { zoomControl: true }).setView([${WINTERTHUR_LAT}, ${WINTERTHUR_LON}], 14);
    L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg',
      { attribution: '© swisstopo', maxZoom: 19 }).addTo(map);

    // Listings: kleine Kreismarker. Bereits als Stop markierte werden visuell
    // mit dickerem Rand hervorgehoben.
    var listingLayers = {};
    listings.forEach(function(l) {
      var lyr = L.circleMarker([l.lat, l.lon], {
        radius: 6, fillColor: l.color, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: 0.85
      }).addTo(map);
      lyr.on('click', function() { openListingPopup(l); });
      listingLayers[l.id] = lyr;
    });

    function openListingPopup(l) {
      var isStop = currentStops.some(function(s){ return s.listing_id === l.id; });
      var action = isStop
        ? '<a href="#" onclick="removeByListing(' + JSON.stringify(l.id) + '); return false;">Stop entfernen</a>'
        : '<a href="#" onclick="addStop(' + JSON.stringify(l) + '); return false;">Als Stop hinzufügen</a>';
      L.popup({ closeButton: true })
        .setLatLng([l.lat, l.lon])
        .setContent('<b>' + l.name + '</b><br/>' + action)
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
        mk.on('click', function() {
          var label = s.name || '(Freier Punkt)';
          L.popup({ closeButton: true })
            .setLatLng([s.lat, s.lon])
            .setContent('<b>' + (idx + 1) + '. ' + label + '</b><br/>' +
              '<a href="#" onclick="removeAt(' + idx + '); return false;">Stop entfernen</a>')
            .openOn(map);
        });
        stopLayers.push(mk);
      });

      if (currentStops.length >= 2) {
        var latlngs = currentStops.map(function(s){ return [s.lat, s.lon]; });
        routeLine = L.polyline(latlngs, { color: '#FF6B00', weight: 4, opacity: 0.7 }).addTo(map);
      }

      // Visuelles Feedback an Listing-Markern: dickerer Rand wenn Stop.
      Object.keys(listingLayers).forEach(function(id){
        var isStop = currentStops.some(function(s){ return s.listing_id === id; });
        listingLayers[id].setStyle({
          weight: isStop ? 3.5 : 1.5,
          color: isStop ? '#FF6B00' : '#fff',
          radius: isStop ? 8 : 6,
        });
      });

      // Bei jeder Änderung die volle Stops-Liste an RN durchreichen; React
      // hält damit den Wahrheitswert und kann ohne JS-Injection speichern.
      send({ type: 'stops_changed', count: currentStops.length, stops: currentStops });
    }

    function addStop(l) {
      currentStops.push({ listing_id: l.id, lat: l.lat, lon: l.lon, name: l.name });
      map.closePopup();
      redrawStops();
    }
    function removeByListing(id) {
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
    window.addStop = addStop;
    window.removeByListing = removeByListing;
    window.removeAt = removeAt;

    // Auf vorhandene Stops zentrieren, wenn welche da sind.
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

/**
 * Vollbild-Planer: Admin tippt auf Listing-Marker um Stops anzulegen, auf Stops
 * um sie zu entfernen. Zustand lebt im WebView; auf „Speichern" wird er per
 * postMessage abgefragt und in `public_tour_stops` persistiert.
 */
export function AdminTourPlanner({ tour, onClose, onSaved }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Stops sind im WebView die Wahrheit; React mirrort sie für Header + Save.
  const [stops, setStops] = useState<PublicTourStop[]>(tour.stops);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchListingsWithCoords()
      .then((rows) => setListings(rows))
      .catch((err) => setError(getErrorMessage(err, 'Konnte Listings nicht laden')))
      .finally(() => setLoading(false));
  }, []);

  // HTML wird einmalig gebaut, sobald Listings da sind. Stops werden danach
  // ausschließlich im WebView verwaltet (sonst würde jeder Stop-Change die
  // Karte neu laden und Zoom/Pan verlieren).
  const html = useMemo(
    () => (listings.length ? buildPlannerHTML(listings, tour.stops) : ''),
    [listings, tour.stops],
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
          <Text style={styles.subtitle}>{stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}</Text>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.linkText, { fontWeight: '700' }]}>{saving ? '…' : 'Speichern'}</Text>
        </TouchableOpacity>
      </View>

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
              Tippe Marker = Stop hinzufügen · Tippe Stop = entfernen
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
    errorText: { color: '#C0392B', fontSize: 13 },
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

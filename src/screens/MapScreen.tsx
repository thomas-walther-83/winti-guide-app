import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapWebView } from '../components/MapWebView';
import { CategoryFilter } from '../components/CategoryFilter';
import { SubCategoryFilter } from '../components/SubCategoryFilter';
import { fetchListingsWithCoords } from '../services/supabaseService';
import { getErrorMessage } from '../utils/errors';
import { matchesSubType } from '../config/subcategories';
import { useDetail } from '../context/DetailContext';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { useLocation } from '../hooks/useLocation';
import { theme } from '../styles/theme';
import type { LatLon } from '../utils/distance';
import type { Listing, ListingCategory } from '../types';

// Winterthur city center coordinates
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

/** Safely encode a string for embedding in an HTML popup (no JS string context). */
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tappbarer Popup-Inhalt: Name + Adresse + „Details ›". Beim Tippen wird per
 *  RN-Bridge die Listing-ID gesendet, damit nativ der Detail-Dialog öffnet. */
function detailPopup(l: Listing): string {
  const name = htmlEscape(l.name);
  const addr = htmlEscape(l.address ?? '');
  return (
    `<div onclick="sel('${l.id}')" style="cursor:pointer;min-width:150px">` +
    `<b>${name}</b>${addr ? '<br><span style="color:#555">' + addr + '</span>' : ''}` +
    `<div style="margin-top:6px;color:#8B0000;font-weight:700">Details ›</div></div>`
  );
}

function buildLeafletHTML(
  listings: Listing[],
  focusListing: Listing | null | undefined,
  userCoords: LatLon | null | undefined,
  labels: { karte: string; luftbild: string },
): string {
  const markers = listings
    .filter(
      (l) =>
        l.lat != null &&
        l.lon != null &&
        Number.isFinite(l.lat) &&
        Number.isFinite(l.lon),
    )
    .map((l) => {
      const color = CATEGORY_COLORS[l.category] ?? '#8B0000';
      const popupLiteral = JSON.stringify(detailPopup(l));
      const isFocused = focusListing != null && focusListing.id === l.id;
      return `(function(){
        var lyr = L.circleMarker([${l.lat}, ${l.lon}], {
          radius: 8, fillColor: '${color}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85
        }).bindPopup(${popupLiteral}).addTo(map);
        lyr._def = { radius: 8, color: '#fff', weight: 2 };
        lyr._sel = { radius: 11, color: '#FFD700', weight: 3 };
        lyr.on('click', function(){ selectLayer(lyr, false); });
        ${isFocused && !l.geometry ? 'initialSel = lyr;' : ''}
      })();`;
    })
    .join('\n');

  // Tourenlinien (GeoJSON): kräftige Farbe mit weißer Kontur (Casing), damit sie
  // auf Karte UND Luftbild gut sichtbar sind. Die fokussierte Tour wird dicker,
  // in Signalfarbe und in den Vordergrund gebracht; ihre Bounds für fitBounds gemerkt.
  const polylines = listings
    .filter((l) => l.geometry && Array.isArray(l.geometry.coordinates) && l.geometry.coordinates.length > 0)
    .map((l) => {
      const isFocused = focusListing != null && focusListing.id === l.id;
      const geomLiteral = JSON.stringify(l.geometry);
      const popupLiteral = JSON.stringify(detailPopup(l));
      return `(function(){
        L.geoJSON(${geomLiteral}, { style: { color: '#FFFFFF', weight: 7, opacity: 0.9 } }).addTo(map);
        var lyr = L.geoJSON(${geomLiteral}, { style: { color: '#1565C0', weight: 4, opacity: 1 } }).bindPopup(${popupLiteral}).addTo(map);
        lyr._def = { color: '#1565C0', weight: 4 };
        lyr._sel = { color: '#FF6D00', weight: 7 };
        lyr._line = true;
        lyr.on('click', function(){ selectLayer(lyr, true); });
        ${isFocused ? 'initialSel = lyr;' : ''}
      })();`;
    })
    .join('\n');

  const hasUser =
    userCoords != null &&
    Number.isFinite(userCoords.lat) &&
    Number.isFinite(userCoords.lon);

  // Eigener Standort als blauer Marker mit Genauigkeits-Halo.
  const userMarker = hasUser
    ? `L.circle([${userCoords!.lat}, ${userCoords!.lon}], {
        radius: 60, fillColor: '#007AFF', color: '#007AFF',
        weight: 1, opacity: 0.4, fillOpacity: 0.12
      }).addTo(map);
      L.circleMarker([${userCoords!.lat}, ${userCoords!.lon}], {
        radius: 7, fillColor: '#007AFF', color: '#FFFFFF',
        weight: 3, opacity: 1, fillOpacity: 1
      }).bindPopup('📍 Dein Standort').addTo(map);`
    : '';

  // Aus Entdecken fokussierte Tour/Ort: hervorheben + einpassen.
  const focusScript = `
    if (initialSel) {
      selectLayer(initialSel, !!initialSel._line);
      if (initialSel._line) {
        map.fitBounds(initialSel.getBounds(), { padding: [30, 30] });
      } else {
        map.setView(initialSel.getLatLng(), 17);
      }
      initialSel.openPopup();
    }${hasUser ? ` else {
      map.setView([${userCoords!.lat}, ${userCoords!.lon}], 15);
    }` : ''}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; }
    #map { height: 100%; width: 100%; }
    .leaflet-popup-content-wrapper {
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .leaflet-popup-content b {
      font-size: 14px;
      color: #1A1A1A;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Popup-Tap → Listing-ID an die App senden (öffnet den Detail-Dialog).
    // Nativ über die RN-Bridge, im Web über postMessage an das Eltern-Fenster (iframe).
    function sel(id) {
      var msg = JSON.stringify({ type: 'detail', id: id });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }

    // Auswahl-Hervorhebung in der Karte (ohne Neuladen): angetippte Linie/Punkt
    // wird hervorgehoben, die vorher gewählte zurückgesetzt.
    var currentSel = null;
    var initialSel = null;
    function applyStyle(lyr, s) {
      if (s.radius != null && lyr.setRadius) lyr.setRadius(s.radius);
      lyr.setStyle({ color: s.color, weight: s.weight });
    }
    function selectLayer(lyr, isLine) {
      if (currentSel && currentSel !== lyr) applyStyle(currentSel, currentSel._def);
      applyStyle(lyr, lyr._sel);
      if (isLine || lyr._line) lyr.bringToFront();
      currentSel = lyr;
    }

    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${WINTERTHUR_LAT}, ${WINTERTHUR_LON}], 14);

    // Offizielle Schweizer Landeskarte (swisstopo, gratis) als Basis,
    // umschaltbar auf das Luftbild (SWISSIMAGE).
    var swissKarte = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
      attribution: '© <a href="https://www.swisstopo.admin.ch">swisstopo</a>',
      maxZoom: 19
    });
    var swissLuftbild = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', {
      attribution: '© <a href="https://www.swisstopo.admin.ch">swisstopo</a>',
      maxZoom: 19
    });
    swissKarte.addTo(map);
    L.control.layers(
      { ${JSON.stringify(labels.karte)}: swissKarte, ${JSON.stringify(labels.luftbild)}: swissLuftbild },
      null,
      { position: 'topright', collapsed: true }
    ).addTo(map);

    ${polylines}
    ${markers}
    ${userMarker}
    ${focusScript}
  </script>
</body>
</html>`;
}

export interface MapTour {
  name: string;
  stops: { lat: number; lon: number; name: string }[];
}

// Karte im Tour-Modus: Route entlang Straßen (OSRM via Leaflet Routing Machine),
// per Drag anpassbar, mit Distanz/Gehzeit-Overlay und nummerierten Stops.
function buildTourHTML(
  tour: MapTour,
  userCoords: LatLon | null | undefined,
  labels: { karte: string; luftbild: string; dragHint: string; min: string },
): string {
  const stops = tour.stops.filter(
    (s) => Number.isFinite(s.lat) && Number.isFinite(s.lon),
  );
  const waypoints = stops.map((s) => `L.latLng(${s.lat}, ${s.lon})`).join(', ');
  const stopNames = JSON.stringify(stops.map((s) => s.name));

  const hasUser =
    userCoords != null &&
    Number.isFinite(userCoords.lat) &&
    Number.isFinite(userCoords.lon);
  const userMarker = hasUser
    ? `L.circle([${userCoords!.lat}, ${userCoords!.lon}], { radius: 60, fillColor: '#007AFF', color: '#007AFF', weight: 1, opacity: 0.4, fillOpacity: 0.12 }).addTo(map);
       L.circleMarker([${userCoords!.lat}, ${userCoords!.lon}], { radius: 7, fillColor: '#007AFF', color: '#FFFFFF', weight: 3, opacity: 1, fillOpacity: 1 }).addTo(map);`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #map { height: 100%; width: 100%; }
    .leaflet-routing-container { display: none; }
    #info {
      position: absolute; left: 50%; transform: translateX(-50%); bottom: 16px; z-index: 1000;
      background: rgba(26,26,26,0.92); color: #fff; padding: 8px 16px; border-radius: 20px;
      font-size: 14px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap;
    }
    #hint {
      position: absolute; left: 50%; transform: translateX(-50%); top: 12px; z-index: 1000;
      background: rgba(255,255,255,0.95); color: #333; padding: 6px 12px; border-radius: 16px;
      font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">${labels.dragHint}</div>
  <div id="info">…</div>
  <script>
    var stopNames = ${stopNames};
    var minLabel = ${JSON.stringify(labels.min)};
    var map = L.map('map', { zoomControl: true }).setView([${WINTERTHUR_LAT}, ${WINTERTHUR_LON}], 14);

    var swissKarte = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', { attribution: '© swisstopo', maxZoom: 19 });
    var swissLuftbild = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', { attribution: '© swisstopo', maxZoom: 19 });
    swissKarte.addTo(map);
    L.control.layers({ ${JSON.stringify(labels.karte)}: swissKarte, ${JSON.stringify(labels.luftbild)}: swissLuftbild }, null, { position: 'topright', collapsed: true }).addTo(map);

    ${userMarker}

    var control = L.Routing.control({
      waypoints: [${waypoints}],
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'driving' }),
      routeWhileDragging: true,
      addWaypoints: true,
      draggableWaypoints: true,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: { addWaypoints: true, styles: [ { color: '#FFFFFF', weight: 9, opacity: 0.9 }, { color: '#FF6D00', weight: 6, opacity: 1 } ] },
      createMarker: function(i, wp, n) {
        var label = (i + 1);
        return L.marker(wp.latLng, {
          draggable: true,
          icon: L.divIcon({
            className: '',
            html: '<div style="background:#FF6D00;color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 1px 4px rgba(0,0,0,0.45)">' + label + '</div>',
            iconSize: [26, 26], iconAnchor: [13, 13]
          })
        }).bindPopup(stopNames[i] ? ('<b>' + label + '. ' + stopNames[i] + '</b>') : ('Wegpunkt ' + label));
      }
    }).addTo(map);

    control.on('routesfound', function(e) {
      var s = e.routes[0].summary;
      var km = (s.totalDistance / 1000).toFixed(1);
      var min = Math.round((s.totalDistance / 1000) / 5 * 60); // Gehzeit ~5 km/h
      document.getElementById('info').innerHTML = km + ' km · ' + min + ' ' + minLabel;
    });
    control.on('routingerror', function() {
      document.getElementById('info').innerHTML = '⚠︎';
    });
  </script>
</body>
</html>`;
}

export function MapScreen({
  focusListing,
  focusTour,
}: {
  focusListing?: Listing | null;
  focusTour?: MapTour | null;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
  const [selectedSubType, setSelectedSubType] = useState<string>('all');
  const { t } = useTranslation();
  const { coords: userCoords, status: locStatus, request: requestLocation } = useLocation();
  const { open } = useDetail();
  const { savedIds, toggle } = useFavorites();

  // Tour-Modus (aus „Meine Touren" → Auf Karte zeigen). Synchron zum Prop,
  // lokal schließbar über das X im Tour-Header.
  const [activeTour, setActiveTour] = useState<MapTour | null>(focusTour ?? null);
  useEffect(() => {
    setActiveTour(focusTour ?? null);
  }, [focusTour]);

  // Popup-Tap aus der Karte → nativen Detail-Dialog öffnen (wie in Entdecken).
  const handleSelectFromMap = useCallback(
    (id: string) => {
      const listing = listings.find((l) => l.id === id);
      if (listing) {
        open({ kind: 'listing', listing, isSaved: savedIds.includes(id), onToggleSave: toggle });
      }
    },
    [listings, savedIds, toggle, open],
  );

  // Standort einmalig beim Öffnen der Karte anfragen.
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Reset subcategory whenever category changes
  useEffect(() => {
    setSelectedSubType('all');
  }, [selectedCategory]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchListingsWithCoords();
        setListings(data);
      } catch (err) {
        setError(getErrorMessage(err, t('error_loading')));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredListings = (() => {
    let result = selectedCategory === 'all'
      ? listings
      : listings.filter((l) => l.category === selectedCategory);

    if (selectedSubType !== 'all') {
      result = result.filter((l) => matchesSubType(l.sub_type, selectedSubType));
    }
    return result;
  })();

  const inTourMode = activeTour != null && activeTour.stops.length >= 2;

  const html = inTourMode
    ? buildTourHTML(activeTour!, userCoords, {
        karte: t('map_layer_map'),
        luftbild: t('map_layer_aerial'),
        dragHint: t('tour_drag_hint'),
        min: t('minutes_short'),
      })
    : buildLeafletHTML(filteredListings, focusListing, userCoords, {
        karte: t('map_layer_map'),
        luftbild: t('map_layer_aerial'),
      });

  return (
    <SafeAreaView style={styles.container}>
      {inTourMode ? (
        <View style={styles.tourHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{activeTour!.name}</Text>
            <Text style={styles.subtitle}>
              {activeTour!.stops.length} {t('tours_stops_label')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setActiveTour(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
          >
            <Ionicons name="close-circle" size={28} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.title}>{t('map')}</Text>
          <Text style={styles.subtitle}>
            {filteredListings.length > 0
              ? `${filteredListings.length} ${t('places_in_winterthur_suffix')}`
              : t('winterthur')}
          </Text>
        </View>
      )}

      {!inTourMode && <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />}

      {!inTourMode && selectedCategory !== 'all' && (
        <SubCategoryFilter
          category={selectedCategory}
          selected={selectedSubType}
          onSelect={setSelectedSubType}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('map_loading')}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {!error && (
        <View style={styles.mapWrap}>
          <MapWebView
            html={html}
            loading={loading}
            onError={(e) => setError(e.nativeEvent.description)}
            onSelectListing={handleSelectFromMap}
          />
          {locStatus !== 'unavailable' && (
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={requestLocation}
              accessibilityRole="button"
              accessibilityLabel={t('my_location')}
            >
              {locStatus === 'requesting' ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons
                  name="locate"
                  size={22}
                  color={userCoords ? theme.colors.primary : theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          )}
          {locStatus === 'denied' && (
            <View style={styles.locHint}>
              <Text style={styles.locHintText}>{t('location_denied')}</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
    zIndex: 10,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 15,
    textAlign: 'center',
  },
  mapWrap: {
    flex: 1,
  },
  locateBtn: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  locHint: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md + 60,
    bottom: theme.spacing.lg + 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  locHintText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});

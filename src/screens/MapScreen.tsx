import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MapWebView } from '../components/MapWebView';
import { fetchListingsWithCoords } from '../services/supabaseService';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

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

function buildLeafletHTML(listings: Listing[]): string {
  const markers = listings
    .filter((l) => l.lat != null && l.lon != null)
    .map((l) => {
      const color = CATEGORY_COLORS[l.category] ?? '#8B0000';
      // Build popup HTML content and embed it as a JSON-serialised JS string literal.
      // JSON.stringify handles all special characters (backslashes, quotes, newlines, etc.)
      // preventing any injection through listing names or addresses.
      const popupHtml = `<b>${htmlEscape(l.name)}</b><br>${htmlEscape(l.address ?? '')}`;
      const popupLiteral = JSON.stringify(popupHtml);
      return `L.circleMarker([${l.lat}, ${l.lon}], {
        radius: 8,
        fillColor: '${color}',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).bindPopup(${popupLiteral}).addTo(map);`;
    })
    .join('\n');

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
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${WINTERTHUR_LAT}, ${WINTERTHUR_LON}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    ${markers}
  </script>
</body>
</html>`;
}

export function MapScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchListingsWithCoords();
        setListings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const html = buildLeafletHTML(listings);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Karte</Text>
        <Text style={styles.subtitle}>
          {listings.length > 0
            ? `${listings.length} Orte in Winterthur`
            : 'Winterthur'}
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Karte wird geladen...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {!error && (
        <MapWebView
          html={html}
          loading={loading}
          onError={(e) => setError(e.nativeEvent.description)}
        />
      )}

      {/* Legend */}
      {!loading && !error && (
        <View style={styles.legend}>
          {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([cat, color]) => (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.legendLabel}>{cat}</Text>
            </View>
          ))}
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
});

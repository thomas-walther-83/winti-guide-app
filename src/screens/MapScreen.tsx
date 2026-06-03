import React, { useState, useEffect } from 'react';
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
import { SUB_CATEGORY_ALIASES } from '../config/subcategories';
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

function buildLeafletHTML(
  listings: Listing[],
  focusListing?: Listing | null,
  userCoords?: LatLon | null,
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
      const popupHtml = `<b>${htmlEscape(l.name)}</b><br>${htmlEscape(l.address ?? '')}`;
      const popupLiteral = JSON.stringify(popupHtml);
      const isFocused = focusListing != null && focusListing.id === l.id;
      const varDecl = isFocused ? 'var focusMarker = ' : '';
      return `${varDecl}L.circleMarker([${l.lat}, ${l.lon}], {
        radius: ${isFocused ? 11 : 8},
        fillColor: '${color}',
        color: ${isFocused ? "'#FFD700'" : "'#fff'"},
        weight: ${isFocused ? 3 : 2},
        opacity: 1,
        fillOpacity: 0.85
      }).bindPopup(${popupLiteral}).addTo(map);`;
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

  const focusScript =
    focusListing?.lat != null &&
    focusListing?.lon != null &&
    Number.isFinite(focusListing.lat) &&
    Number.isFinite(focusListing.lon)
      ? `map.setView([${focusListing.lat}, ${focusListing.lon}], 17);
    if (typeof focusMarker !== 'undefined') { focusMarker.openPopup(); }`
      : hasUser
        ? `map.setView([${userCoords!.lat}, ${userCoords!.lon}], 15);`
        : '';

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
    ${userMarker}
    ${focusScript}
  </script>
</body>
</html>`;
}

export function MapScreen({ focusListing }: { focusListing?: Listing | null }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
  const [selectedSubType, setSelectedSubType] = useState<string>('all');
  const { t } = useTranslation();
  const { coords: userCoords, status: locStatus, request: requestLocation } = useLocation();

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
      const aliases = SUB_CATEGORY_ALIASES[selectedSubType] ?? [selectedSubType.toLowerCase()];
      result = result.filter((l) => aliases.includes((l.sub_type ?? '').toLowerCase()));
    }
    return result;
  })();

  const html = buildLeafletHTML(filteredListings, focusListing, userCoords);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('map')}</Text>
        <Text style={styles.subtitle}>
          {filteredListings.length > 0
            ? `${filteredListings.length} ${t('places_in_winterthur_suffix')}`
            : t('winterthur')}
        </Text>
      </View>

      <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

      {selectedCategory !== 'all' && (
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

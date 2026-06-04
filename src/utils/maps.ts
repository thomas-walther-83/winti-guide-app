import { Linking } from 'react-native';

/** Baut die Google-Maps-Such-URL (Ort öffnen) aus Koordinaten oder Suchbegriff. */
export function googleMapsSearchUrl(
  lat?: number | null,
  lon?: number | null,
  query?: string,
): string | null {
  let q = '';
  if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    q = `${lat},${lon}`;
  } else if (query) {
    q = encodeURIComponent(query);
  }
  return q ? `https://www.google.com/maps/search/?api=1&query=${q}` : null;
}

/** Baut die Google-Maps-Routen-URL (Navigation zum Ziel). */
export function googleMapsDirUrl(
  lat?: number | null,
  lon?: number | null,
  query?: string,
): string | null {
  let dest = '';
  if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    dest = `${lat},${lon}`;
  } else if (query) {
    dest = encodeURIComponent(query);
  }
  return dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest}` : null;
}

/** Öffnet die Google-Maps-Routenführung zum Ziel (App, sonst Browser). */
export function openDirections(lat?: number | null, lon?: number | null, query?: string): void {
  const url = googleMapsDirUrl(lat, lon, query);
  if (url) Linking.openURL(url).catch(() => undefined);
}

/** Öffnet den Ort in Google Maps (Suche nach Koordinaten oder Name/Adresse). */
export function openInGoogleMaps(lat?: number | null, lon?: number | null, query?: string): void {
  const url = googleMapsSearchUrl(lat, lon, query);
  if (url) Linking.openURL(url).catch(() => undefined);
}

import { Linking } from 'react-native';

/**
 * Baut einen Google-Maps-Suchbegriff für ein Listing. Name + Adresse + Stadt,
 * damit Google den tatsächlichen Ort (nicht nur Koordinaten) anzeigt.
 */
export function listingMapsQuery(name?: string, address?: string): string {
  return [name, address, 'Winterthur'].map((s) => (s ?? '').trim()).filter(Boolean).join(', ');
}

/**
 * Baut die Google-Maps-Such-URL (Ort öffnen). Bevorzugt den Namen/Adresse,
 * damit der echte Ort angezeigt wird; Koordinaten nur als Rückfall.
 */
export function googleMapsSearchUrl(
  lat?: number | null,
  lon?: number | null,
  query?: string,
): string | null {
  let q = '';
  if (query && query.trim()) {
    q = encodeURIComponent(query.trim());
  } else if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) {
    q = `${lat},${lon}`;
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

/**
 * Baut eine Google-Maps-Routen-URL für eine ganze Tour (zu Fuß): erster Stop =
 * Start, letzter = Ziel, dazwischen als Wegpunkte. Gibt null bei < 2 Stops.
 */
export function googleMapsTourUrl(stops: { lat: number; lon: number }[]): string | null {
  const pts = stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
  if (pts.length < 2) return null;
  const origin = `${pts[0].lat},${pts[0].lon}`;
  const destination = `${pts[pts.length - 1].lat},${pts[pts.length - 1].lon}`;
  const mids = pts.slice(1, -1).map((p) => `${p.lat},${p.lon}`).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
  if (mids) url += `&waypoints=${encodeURIComponent(mids)}`;
  return url;
}

/** Öffnet die ganze Tour als Fuß-Route in Google Maps. */
export function openTourInGoogleMaps(stops: { lat: number; lon: number }[]): void {
  const url = googleMapsTourUrl(stops);
  if (url) Linking.openURL(url).catch(() => undefined);
}

import type { Listing } from '../types';

/**
 * Primärbild eines Listings für Karten/Zeilen-Komponenten.
 * Bevorzugt das neue `image_urls`-Array (Bildergalerie); fällt auf das
 * alte `image_url` zurück.
 */
export function primaryImage(listing: Pick<Listing, 'image_urls' | 'image_url'>): string | null {
  const first = listing.image_urls?.[0];
  if (first && first.trim()) return first;
  if (listing.image_url && listing.image_url.trim()) return listing.image_url;
  return null;
}

/**
 * Heuristik: URL zeigt vermutlich ein Logo/Icon statt eines Fotos.
 * Logos sind oft transparente PNGs — auf hellem Grund unsichtbar und
 * mit `cover` grotesk skaliert. Solche Bilder werden mit `contain`
 * auf farbigem Kategorie-Grund gerendert.
 */
export function isLogoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /(logo|signet|wappen|apple-touch|favicon|icon)/i.test(url);
}

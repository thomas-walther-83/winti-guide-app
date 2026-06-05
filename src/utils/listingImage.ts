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

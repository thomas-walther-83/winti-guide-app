import { Ionicons } from '@expo/vector-icons';
import type { Listing, ListingCategory } from '../types';
import { subTypeTokens } from './subcategories';

/**
 * Kuratierte, kategorieübergreifende Themen-Kollektionen für den Entdecken-Screen.
 *
 * Eine Kollektion matcht ein Listing, wenn
 *   (categories leer ODER listing.category in categories)
 *   UND (subTypes leer ODER listing.sub_type.toLowerCase() in subTypes).
 *
 * Sind nur `categories` gesetzt (keine `subTypes`), reicht die Kategorie.
 */
export interface Collection {
  id: string;
  /** i18n-Key – muss in allen locale-Dateien existieren. */
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  categories?: ListingCategory[];
  /** OSM-/ZT-Werte aus listing.sub_type (lower-case-Vergleich). */
  subTypes?: string[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'mit_kindern',
    labelKey: 'col_mit_kindern',
    icon: 'happy-outline',
    categories: ['sightseeing', 'sport', 'kultur'],
    subTypes: [
      'zoo',
      'theme_park',
      'aquarium',
      'park',
      'nature_reserve',
      'picnic_site',
      'swimming_pool',
      'water_park',
      'swimming',
      'public_bath',
      'museum',
    ],
  },
  {
    id: 'bei_regen',
    labelKey: 'col_bei_regen',
    icon: 'rainy-outline',
    categories: ['kultur', 'cafes'],
    subTypes: ['museum', 'gallery', 'cinema', 'arts_centre'],
  },
  {
    id: 'schwimmen',
    labelKey: 'col_schwimmen',
    icon: 'water-outline',
    categories: ['sport'],
    subTypes: ['swimming_pool', 'water_park', 'swimming', 'public_bath'],
  },
  {
    id: 'kultur',
    labelKey: 'col_kultur',
    icon: 'color-palette-outline',
    categories: ['kultur'],
  },
  {
    id: 'ausgang',
    labelKey: 'col_ausgang',
    icon: 'wine-outline',
    categories: ['bars'],
  },
  {
    id: 'aussicht',
    labelKey: 'col_aussicht',
    icon: 'telescope-outline',
    categories: ['sightseeing'],
    subTypes: ['viewpoint'],
  },
];

/** Prüft, ob ein Listing zu einer Kollektion passt. */
export function matchesCollection(listing: Listing, collection: Collection): boolean {
  const categoryOk =
    !collection.categories ||
    collection.categories.length === 0 ||
    collection.categories.includes(listing.category);

  const tokens = subTypeTokens(listing.sub_type);
  const wanted = (collection.subTypes ?? []).map((s) => s.toLowerCase());
  const subTypeOk =
    wanted.length === 0 ||
    tokens.some((tok) => wanted.includes(tok));

  return categoryOk && subTypeOk;
}

/** Liefert die Kollektion zu einer id (oder undefined). */
export function getCollection(id: string | null): Collection | undefined {
  if (!id) return undefined;
  return COLLECTIONS.find((c) => c.id === id);
}

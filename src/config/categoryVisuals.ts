import { Ionicons } from '@expo/vector-icons';
import type { ListingCategory, EventCategory } from '../types';

export interface CategoryVisual {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
}

/** Zentrale Visuals (Vektor-Icon + Hintergrundfarbe) je Listing-Kategorie. */
export const LISTING_VISUALS: Record<ListingCategory, CategoryVisual> = {
  restaurants: { icon: 'restaurant', bg: '#C0392B' },
  cafes: { icon: 'cafe', bg: '#8B6914' },
  bars: { icon: 'wine', bg: '#6C3483' },
  hotels: { icon: 'bed', bg: '#1A5276' },
  sightseeing: { icon: 'business', bg: '#1E8449' },
  kultur: { icon: 'color-palette', bg: '#C0392B' },
  geschaefte: { icon: 'bag-handle', bg: '#A04000' },
  sport: { icon: 'fitness', bg: '#117A65' },
  touren: { icon: 'map', bg: '#2E4057' },
};

/** Zentrale Visuals (Vektor-Icon + Hintergrundfarbe) je Event-Kategorie. */
export const EVENT_VISUALS: Record<EventCategory, CategoryVisual> = {
  festival: { icon: 'sparkles', bg: '#C0392B' },
  musik: { icon: 'musical-notes', bg: '#6C3483' },
  kultur: { icon: 'color-palette', bg: '#C0392B' },
  markt: { icon: 'bag-handle', bg: '#A04000' },
  theater: { icon: 'ticket', bg: '#1A5276' },
  tour: { icon: 'map', bg: '#2E4057' },
  kulinarik: { icon: 'wine', bg: '#8B6914' },
  sport: { icon: 'fitness', bg: '#117A65' },
};

const FALLBACK_LISTING: CategoryVisual = { icon: 'location', bg: '#CC0000' };
const FALLBACK_EVENT: CategoryVisual = { icon: 'calendar', bg: '#CC0000' };

export function getListingVisual(category: string): CategoryVisual {
  return LISTING_VISUALS[category as ListingCategory] ?? FALLBACK_LISTING;
}

export function getEventVisual(cat: string): CategoryVisual {
  return EVENT_VISUALS[cat as EventCategory] ?? FALLBACK_EVENT;
}

export interface Listing {
  id: string;
  source?: string;
  source_id?: string;
  category: ListingCategory;
  sub_type?: string;
  name: string;
  address?: string;
  hours?: string;
  phone?: string;
  website?: string;
  stars?: string;
  description?: string;
  lat?: number | null;
  lon?: number | null;
  is_premium?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  source?: string;
  source_id?: string;
  title: string;
  cat: EventCategory;
  location?: string;
  event_date: string;
  event_time?: string;
  price?: string;
  description?: string;
  url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Ad {
  id: string;
  title: string;
  subtitle?: string;
  cta_label?: string;
  cta_url?: string;
  position?: string;
  is_active?: boolean;
}

export type Language = 'de' | 'en' | 'fr' | 'it';

export type ListingCategory =
  | 'restaurants'
  | 'cafes'
  | 'bars'
  | 'hotels'
  | 'sightseeing'
  | 'kultur'
  | 'geschaefte'
  | 'sport'
  | 'touren';

export type EventCategory =
  | 'festival'
  | 'musik'
  | 'kultur'
  | 'markt'
  | 'theater'
  | 'tour'
  | 'kulinarik'
  | 'sport';

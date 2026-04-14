import { supabase } from '../config/supabase';
import type { Listing, Event, Ad, ListingCategory, EventCategory } from '../types';

// ── Listings ─────────────────────────────────────────────────────────────────

export async function fetchListings(options?: {
  category?: ListingCategory;
  search?: string;
}): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function fetchListingsWithCoords(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, name, category, address, lat, lon')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (error) throw error;
  return (data ?? []) as Listing[];
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEvents(options?: {
  category?: EventCategory;
  from?: string;
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('event_date');

  if (options?.category) {
    query = query.eq('cat', options.category);
  }

  if (options?.from) {
    query = query.gte('event_date', options.from);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Event[];
}

// ── Ads ──────────────────────────────────────────────────────────────────────

export async function fetchAds(): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []) as Ad[];
}

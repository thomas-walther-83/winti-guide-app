import { supabase } from '../config/supabase';
import type { PublicTour, PublicTourStop } from '../types';

/**
 * Öffentliche (redaktionelle) Touren (Tabellen public.public_tours +
 * public.public_tour_stops). Alle Lese-Operationen sind ohne Login
 * möglich (RLS: published = true). Schreib-Operationen sind via RLS
 * auf Admin-Mails beschränkt (Postgres `public.is_admin()`); das
 * Frontend gated zusätzlich via `useIsAdmin()`.
 */

interface RawStop {
  id?: string;
  tour_id?: string;
  position: number;
  lat: number;
  lon: number;
  name: string;
  listing_id?: string | null;
}

interface RawTour {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  emoji?: string | null;
  sort_order?: number | null;
  published?: boolean | null;
  created_at?: string;
  updated_at?: string;
  public_tour_stops?: RawStop[];
}

function mapTour(row: RawTour): PublicTour {
  const stops = (row.public_tour_stops ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      id: s.id,
      tour_id: s.tour_id,
      position: s.position,
      lat: s.lat,
      lon: s.lon,
      name: s.name,
      listing_id: s.listing_id ?? null,
    }));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    emoji: row.emoji ?? '',
    sort_order: row.sort_order ?? 0,
    published: row.published ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
    stops,
  };
}

/** Lädt alle (für den Nutzer sichtbaren) öffentlichen Touren mit Stops. */
export async function fetchPublicTours(opts?: { includeUnpublished?: boolean }): Promise<PublicTour[]> {
  let query = supabase
    .from('public_tours')
    .select('id, slug, name, description, emoji, sort_order, published, created_at, updated_at, public_tour_stops(id, tour_id, position, lat, lon, name, listing_id)')
    .order('sort_order', { ascending: true });
  if (!opts?.includeUnpublished) {
    query = query.eq('published', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => mapTour(r as RawTour));
}

/** Legt eine neue Tour an (Admin). */
export async function createPublicTour(input: {
  slug: string;
  name: string;
  description?: string;
  emoji?: string;
  sort_order?: number;
  published?: boolean;
}): Promise<PublicTour> {
  const { data, error } = await supabase
    .from('public_tours')
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description ?? '',
      emoji: input.emoji ?? '',
      sort_order: input.sort_order ?? 0,
      published: input.published ?? true,
    })
    .select('id, slug, name, description, emoji, sort_order, published, created_at, updated_at')
    .single();
  if (error) throw error;
  return mapTour({ ...(data as RawTour), public_tour_stops: [] });
}

/** Ändert Felder einer Tour (Admin). */
export async function updatePublicTour(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    emoji: string;
    sort_order: number;
    published: boolean;
    slug: string;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('public_tours')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Löscht eine Tour samt Stops (Admin). Stops kaskadieren via FK. */
export async function deletePublicTour(id: string): Promise<void> {
  const { error } = await supabase.from('public_tours').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Ersetzt alle Stops einer Tour atomar über die Postgres-Funktion
 * `replace_public_tour_stops` (delete + insert in EINER Transaktion —
 * ein fehlgeschlagener Insert kann die alten Stops nicht mehr löschen).
 * RLS gilt unverändert (SECURITY INVOKER, Admin-only-Policies).
 */
export async function replacePublicTourStops(tourId: string, stops: PublicTourStop[]): Promise<void> {
  const payload = stops.map((s, idx) => ({
    position: s.position ?? idx + 1,
    lat: s.lat,
    lon: s.lon,
    name: s.name,
    listing_id: s.listing_id ?? null,
  }));
  const { error } = await supabase.rpc('replace_public_tour_stops', {
    p_tour_id: tourId,
    p_stops: payload,
  });
  if (error) throw error;
}

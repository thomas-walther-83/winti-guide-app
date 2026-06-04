import { supabase } from '../config/supabase';
import type { UserTour, TourStop, TourRouteWaypoint } from '../types';

/**
 * Eigene Touren (Tabellen public.user_tours + public.tour_stops mit RLS).
 * Erfordert eine eingeloggte Nutzer:in (RLS filtert auf auth.uid()).
 */

/** Lädt die Touren der eingeloggten Nutzer:in inkl. Stop-Anzahl. */
export async function fetchUserTours(): Promise<UserTour[]> {
  const { data, error } = await supabase
    .from('user_tours')
    .select('id, user_id, name, description, created_at, updated_at, route_waypoints, tour_stops(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    user_id: t.user_id as string,
    name: t.name as string,
    description: (t.description as string) ?? '',
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    route_waypoints: (t.route_waypoints as TourRouteWaypoint[] | null) ?? null,
    stopCount: Array.isArray(t.tour_stops) ? (t.tour_stops[0]?.count ?? 0) : 0,
  }));
}

/** Legt eine neue Tour an und gibt sie zurück. */
export async function createTour(userId: string, name: string): Promise<UserTour> {
  const { data, error } = await supabase
    .from('user_tours')
    .insert({ user_id: userId, name })
    .select('id, user_id, name, description, created_at, updated_at')
    .single();
  if (error) throw error;
  return { ...(data as UserTour), stopCount: 0 };
}

export async function renameTour(tourId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('user_tours')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', tourId);
  if (error) throw error;
}

export async function deleteTour(tourId: string): Promise<void> {
  const { error } = await supabase.from('user_tours').delete().eq('id', tourId);
  if (error) throw error;
}

/** Lädt die Stops einer Tour (geordnet) inkl. verknüpfter Orte. */
export async function fetchTourStops(tourId: string): Promise<TourStop[]> {
  const { data, error } = await supabase
    .from('tour_stops')
    .select(
      'id, tour_id, listing_id, position, note, ' +
        'listing:listings(id, name, category, sub_type, address, lat, lon, geometry, website, phone, hours, description, image_url)',
    )
    .eq('tour_id', tourId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TourStop[];
}

/** Speichert die manuell angepasste Route (Stops + Zwischenpunkte). */
export async function updateTourRoute(
  tourId: string,
  waypoints: TourRouteWaypoint[],
): Promise<void> {
  await supabase.from('user_tours').update({ route_waypoints: waypoints }).eq('id', tourId);
}

/** Verwirft eine gespeicherte Route (z. B. wenn sich die Stops ändern). */
async function clearTourRoute(tourId: string): Promise<void> {
  await supabase.from('user_tours').update({ route_waypoints: null }).eq('id', tourId);
}

/** Hängt einen Ort als nächsten Stop an die Tour an. */
export async function addStop(tourId: string, listingId: string): Promise<void> {
  // Nächste Position bestimmen (max + 1).
  const { data } = await supabase
    .from('tour_stops')
    .select('position')
    .eq('tour_id', tourId)
    .order('position', { ascending: false })
    .limit(1);
  const nextPos = (data && data.length > 0 ? (data[0].position as number) : -1) + 1;
  const { error } = await supabase
    .from('tour_stops')
    .insert({ tour_id: tourId, listing_id: listingId, position: nextPos });
  if (error) throw error;
  await clearTourRoute(tourId);
}

export async function removeStop(stopId: string): Promise<void> {
  const { data, error } = await supabase
    .from('tour_stops')
    .delete()
    .eq('id', stopId)
    .select('tour_id')
    .single();
  if (error) throw error;
  if (data?.tour_id) await clearTourRoute(data.tour_id as string);
}

export async function updateStopNote(stopId: string, note: string): Promise<void> {
  const { error } = await supabase.from('tour_stops').update({ note }).eq('id', stopId);
  if (error) throw error;
}

/** Schreibt die neue Reihenfolge (Stop-IDs in Zielreihenfolge) zurück. */
export async function reorderStops(tourId: string, orderedStopIds: string[]): Promise<void> {
  await Promise.all(
    orderedStopIds.map((id, idx) =>
      supabase.from('tour_stops').update({ position: idx }).eq('id', id),
    ),
  );
  await clearTourRoute(tourId);
}

/** Anzahl Stops einer Tour (für Limit-Prüfung). */
export async function countStops(tourId: string): Promise<number> {
  const { count, error } = await supabase
    .from('tour_stops')
    .select('id', { count: 'exact', head: true })
    .eq('tour_id', tourId);
  if (error) throw error;
  return count ?? 0;
}

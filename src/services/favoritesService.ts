import { supabase } from '../config/supabase';

/**
 * Cloud-Favoriten (Tabelle public.favorites mit RLS auf user_id).
 * Alle Funktionen sind defensiv: bei fehlender Tabelle/Netzwerkfehler wird
 * leer bzw. still zurückgekehrt, damit die lokale Speicherung weiterläuft.
 */

export async function fetchFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('listing_id');
  if (error || !data) return [];
  return data.map((row: { listing_id: string }) => row.listing_id);
}

export async function addFavoriteRemote(userId: string, listingId: string): Promise<void> {
  await supabase
    .from('favorites')
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: 'user_id,listing_id' });
}

export async function removeFavoriteRemote(userId: string, listingId: string): Promise<void> {
  await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId);
}

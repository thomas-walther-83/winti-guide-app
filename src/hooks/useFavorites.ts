import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import {
  fetchFavoriteIds,
  addFavoriteRemote,
  removeFavoriteRemote,
} from '../services/favoritesService';
import type { Listing } from '../types';

export const SAVED_KEY = 'winti_saved_listings';

async function loadLocal(): Promise<string[]> {
  try {
    const val = await AsyncStorage.getItem(SAVED_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

async function saveLocal(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * Favoriten-Verwaltung: offline-first über AsyncStorage, plus Cloud-Sync via
 * Supabase, sobald ein:e Nutzer:in eingeloggt ist. Beim Login werden lokale und
 * Cloud-Favoriten zusammengeführt (Union) und nur-lokale in die Cloud gepusht.
 */
export function useFavorites() {
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const local = await loadLocal();
      if (!user) {
        if (active) setSavedIds(local);
        return;
      }
      let remote: string[] = [];
      try {
        remote = await fetchFavoriteIds();
      } catch {
        // Cloud nicht verfügbar → nur lokal
      }
      const merged = Array.from(new Set([...local, ...remote]));
      if (active) setSavedIds(merged);
      await saveLocal(merged);
      // Nur-lokale Favoriten in die Cloud nachziehen
      for (const id of local.filter((x) => !remote.includes(x))) {
        addFavoriteRemote(user.id, id).catch(() => undefined);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    (listing: Listing) => {
      const id = listing.id;
      setSavedIds((prev) => {
        const isRemoving = prev.includes(id);
        const next = isRemoving ? prev.filter((x) => x !== id) : [...prev, id];
        saveLocal(next);
        if (user) {
          (isRemoving
            ? removeFavoriteRemote(user.id, id)
            : addFavoriteRemote(user.id, id)
          ).catch(() => undefined);
        }
        return next;
      });
    },
    [user],
  );

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  return { savedIds, toggle, isSaved };
}

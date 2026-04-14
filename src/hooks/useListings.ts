import { useState, useEffect, useCallback } from 'react';
import { fetchListings } from '../services/supabaseService';
import type { Listing, ListingCategory } from '../types';

interface UseListingsOptions {
  category?: ListingCategory;
  search?: string;
}

interface UseListingsResult {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useListings(options: UseListingsOptions = {}): UseListingsResult {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings(options);
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Einträge');
    } finally {
      setLoading(false);
    }
  }, [options.category, options.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { listings, loading, error, refresh: load };
}

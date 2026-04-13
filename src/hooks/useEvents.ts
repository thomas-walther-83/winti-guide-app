import { useState, useEffect, useCallback } from 'react';
import { fetchEvents } from '../services/supabaseService';
import type { Event, EventCategory } from '../types';

interface UseEventsOptions {
  category?: EventCategory;
  from?: string;
}

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEvents(options: UseEventsOptions = {}): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents(options);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Events');
    } finally {
      setLoading(false);
    }
  }, [options.category, options.from]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { events, loading, error, refresh: load };
}

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface IsAdminState {
  isAdmin: boolean;
  /** True solange die RPC-Antwort aussteht (UI: Spinner statt „kein Zugriff"). */
  loading: boolean;
}

/**
 * Fragt den Admin-Status über die Postgres-Funktion `is_admin()` ab —
 * die Allowlist lebt damit NUR in der Datenbank (eine Quelle statt
 * SQL + TypeScript doppelt). Die RLS-Policies nutzen dieselbe Funktion,
 * Client und Server können also nicht auseinanderlaufen.
 */
export function useIsAdmin(): IsAdminState {
  const { user } = useAuth();
  const [state, setState] = useState<IsAdminState>({ isAdmin: false, loading: false });

  useEffect(() => {
    if (!user) {
      setState({ isAdmin: false, loading: false });
      return;
    }
    let active = true;
    setState({ isAdmin: false, loading: true });
    supabase
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!active) return;
        setState({ isAdmin: !error && data === true, loading: false });
      });
    return () => {
      active = false;
    };
  }, [user]);

  return state;
}

import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import type { AppTier } from '../types';

interface UseAppTierResult {
  tier: AppTier;
  isPremium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAppTier(): UseAppTierResult {
  const { user } = useAuth();
  const [tier, setTier] = useState<AppTier>('free');
  const [loading, setLoading] = useState(true);

  const fetchTier = async () => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('tier, expires_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setTier('free');
        return;
      }

      // Check if premium has expired
      if (data.tier === 'premium' && data.expires_at) {
        const expired = new Date(data.expires_at) < new Date();
        setTier(expired ? 'free' : 'premium');
      } else {
        setTier((data.tier as AppTier) ?? 'free');
      }
    } catch (err) {
      console.error('useAppTier error:', err);
      setTier('free');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTier();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    tier,
    isPremium: tier === 'premium',
    loading,
    refresh: fetchTier,
  };
}

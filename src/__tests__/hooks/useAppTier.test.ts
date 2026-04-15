import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAppTier } from '../../hooks/useAppTier';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

const mockFrom = supabase.from as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

function makeQueryBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  ['select', 'eq', 'order'].forEach((m) => {
    builder[m] = jest.fn().mockReturnValue(builder);
  });
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAppTier', () => {
  describe('when no user is logged in', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null });
    });

    it('sets tier to "free"', async () => {
      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.isPremium).toBe(false);
    });

    it('does not call supabase.from', async () => {
      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('when user is logged in with free tier', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    });

    it('sets tier to "free" when app_user has free tier', async () => {
      mockFrom.mockReturnValue(makeQueryBuilder({ data: { tier: 'free', expires_at: null }, error: null }));

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.isPremium).toBe(false);
    });

    it('sets tier to "free" when no app_user row found', async () => {
      mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error: null }));

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
    });
  });

  describe('when user is logged in with premium tier', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-premium' } });
    });

    it('sets tier to "premium" when valid premium subscription exists', async () => {
      const futureDate = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
      mockFrom.mockReturnValue(
        makeQueryBuilder({ data: { tier: 'premium', expires_at: futureDate }, error: null }),
      );

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('premium');
      expect(result.current.isPremium).toBe(true);
    });

    it('sets tier to "free" when premium has expired', async () => {
      const pastDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      mockFrom.mockReturnValue(
        makeQueryBuilder({ data: { tier: 'premium', expires_at: pastDate }, error: null }),
      );

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('free');
      expect(result.current.isPremium).toBe(false);
    });

    it('sets tier to "premium" when premium has no expiry date', async () => {
      mockFrom.mockReturnValue(
        makeQueryBuilder({ data: { tier: 'premium', expires_at: null }, error: null }),
      );

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tier).toBe('premium');
      expect(result.current.isPremium).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    });

    it('falls back to "free" tier on DB error', async () => {
      const error = new Error('Database connection failed');
      mockFrom.mockReturnValue(makeQueryBuilder({ data: null, error }));

      // Suppress the expected console.error from the hook's error handler
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      consoleSpy.mockRestore();

      expect(result.current.tier).toBe('free');
      expect(result.current.isPremium).toBe(false);
    });
  });

  describe('isPremium computed value', () => {
    it('isPremium is true only when tier is "premium"', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
      const futureDate = new Date(Date.now() + TEN_DAYS_MS).toISOString();
      mockFrom.mockReturnValue(
        makeQueryBuilder({ data: { tier: 'premium', expires_at: futureDate }, error: null }),
      );

      const { result } = renderHook(() => useAppTier());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isPremium).toBe(result.current.tier === 'premium');
    });
  });
});

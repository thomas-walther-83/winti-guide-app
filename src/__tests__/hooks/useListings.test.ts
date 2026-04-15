import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useListings } from '../../hooks/useListings';

jest.mock('../../services/supabaseService');

import { fetchListings } from '../../services/supabaseService';
const mockFetchListings = fetchListings as jest.Mock;

const SAMPLE_LISTINGS = [
  { id: '1', name: 'Restaurant Zum See', category: 'restaurants', is_active: true },
  { id: '2', name: 'Café Central', category: 'cafes', is_active: true },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useListings', () => {
  it('starts in loading state', () => {
    mockFetchListings.mockResolvedValue([]);
    const { result } = renderHook(() => useListings());
    expect(result.current.loading).toBe(true);
  });

  it('loads listings on mount', async () => {
    mockFetchListings.mockResolvedValue(SAMPLE_LISTINGS);

    const { result } = renderHook(() => useListings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.listings).toEqual(SAMPLE_LISTINGS);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails', async () => {
    mockFetchListings.mockRejectedValue(new Error('Netzwerkfehler'));

    const { result } = renderHook(() => useListings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Netzwerkfehler');
    expect(result.current.listings).toEqual([]);
  });

  it('sets generic error message for non-Error rejections', async () => {
    mockFetchListings.mockRejectedValue('some string error');

    const { result } = renderHook(() => useListings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fehler beim Laden der Einträge');
  });

  it('passes category option to fetchListings', async () => {
    mockFetchListings.mockResolvedValue([]);

    renderHook(() => useListings({ category: 'restaurants' }));

    await waitFor(() => {
      expect(mockFetchListings).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'restaurants' }),
      );
    });
  });

  it('passes search option to fetchListings', async () => {
    mockFetchListings.mockResolvedValue([]);

    renderHook(() => useListings({ search: 'pizza' }));

    await waitFor(() => {
      expect(mockFetchListings).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'pizza' }),
      );
    });
  });

  it('refresh triggers a new fetch', async () => {
    mockFetchListings.mockResolvedValue(SAMPLE_LISTINGS);

    const { result } = renderHook(() => useListings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchListings).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetchListings).toHaveBeenCalledTimes(2);
    });
  });

  it('clears previous error on refresh', async () => {
    mockFetchListings.mockRejectedValueOnce(new Error('first error'));
    mockFetchListings.mockResolvedValueOnce(SAMPLE_LISTINGS);

    const { result } = renderHook(() => useListings());

    await waitFor(() => {
      expect(result.current.error).toBe('first error');
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.listings).toEqual(SAMPLE_LISTINGS);
    });
  });

  it('returns empty listings array initially', () => {
    mockFetchListings.mockResolvedValue([]);
    const { result } = renderHook(() => useListings());
    expect(result.current.listings).toEqual([]);
  });
});

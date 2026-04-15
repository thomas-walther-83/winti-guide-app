import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEvents } from '../../hooks/useEvents';

jest.mock('../../services/supabaseService');

import { fetchEvents } from '../../services/supabaseService';
const mockFetchEvents = fetchEvents as jest.Mock;

const SAMPLE_EVENTS = [
  {
    id: 'e-1',
    title: 'Stadtfest Winterthur',
    cat: 'festival',
    event_date: '2025-07-15',
    is_active: true,
  },
  {
    id: 'e-2',
    title: 'Jazz Night',
    cat: 'musik',
    event_date: '2025-08-01',
    is_active: true,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useEvents', () => {
  it('starts in loading state', () => {
    mockFetchEvents.mockResolvedValue([]);
    const { result } = renderHook(() => useEvents());
    expect(result.current.loading).toBe(true);
  });

  it('loads events on mount', async () => {
    mockFetchEvents.mockResolvedValue(SAMPLE_EVENTS);

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.events).toEqual(SAMPLE_EVENTS);
    expect(result.current.error).toBeNull();
  });

  it('sets error when fetch fails with Error instance', async () => {
    mockFetchEvents.mockRejectedValue(new Error('Verbindungsfehler'));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Verbindungsfehler');
    expect(result.current.events).toEqual([]);
  });

  it('sets generic error message for non-Error rejections', async () => {
    mockFetchEvents.mockRejectedValue({ code: 500 });

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fehler beim Laden der Events');
  });

  it('passes category option to fetchEvents', async () => {
    mockFetchEvents.mockResolvedValue([]);

    renderHook(() => useEvents({ category: 'musik' }));

    await waitFor(() => {
      expect(mockFetchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'musik' }),
      );
    });
  });

  it('passes from date option to fetchEvents', async () => {
    mockFetchEvents.mockResolvedValue([]);

    renderHook(() => useEvents({ from: '2025-06-01' }));

    await waitFor(() => {
      expect(mockFetchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ from: '2025-06-01' }),
      );
    });
  });

  it('refresh triggers a new fetch', async () => {
    mockFetchEvents.mockResolvedValue(SAMPLE_EVENTS);

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetchEvents).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetchEvents).toHaveBeenCalledTimes(2);
    });
  });

  it('refresh clears previous error on successful retry', async () => {
    mockFetchEvents.mockRejectedValueOnce(new Error('timeout'));
    mockFetchEvents.mockResolvedValueOnce(SAMPLE_EVENTS);

    const { result } = renderHook(() => useEvents());

    await waitFor(() => {
      expect(result.current.error).toBe('timeout');
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.events).toEqual(SAMPLE_EVENTS);
    });
  });

  it('returns empty events array initially', () => {
    mockFetchEvents.mockResolvedValue([]);
    const { result } = renderHook(() => useEvents());
    expect(result.current.events).toEqual([]);
  });
});

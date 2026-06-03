import { useCallback, useState } from 'react';
import type { LatLon } from '../utils/distance';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable';

interface UseLocationResult {
  coords: LatLon | null;
  status: LocationStatus;
  request: () => void;
}

/**
 * Standortabfrage über die Browser-Geolocation-API (navigator.geolocation).
 * Funktioniert auf dem Web-Target (GitHub Pages) und in Browsern. Auf nativen
 * Plattformen ohne navigator.geolocation bleibt der Status 'unavailable' – dort
 * könnte später expo-location ergänzt werden.
 */
export function useLocation(): UseLocationResult {
  const [coords, setCoords] = useState<LatLon | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(() => {
    const geo =
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    geo.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('granted');
      },
      () => {
        setStatus('denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { coords, status, request };
}

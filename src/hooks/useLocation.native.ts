import { useCallback, useState } from 'react';
import type { LatLon } from '../utils/distance';
import type { LocationStatus } from './useLocation';

interface UseLocationResult {
  coords: LatLon | null;
  status: LocationStatus;
  request: () => void;
}

/**
 * Native Standortabfrage (iOS/Android) über expo-location.
 *
 * Diese Datei wird NUR in nativen Builds gebündelt (Metro wählt `.native.ts`
 * für iOS/Android). Der Web-Build verwendet weiterhin `useLocation.ts` mit
 * navigator.geolocation. expo-location wird per require geladen, damit das
 * Modul nicht zwingend installiert sein muss, solange nur Web gebaut wird –
 * für echte native Builds bitte einmalig `npx expo install expo-location`
 * ausführen (ergänzt Paket + Lockfile + Berechtigungen).
 */
let ExpoLocation: any = null;
try {
  // @ts-ignore – nur in nativen Builds installiert (npx expo install expo-location)
  ExpoLocation = require('expo-location');
} catch {
  ExpoLocation = null;
}

export function useLocation(): UseLocationResult {
  const [coords, setCoords] = useState<LatLon | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(() => {
    if (!ExpoLocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    (async () => {
      try {
        const { status: perm } =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (perm !== 'granted') {
          setStatus('denied');
          return;
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy?.Balanced ?? 3,
        });
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('granted');
      } catch {
        setStatus('denied');
      }
    })();
  }, []);

  return { coords, status, request };
}

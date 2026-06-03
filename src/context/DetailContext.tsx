import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Listing, Event } from '../types';

/**
 * Detail-Overlay-State. Damit kann jede Karte ein Detail öffnen, ohne dass
 * Callbacks durch die gesamte (switch-basierte) Navigation gereicht werden
 * müssen. Die Karte übergibt ihre eigenen Save-/Map-Handler mit, sodass das
 * Detail dieselbe Logik wiederverwendet.
 */
export type DetailPayload =
  | {
      kind: 'listing';
      listing: Listing;
      isSaved?: boolean;
      onToggleSave?: (listing: Listing) => void;
      onShowOnMap?: (listing: Listing) => void;
    }
  | { kind: 'event'; event: Event };

interface DetailContextValue {
  payload: DetailPayload | null;
  open: (payload: DetailPayload) => void;
  close: () => void;
}

const DetailContext = createContext<DetailContextValue | undefined>(undefined);

export function DetailProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);

  const open = useCallback((next: DetailPayload) => setPayload(next), []);
  const close = useCallback(() => setPayload(null), []);

  return (
    <DetailContext.Provider value={{ payload, open, close }}>
      {children}
    </DetailContext.Provider>
  );
}

/**
 * Liefert das Detail-Overlay-API. Ausserhalb des Providers (z. B. in Tests
 * ohne Provider) wird ein No-op zurückgegeben, damit Komponenten nicht crashen.
 */
export function useDetail(): DetailContextValue {
  const ctx = useContext(DetailContext);
  if (!ctx) {
    return { payload: null, open: () => undefined, close: () => undefined };
  }
  return ctx;
}

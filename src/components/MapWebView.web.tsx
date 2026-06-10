import React, { useEffect, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  html: string;
  loading?: boolean;
  onError?: (e: { nativeEvent: { description: string } }) => void;
  /** Wird mit der Listing-ID aufgerufen, wenn ein Popup angetippt wird. */
  onSelectListing?: (id: string) => void;
  /** Wird mit den aktuellen Tour-Wegpunkten aufgerufen, wenn die Route geändert wird. */
  onTourRouteChange?: (waypoints: { lat: number; lon: number; stop: boolean }[]) => void;
  /** Generischer Empfänger für beliebige postMessage-Strings aus dem WebView/iframe. */
  onAnyMessage?: (raw: string) => void;
}

export function MapWebView({ html, onSelectListing, onTourRouteChange, onAnyMessage }: Props) {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Das Leaflet-iframe sendet Popup-Taps / Route-Änderungen via postMessage hierher.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      // Nur Messages aus UNSEREM iframe akzeptieren — window.message empfängt
      // sonst Nachrichten beliebiger Fenster/Frames (z. B. Browser-Extensions),
      // die hier Aktionen wie Routen-Speichern auslösen könnten.
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const raw = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
      onAnyMessage?.(raw);
      try {
        const m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (m && m.type === 'detail' && m.id) onSelectListing?.(String(m.id));
        else if (m && m.type === 'route' && Array.isArray(m.waypoints)) onTourRouteChange?.(m.waypoints);
      } catch {
        // andere Nachrichten ignorieren
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelectListing, onTourRouteChange, onAnyMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      style={{
        flex: 1,
        border: 'none',
        width: '100%',
        height: '100%',
      }}
      title={t('map')}
      // allow-popups erlaubt externe Links (z. B. Google Maps) im neuen Tab.
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}

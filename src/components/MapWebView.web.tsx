import React, { useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  html: string;
  loading?: boolean;
  onError?: (e: { nativeEvent: { description: string } }) => void;
  /** Wird mit der Listing-ID aufgerufen, wenn ein Popup angetippt wird. */
  onSelectListing?: (id: string) => void;
}

export function MapWebView({ html, onSelectListing }: Props) {
  const { t } = useTranslation();

  // Das Leaflet-iframe sendet Popup-Taps via window.parent.postMessage hierher.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      try {
        const m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (m && m.type === 'detail' && m.id) onSelectListing?.(String(m.id));
      } catch {
        // andere Nachrichten ignorieren
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onSelectListing]);

  return (
    <iframe
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

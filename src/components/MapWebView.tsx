import React from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Linking } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { theme } from '../styles/theme';

interface Props {
  html: string;
  loading?: boolean;
  onError?: WebViewProps['onError'];
  /** Wird mit der Listing-ID aufgerufen, wenn ein Popup angetippt wird. */
  onSelectListing?: (id: string) => void;
  /** Wird mit den aktuellen Tour-Wegpunkten aufgerufen, wenn die Route geändert wird. */
  onTourRouteChange?: (waypoints: { lat: number; lon: number; stop: boolean }[]) => void;
}

export function MapWebView({ html, loading, onError, onSelectListing, onTourRouteChange }: Props) {
  return (
    <WebView
      style={styles.webview}
      source={{ html }}
      javaScriptEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      allowUniversalAccessFromFileURLs
      domStorageEnabled
      startInLoadingState={loading}
      renderLoading={() => (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      onError={onError}
      // Popup-Tap → {type:'detail', id} aus der Karte; öffnet nativ den Detail-Dialog.
      onMessage={(e) => {
        const raw = e.nativeEvent.data;
        try {
          const msg = JSON.parse(raw);
          if (msg && msg.type === 'detail' && msg.id) {
            onSelectListing?.(String(msg.id));
            return;
          }
          if (msg && msg.type === 'route' && Array.isArray(msg.waypoints)) {
            onTourRouteChange?.(msg.waypoints);
            return;
          }
        } catch {
          // Kein JSON → evtl. eine URL: extern öffnen.
          if (/^https?:/.test(raw)) Linking.openURL(raw).catch(() => undefined);
        }
      }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
      nestedScrollEnabled={Platform.OS === 'android'}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

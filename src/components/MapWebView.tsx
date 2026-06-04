import React from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Linking } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { theme } from '../styles/theme';

interface Props {
  html: string;
  loading?: boolean;
  onError?: WebViewProps['onError'];
}

export function MapWebView({ html, loading, onError }: Props) {
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
      // Popup-Link schickt die URL per RN-Bridge → hier extern öffnen.
      onMessage={(e) => {
        const url = e.nativeEvent.data;
        if (/^https?:/.test(url)) Linking.openURL(url).catch(() => undefined);
      }}
      // Fallback: falls doch eine Navigation zu Google Maps ausgelöst wird,
      // extern öffnen statt die Karte zu ersetzen. Andere Requests normal laden.
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(req) => {
        if (/google\.[^/]+\/maps/.test(req.url)) {
          Linking.openURL(req.url).catch(() => undefined);
          return false;
        }
        return true;
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

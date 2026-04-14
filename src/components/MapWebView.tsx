import React from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
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

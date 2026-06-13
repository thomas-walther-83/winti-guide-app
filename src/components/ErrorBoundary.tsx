import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Optional: was anstelle der Children rendern, wenn ein Fehler auftritt. */
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Fängt Render-Fehler eines Subtree ab, damit die ganze App nicht zerfällt.
 * Insbesondere wichtig für Komponenten wie AiGuideCard, wo unerwarteter
 * LLM-Output oder Platform-spezifische Layout-Bugs sonst die gesamte
 * WebView neustarten könnten.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Mindestens in der Console hinterlegen, damit Web Inspector etwas zeigt.
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>
            {this.props.fallbackLabel ?? 'Hier ist gerade etwas schiefgelaufen.'}
          </Text>
          {this.state.error?.message ? (
            <Text style={styles.detail}>{this.state.error.message}</Text>
          ) : null}
          <TouchableOpacity onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    padding: 16,
    margin: 12,
    backgroundColor: '#FFF4E5',
    borderColor: '#F5B642',
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  title: { fontWeight: '700', color: '#7A4A00' },
  detail: { fontSize: 12, color: '#7A4A00' },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5B642',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonText: { color: '#3A2400', fontWeight: '700' },
});

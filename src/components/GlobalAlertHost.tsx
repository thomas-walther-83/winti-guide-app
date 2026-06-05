import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { alertBus, type AlertButton, type AlertRequest } from '../utils/alertBus';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';

/**
 * Globaler Modal-Host für den Web-Alert-Shim. Wird einmal am App-Root
 * gemountet (siehe App.tsx). Auf Native wird er nie aufgerufen, weil der
 * Native-`Alert` direkt das System-Dialog nutzt.
 */
export function GlobalAlertHost() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [current, setCurrent] = useState<AlertRequest | null>(null);

  useEffect(() => {
    alertBus.setListener((req) => setCurrent(req));
    return () => alertBus.setListener(null);
  }, []);

  if (!current) return null;

  const handle = async (btn: AlertButton) => {
    setCurrent(null);
    try {
      await btn.onPress?.();
    } catch {
      // Aufruferseite ist für Error-Handling zuständig.
    }
  };

  const buttons = current.buttons.length === 0 ? [{ text: 'OK' }] : current.buttons;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => setCurrent(null)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{current.title}</Text>
          {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
          <View style={styles.btnRow}>
            {buttons.map((b, i) => {
              const isDestructive = b.style === 'destructive';
              const isCancel = b.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.btn, isDestructive && styles.btnDestructive, isCancel && styles.btnCancel]}
                  onPress={() => handle(b)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.btnText,
                      isDestructive && styles.btnTextDestructive,
                      isCancel && styles.btnTextCancel,
                    ]}
                  >
                    {b.text ?? 'OK'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadow.medium,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 6,
    },
    message: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      justifyContent: 'flex-end',
    },
    btn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      minWidth: 80,
      alignItems: 'center',
    },
    btnDestructive: { backgroundColor: '#C0392B' },
    btnCancel: { backgroundColor: theme.colors.surfaceAlt },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    btnTextDestructive: { color: '#fff' },
    btnTextCancel: { color: theme.colors.text },
  });

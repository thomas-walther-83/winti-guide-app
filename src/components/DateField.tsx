import React, { useMemo } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';

export interface DateFieldProps {
  /** ISO-Datum YYYY-MM-DD oder leer. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Datums-Eingabe, Native-Variante: Textfeld im Format YYYY-MM-DD.
 * (Auf Web kommt `.web.tsx` mit dem nativen Browser-Date-Picker zum Zug;
 * für iOS/Android verzichten wir bewusst auf eine zusätzliche
 * Picker-Dependency, solange der Admin-Bereich primär auf Web läuft.)
 */
export function DateField({ value, onChange, placeholder }: DateFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? 'YYYY-MM-DD'}
      placeholderTextColor={theme.colors.textMuted}
      autoCapitalize="none"
      keyboardType="numbers-and-punctuation"
      maxLength={10}
    />
  );
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    input: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      fontSize: 15,
    },
  });

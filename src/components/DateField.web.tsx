import React from 'react';
import { useTheme } from '../context/ThemeContext';
import type { DateFieldProps } from './DateField';

/**
 * Datums-Eingabe, Web-Variante: nativer Browser-Date-Picker
 * (input type="date") — Kalender-UI gratis, Wert immer valides
 * ISO-Format YYYY-MM-DD oder leer.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const theme = useTheme();
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        padding: '10px 12px',
        borderRadius: 8,
        fontSize: 15,
        border: `1px solid ${theme.colors.border}`,
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
        colorScheme: 'light dark',
      }}
    />
  );
}

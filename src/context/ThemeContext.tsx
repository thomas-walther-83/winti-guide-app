import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, type AppTheme } from '../styles/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'winti_theme_mode';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode; // Nutzer-Einstellung
  scheme: 'light' | 'dark'; // tatsächlich aktiv
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  mode: 'system',
  scheme: 'light',
  setMode: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setModeState(v);
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => undefined);
  };

  const scheme: 'light' | 'dark' = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, scheme, setMode }),
    [theme, mode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Aktives Theme (Hell/Dunkel) – gleiche Form wie der statische `theme`-Export. */
export function useTheme(): AppTheme {
  return useContext(ThemeContext).theme;
}

/** Modus-Einstellung + aktives Schema (für StatusBar und Umschalter). */
export function useThemeMode() {
  const { mode, scheme, setMode } = useContext(ThemeContext);
  return { mode, scheme, setMode };
}

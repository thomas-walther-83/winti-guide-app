// Geteilte (modus-unabhängige) Tokens.
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const borderRadius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
};

const typography = {
  title: {
    fontSize: 28,
    fontFamily: 'Fraunces_700Bold',
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Fraunces_600SemiBold',
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
};

// ── Hell (warmes „Papier“, Rot als Akzent) ───────────────────────────────────
const lightColors = {
  primary: '#CC0000',
  primaryLight: '#E23B3B',
  primaryDark: '#9E0000',
  primarySoft: '#F6E7E6',
  secondary: '#27323A',
  background: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F1ECE4',
  text: '#1C1A17',
  textSecondary: '#5F594F',
  textMuted: '#8E867A',
  border: '#EBE6DD',
  error: '#DC2626',
  success: '#16A34A',
  premium: '#B8860B',
  saved: '#CC0000',
  tabBar: '#FFFFFF',
  tabBarActive: '#CC0000',
  tabBarInactive: '#8E867A',
  searchBackground: '#F1ECE4',
  heroBannerOverlay: 'rgba(18,14,10,0.40)',
};

// ── Dunkel (warmes Anthrazit, hellerer Rot-Akzent) ───────────────────────────
const darkColors: typeof lightColors = {
  primary: '#FF5A5A',
  primaryLight: '#FF7A7A',
  primaryDark: '#E23B3B',
  primarySoft: '#3A2422',
  secondary: '#9FB3C8',
  background: '#141210',
  surface: '#1F1C19',
  surfaceAlt: '#2A2622',
  text: '#F3EFE9',
  textSecondary: '#C4BCAF',
  textMuted: '#9A9182',
  border: '#332E28',
  error: '#F87171',
  success: '#34D399',
  premium: '#E0B341',
  saved: '#FF5A5A',
  tabBar: '#1A1714',
  tabBarActive: '#FF6B6B',
  tabBarInactive: '#9A9182',
  searchBackground: '#2A2622',
  heroBannerOverlay: 'rgba(0,0,0,0.55)',
};

const lightShadow = {
  small: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2A2118',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
  },
};

const darkShadow = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 5,
  },
};

export const lightTheme = {
  colors: lightColors,
  spacing,
  borderRadius,
  fonts,
  typography,
  shadow: lightShadow,
} as const;

export const darkTheme = {
  colors: darkColors,
  spacing,
  borderRadius,
  fonts,
  typography,
  shadow: darkShadow,
} as const;

export type AppTheme = typeof lightTheme;

// Rückwärtskompatibler statischer Export (Hell-Theme). Migrierte Komponenten
// nutzen stattdessen useTheme() aus dem ThemeContext (Hell/Dunkel zur Laufzeit).
export const theme = lightTheme;

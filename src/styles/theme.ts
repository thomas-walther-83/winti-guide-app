export const theme = {
  colors: {
    // Rot bleibt die Marke – aber als gezielter Akzent, nicht als Grundton.
    primary: '#CC0000',
    primaryLight: '#E23B3B',
    primaryDark: '#9E0000',
    // Zarter Rot-Ton für Banner/Chips auf hellem Grund.
    primarySoft: '#F6E7E6',
    secondary: '#27323A',
    // Warme, neutrale „Papier“-Basis statt reinem Weiss; Karten liegen in Weiss darüber.
    background: '#FAF8F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F1ECE4',
    // Warme, WCAG-AA-konforme Textkontraste.
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
  },
  // Editorial-Display-Serif (Fraunces) für Titel; Fliesstext bleibt System-Sans.
  fonts: {
    display: 'Fraunces_600SemiBold',
    displayBold: 'Fraunces_700Bold',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  typography: {
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
  },
  shadow: {
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
  },
} as const;

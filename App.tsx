import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { DetailProvider } from './src/context/DetailContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { DetailModal } from './src/components/DetailModal';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { MapScreen } from './src/screens/MapScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { PartnerPortalScreen } from './src/screens/PartnerPortalScreen';
import { NavigationBar } from './src/components/NavigationBar';
import { useTranslation } from './src/hooks/useTranslation';
import { theme } from './src/styles/theme';
import type { Listing } from './src/types';

type TabKey = 'home' | 'calendar' | 'map' | 'saved' | 'account' | 'partner';

// Basis-Definition der Tabs; das Label wird zur Laufzeit übersetzt (i18n).
const TAB_DEFS = [
  { key: 'home',     emoji: '🏠', labelKey: 'home' },
  { key: 'calendar', emoji: '📅', labelKey: 'calendar' },
  { key: 'map',      emoji: '🗺️', labelKey: 'map' },
  { key: 'saved',    emoji: '❤️', labelKey: 'saved' },
  { key: 'account',  emoji: '👤', labelKey: 'account' },
] as const;

function AppContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [mapFocusListing, setMapFocusListing] = useState<Listing | null>(null);

  const navigateToAccount = () => setActiveTab('account');

  const navigateToMap = (listing: Listing) => {
    setMapFocusListing(listing);
    setActiveTab('map');
  };

  const handleTabPress = (key: string) => {
    // When the user manually taps the map tab, clear any stale focus from a
    // previous "jump to map" action. navigateToMap sets the focus immediately
    // after, so clearing here never removes an intentional focus.
    if (key === 'map') {
      setMapFocusListing(null);
    }
    setActiveTab(key as TabKey);
  };

  const tabs = TAB_DEFS.map((tab) => ({
    key: tab.key,
    emoji: tab.emoji,
    label: t(tab.labelKey),
  }));

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToAccount={navigateToAccount} onNavigateToMap={navigateToMap} />;
      case 'calendar':
        return <CalendarScreen onNavigateToAccount={navigateToAccount} />;
      case 'map':
        return <MapScreen focusListing={mapFocusListing} />;
      case 'saved':
        return <SavedScreen onNavigateToAccount={navigateToAccount} onNavigateToMap={navigateToMap} />;
      case 'account':
        return <AccountScreen />;
      case 'partner':
        return <PartnerPortalScreen />;
      default:
        return <HomeScreen onNavigateToAccount={navigateToAccount} onNavigateToMap={navigateToMap} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.screen}>{renderScreen()}</View>
      <NavigationBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DetailProvider>
          <SafeAreaProvider>
            <AppContent />
            <DetailModal />
          </SafeAreaProvider>
        </DetailProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
  },
});

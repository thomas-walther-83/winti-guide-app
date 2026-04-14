import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { MapScreen } from './src/screens/MapScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { PartnerPortalScreen } from './src/screens/PartnerPortalScreen';
import { NavigationBar } from './src/components/NavigationBar';
import { theme } from './src/styles/theme';

type TabKey = 'home' | 'calendar' | 'map' | 'saved' | 'account' | 'partner';

const TABS = [
  { key: 'home',     label: 'Entdecken', emoji: '🏠' },
  { key: 'calendar', label: 'Kalender',  emoji: '📅' },
  { key: 'map',      label: 'Karte',     emoji: '🗺️' },
  { key: 'saved',    label: 'Gespeichert', emoji: '❤️' },
  { key: 'account',  label: 'Konto',     emoji: '👤' },
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  const navigateToAccount = () => setActiveTab('account');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigateToAccount={navigateToAccount} />;
      case 'calendar':
        return <CalendarScreen onNavigateToAccount={navigateToAccount} />;
      case 'map':
        return <MapScreen />;
      case 'saved':
        return <SavedScreen onNavigateToAccount={navigateToAccount} />;
      case 'account':
        return <AccountScreen />;
      case 'partner':
        return <PartnerPortalScreen />;
      default:
        return <HomeScreen onNavigateToAccount={navigateToAccount} />;
    }
  };

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="dark" />
          <View style={styles.screen}>{renderScreen()}</View>
          <NavigationBar
            tabs={TABS as unknown as { key: string; label: string; emoji: string }[]}
            activeTab={activeTab}
            onTabPress={(key) => setActiveTab(key as TabKey)}
          />
        </View>
      </SafeAreaProvider>
    </AuthProvider>
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

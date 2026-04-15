import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  home: { active: 'compass', inactive: 'compass-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  map: { active: 'map', inactive: 'map-outline' },
  saved: { active: 'heart', inactive: 'heart-outline' },
};

interface Tab {
  key: string;
  label: string;
  emoji: string;
}

interface NavigationBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function NavigationBar({ tabs, activeTab, onTabPress }: NavigationBarProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const icons = TAB_ICONS[tab.key];
        const iconName: IoniconName = icons
          ? isActive
            ? icons.active
            : icons.inactive
          : 'ellipse-outline';
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {isActive && <View style={styles.indicator} />}
            <Ionicons
              name={iconName}
              size={24}
              color={isActive ? theme.colors.tabBarActive : theme.colors.tabBarInactive}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: 20,
    paddingTop: theme.spacing.sm,
    ...theme.shadow.small,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.tabBarInactive,
  },
  labelActive: {
    color: theme.colors.tabBarActive,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
});

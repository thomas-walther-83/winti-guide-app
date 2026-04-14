import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import type { ListingCategory } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface CategoryItem {
  key: ListingCategory | 'all';
  label: string;
  icon: IoniconName;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'all', label: 'Alle', icon: 'grid-outline' },
  { key: 'restaurants', label: 'Restaurants', icon: 'restaurant-outline' },
  { key: 'cafes', label: 'Cafés', icon: 'cafe-outline' },
  { key: 'bars', label: 'Bars', icon: 'wine-outline' },
  { key: 'hotels', label: 'Hotels', icon: 'bed-outline' },
  { key: 'sightseeing', label: 'Sightseeing', icon: 'camera-outline' },
  { key: 'kultur', label: 'Kultur', icon: 'color-palette-outline' },
  { key: 'geschaefte', label: 'Geschäfte', icon: 'bag-handle-outline' },
  { key: 'sport', label: 'Sport', icon: 'bicycle-outline' },
  { key: 'touren', label: 'Touren', icon: 'footsteps-outline' },
];

interface CategoryFilterProps {
  selected: ListingCategory | 'all';
  onSelect: (cat: ListingCategory | 'all') => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={cat.icon}
              size={15}
              color={isActive ? '#FFFFFF' : theme.colors.primary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  labelActive: {
    color: '#FFFFFF',
  },
});

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';
import type { ListingCategory } from '../types';

interface CategoryItem {
  key: ListingCategory | 'all';
  label: string;
  emoji: string;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'all', label: 'Alle', emoji: '🗺️' },
  { key: 'restaurants', label: 'Restaurants', emoji: '🍽️' },
  { key: 'cafes', label: 'Cafés', emoji: '☕' },
  { key: 'bars', label: 'Bars', emoji: '🍸' },
  { key: 'hotels', label: 'Hotels', emoji: '🏨' },
  { key: 'sightseeing', label: 'Sightseeing', emoji: '🏛️' },
  { key: 'kultur', label: 'Kultur', emoji: '🎨' },
  { key: 'geschaefte', label: 'Geschäfte', emoji: '🛍️' },
  { key: 'sport', label: 'Sport', emoji: '🏊' },
  { key: 'touren', label: 'Touren', emoji: '🗺️' },
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
            <Text style={styles.emoji}>{cat.emoji}</Text>
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
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  labelActive: {
    color: theme.colors.surface,
  },
});

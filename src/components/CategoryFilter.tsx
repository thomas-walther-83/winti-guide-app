import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useTranslation } from '../hooks/useTranslation';
import type { ListingCategory } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

interface CategoryItem {
  key: ListingCategory | 'all';
  labelKey: TranslationKey;
  icon: IoniconName;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'all', labelKey: 'all_categories', icon: 'grid-outline' },
  { key: 'restaurants', labelKey: 'restaurants', icon: 'restaurant-outline' },
  { key: 'cafes', labelKey: 'cafes', icon: 'cafe-outline' },
  { key: 'bars', labelKey: 'bars', icon: 'wine-outline' },
  { key: 'hotels', labelKey: 'hotels', icon: 'bed-outline' },
  { key: 'sightseeing', labelKey: 'sightseeing', icon: 'camera-outline' },
  { key: 'kultur', labelKey: 'kultur', icon: 'color-palette-outline' },
  { key: 'geschaefte', labelKey: 'geschaefte', icon: 'bag-handle-outline' },
  { key: 'sport', labelKey: 'sport', icon: 'bicycle-outline' },
  { key: 'touren', labelKey: 'touren', icon: 'footsteps-outline' },
];

interface CategoryFilterProps {
  selected: ListingCategory | 'all';
  onSelect: (cat: ListingCategory | 'all') => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
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
              {t(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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

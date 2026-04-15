import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';
import { SUB_CATEGORIES } from '../config/subcategories';
import type { ListingCategory } from '../types';

interface SubCategoryFilterProps {
  category: ListingCategory;
  selected: string;
  onSelect: (subType: string) => void;
}

export function SubCategoryFilter({ category, selected, onSelect }: SubCategoryFilterProps) {
  const subCategories = SUB_CATEGORIES[category] ?? [];

  if (subCategories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      <TouchableOpacity
        style={[styles.chip, selected === 'all' && styles.chipActive]}
        onPress={() => onSelect('all')}
        activeOpacity={0.7}
      >
        <Text style={[styles.label, selected === 'all' && styles.labelActive]}>
          Alle
        </Text>
      </TouchableOpacity>

      {subCategories.map((sub) => {
        const isActive = selected === sub;
        return (
          <TouchableOpacity
            key={sub}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(sub)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {sub}
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
    paddingTop: 0,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: '#FFEAEA',
    borderColor: theme.colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

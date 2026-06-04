import React from 'react';
import {
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useTranslation } from '../hooks/useTranslation';
import { COLLECTIONS } from '../config/collections';

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

interface CollectionRowProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CollectionRow({ selected, onSelect }: CollectionRowProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {COLLECTIONS.map((col) => {
        const isActive = selected === col.id;
        return (
          <TouchableOpacity
            key={col.id}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(isActive ? null : col.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={col.icon}
              size={15}
              color={isActive ? '#FFFFFF' : theme.colors.primary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(col.labelKey as TranslationKey)}
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

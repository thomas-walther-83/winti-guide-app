import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface SectionHeaderProps {
  title: string;
  onShowAll?: () => void;
  showAllLabel?: string;
}

export function SectionHeader({
  title,
  onShowAll,
  showAllLabel = 'Alle anzeigen',
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onShowAll && (
        <TouchableOpacity onPress={onShowAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.link}>{showAllLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.text,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

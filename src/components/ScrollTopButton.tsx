import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  visible: boolean;
  onPress: () => void;
}

/** Schwebender „Nach oben“-Button (erscheint nach dem Scrollen). */
export function ScrollTopButton({ visible, onPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('scroll_to_top')}
    >
      <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  btn: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.medium,
  },
});

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useTranslation } from '../hooks/useTranslation';
import type { Language } from '../types';

const LABELS: Record<Language, string> = {
  de: 'DE',
  en: 'EN',
  fr: 'FR',
  it: 'IT',
};

export function LanguageSwitcher() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language, setLanguage, availableLanguages, t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('language')}</Text>
      <View style={styles.row}>
        {availableLanguages.map((lang) => {
          const active = lang === language;
          return (
            <TouchableOpacity
              key={lang}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setLanguage(lang)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Sprache ${LABELS[lang]}`}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {LABELS[lang]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  pill: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  pillTextActive: {
    color: theme.colors.onPrimary,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTranslation } from '../hooks/useTranslation';
import { useLocation } from '../hooks/useLocation';
import { theme } from '../styles/theme';
import type { ListingCategory } from '../types';

export const ONBOARDING_KEY = 'winti_onboarding_done';
export const INTERESTS_KEY = 'winti_interests';

const CATEGORIES: { key: ListingCategory; emoji: string }[] = [
  { key: 'restaurants', emoji: '🍽️' },
  { key: 'cafes', emoji: '☕' },
  { key: 'bars', emoji: '🍸' },
  { key: 'hotels', emoji: '🏨' },
  { key: 'sightseeing', emoji: '🏛️' },
  { key: 'kultur', emoji: '🎨' },
  { key: 'geschaefte', emoji: '🛍️' },
  { key: 'sport', emoji: '🏊' },
  { key: 'touren', emoji: '🗺️' },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { request: requestLocation } = useLocation();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<ListingCategory[]>([]);

  const toggleInterest = (cat: ListingCategory) => {
    setInterests((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // ignore – Onboarding nicht zu blockieren
    }
    onDone();
  };

  const next = () => {
    if (step < 2) setStep(step + 1);
    else finish();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity onPress={finish} accessibilityRole="button" accessibilityLabel={t('onboarding_skip')}>
          <Text style={styles.skip}>{t('onboarding_skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {step === 0 && (
          <View style={styles.slide}>
            <Text style={styles.hero}>🦁</Text>
            <Text style={styles.title}>{t('onboarding_welcome_title')}</Text>
            <Text style={styles.text}>{t('onboarding_welcome_text')}</Text>
            <Text style={styles.sectionLabel}>{t('onboarding_language_title')}</Text>
            <LanguageSwitcher />
          </View>
        )}

        {step === 1 && (
          <View style={styles.slide}>
            <Text style={styles.hero}>✨</Text>
            <Text style={styles.title}>{t('onboarding_interests_title')}</Text>
            <Text style={styles.text}>{t('onboarding_interests_text')}</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(({ key, emoji }) => {
                const active = interests.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleInterest(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.chipEmoji}>{emoji}</Text>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {t(key as 'restaurants')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.slide}>
            <Text style={styles.hero}>📍</Text>
            <Text style={styles.title}>{t('onboarding_location_title')}</Text>
            <Text style={styles.text}>{t('onboarding_location_text')}</Text>
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={requestLocation}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding_allow_location')}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text style={styles.locationBtnText}>{t('onboarding_allow_location')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={next}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {step < 2 ? t('onboarding_next') : t('onboarding_start')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border,
  },
  dotActive: { backgroundColor: theme.colors.primary, width: 22 },
  skip: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
  body: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg },
  slide: { alignItems: 'center', gap: theme.spacing.sm },
  hero: { fontSize: 64, marginBottom: theme.spacing.sm },
  title: {
    fontSize: 24, fontWeight: '800', color: theme.colors.text, textAlign: 'center',
  },
  text: {
    fontSize: 15, color: theme.colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: theme.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: theme.spacing.sm,
  },
  chips: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: theme.spacing.sm, marginTop: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full, borderWidth: 1,
    borderColor: theme.colors.border, minHeight: 44,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipEmoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: '#FFFFFF' },
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary, paddingVertical: 14,
    paddingHorizontal: theme.spacing.xl, borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md, minHeight: 48,
  },
  locationBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footer: { padding: theme.spacing.lg },
  nextBtn: {
    backgroundColor: theme.colors.primary, paddingVertical: 16,
    borderRadius: theme.borderRadius.md, alignItems: 'center', minHeight: 52,
    justifyContent: 'center',
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

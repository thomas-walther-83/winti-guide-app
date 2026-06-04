import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../hooks/useEvents';
import { useAppTier } from '../hooks/useAppTier';
import { EventCard } from '../components/EventCard';
import { useTranslation } from '../hooks/useTranslation';
import { theme } from '../styles/theme';
import type { EventCategory } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

const FREE_TIER_DAYS = 7; // Free users see events for the next 7 days

const EVENT_CATEGORIES: { key: EventCategory | 'all'; labelKey: TranslationKey; icon: IoniconName }[] = [
  { key: 'all', labelKey: 'all_categories', icon: 'calendar-outline' },
  { key: 'festival', labelKey: 'festival', icon: 'musical-notes-outline' },
  { key: 'musik', labelKey: 'musik', icon: 'headset-outline' },
  { key: 'kultur', labelKey: 'kultur', icon: 'color-palette-outline' },
  { key: 'markt', labelKey: 'markt', icon: 'storefront-outline' },
  { key: 'theater', labelKey: 'theater', icon: 'film-outline' },
  { key: 'tour', labelKey: 'tour', icon: 'footsteps-outline' },
  { key: 'kulinarik', labelKey: 'kulinarik', icon: 'restaurant-outline' },
  { key: 'sport', labelKey: 'sport', icon: 'bicycle-outline' },
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function CalendarScreen({ onNavigateToAccount }: { onNavigateToAccount?: () => void }) {
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const { isPremium } = useAppTier();
  const { t } = useTranslation();

  const { events, loading, error, refresh } = useEvents({
    category: category === 'all' ? undefined : category,
    from: getToday(),
  });

  // Free tier: limit to next FREE_TIER_DAYS days
  const visibleEvents = useMemo(() => {
    if (isPremium) return events;
    const cutoff = addDays(getToday(), FREE_TIER_DAYS);
    return events.filter((e) => e.event_date <= cutoff);
  }, [events, isPremium]);

  const hasHiddenEvents = !isPremium && events.length > visibleEvents.length;

  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: typeof visibleEvents }[] = [];
    const seen = new Set<string>();
    for (const event of visibleEvents) {
      if (!seen.has(event.event_date)) {
        seen.add(event.event_date);
        groups.push({ date: event.event_date, events: [event] });
      } else {
        const last = groups[groups.length - 1];
        groups[groups.length - 1] = { ...last, events: [...last.events, event] };
      }
    }
    return groups;
  }, [visibleEvents]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('calendar')}</Text>
        <Text style={styles.subtitle}>{t('calendar_subtitle')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
        style={styles.catScrollContainer}
      >
        {EVENT_CATEGORIES.map((cat) => {
          const isActive = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setCategory(cat.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={cat.icon}
                size={15}
                color={isActive ? '#FFFFFF' : theme.colors.primary}
              />
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && visibleEvents.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎭</Text>
          <Text style={styles.emptyText}>{t('no_events')}</Text>
          <Text style={styles.emptyHint}>{t('check_back_soon')}</Text>
        </View>
      )}

      {!loading && !error && visibleEvents.length > 0 && (
        <FlatList
          data={groupedEvents}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {item.date === getToday() ? `🌟 ${t('today')}` : formatSectionDate(item.date)}
                </Text>
              </View>
              {item.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={loading}
          ListFooterComponent={
            hasHiddenEvents ? (
              <TouchableOpacity
                style={styles.premiumTeaser}
                onPress={onNavigateToAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumTeaserIcon}>🔒</Text>
                <View style={styles.premiumTeaserInfo}>
                  <Text style={styles.premiumTeaserTitle}>
                    {t('more_events_prefix')} {events.length - visibleEvents.length} {t('more_events_suffix')}
                  </Text>
                  <Text style={styles.premiumTeaserSub}>
                    {t('upgrade_full_calendar')}
                  </Text>
                </View>
                <Text style={styles.premiumTeaserArrow}>→</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatSectionDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('de-CH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  catScrollContainer: {
    flexGrow: 0,
  },
  catScroll: {
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
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  dateHeader: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  premiumTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  premiumTeaserIcon: {
    fontSize: 24,
  },
  premiumTeaserInfo: {
    flex: 1,
    gap: 3,
  },
  premiumTeaserTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  premiumTeaserSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  premiumTeaserArrow: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

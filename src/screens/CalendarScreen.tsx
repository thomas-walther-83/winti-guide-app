import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEvents } from '../hooks/useEvents';
import { useAppTier } from '../hooks/useAppTier';
import { EventCard } from '../components/EventCard';
import { EventRow } from '../components/EventRow';
import { MonthCalendar } from '../components/MonthCalendar';
import { ScrollTopButton } from '../components/ScrollTopButton';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import type { EventCategory, Event } from '../types';

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

const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function localToday(): string {
  return fmtDate(new Date());
}
function upcomingWeekend(today: string): [string, string] {
  const n = new Date(today + 'T00:00:00');
  const toSat = (6 - n.getDay() + 7) % 7;
  const sat = new Date(n); sat.setDate(n.getDate() + toSat);
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  return [fmtDate(sat), fmtDate(sun)];
}
function restOfWeek(today: string): [string, string] {
  const n = new Date(today + 'T00:00:00');
  const toSun = (7 - n.getDay()) % 7; // So = 0
  const sun = new Date(n); sun.setDate(n.getDate() + toSun);
  return [today, fmtDate(sun)];
}
function formatShort(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function CalendarScreen({ onNavigateToAccount }: { onNavigateToAccount?: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const { isPremium } = useAppTier();
  const { t } = useTranslation();

  const { events, loading, error, refresh } = useEvents({
    category: category === 'all' ? undefined : category,
    from: getToday(),
  });

  const today = useMemo(() => localToday(), []);
  const [calY, setCalY] = useState(() => new Date().getFullYear());
  const [calM, setCalM] = useState(() => new Date().getMonth());
  const [rangeFrom, setRangeFrom] = useState<string | null>(null);
  const [rangeTo, setRangeTo] = useState<string | null>(null);

  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Event-Ansicht: grosse Karten oder kompakte Liste (persistiert).
  const [eventView, setEventView] = useState<'cards' | 'compact'>('cards');
  useEffect(() => {
    AsyncStorage.getItem('winti_event_view').then((v) => {
      if (v === 'cards' || v === 'compact') setEventView(v);
    });
  }, []);
  const switchEventView = (v: 'cards' | 'compact') => {
    setEventView(v);
    AsyncStorage.setItem('winti_event_view', v).catch(() => undefined);
  };

  // Free tier: limit to next FREE_TIER_DAYS days
  const visibleEvents = useMemo(() => {
    if (isPremium) return events;
    const cutoff = addDays(getToday(), FREE_TIER_DAYS);
    return events.filter((e) => e.event_date <= cutoff);
  }, [events, isPremium]);

  const hasHiddenEvents = !isPremium && events.length > visibleEvents.length;
  const eventDates = useMemo(() => new Set(events.map((e) => e.event_date)), [events]);

  // Auf gewählten Zeitraum (von–bis) einschränken.
  const rangeEvents = useMemo(() => {
    if (!rangeFrom) return visibleEvents;
    const hi = rangeTo ?? rangeFrom;
    return visibleEvents.filter((e) => e.event_date >= rangeFrom && e.event_date <= hi);
  }, [visibleEvents, rangeFrom, rangeTo]);

  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: Event[] }[] = [];
    const seen = new Set<string>();
    for (const event of rangeEvents) {
      if (!seen.has(event.event_date)) {
        seen.add(event.event_date);
        groups.push({ date: event.event_date, events: [event] });
      } else {
        const last = groups[groups.length - 1];
        groups[groups.length - 1] = { ...last, events: [...last.events, event] };
      }
    }
    return groups;
  }, [rangeEvents]);

  const selectDay = (d: string) => {
    if (!rangeFrom || (rangeFrom && rangeTo)) { setRangeFrom(d); setRangeTo(null); }
    else if (d < rangeFrom) { setRangeFrom(d); }
    else { setRangeTo(d); }
  };
  const applyQuick = (from: string, to: string) => {
    setRangeFrom(from); setRangeTo(to);
    const dt = new Date(from + 'T00:00:00');
    setCalY(dt.getFullYear()); setCalM(dt.getMonth());
  };
  const clearRange = () => { setRangeFrom(null); setRangeTo(null); };

  const isQuickActive = (from: string, to: string) => rangeFrom === from && rangeTo === to;

  const rangeLabel = !rangeFrom
    ? t('ev_all_dates')
    : !rangeTo || rangeTo === rangeFrom
      ? formatShort(rangeFrom)
      : `${formatShort(rangeFrom)} – ${formatShort(rangeTo)}`;

  const quickChips = (
    <View style={styles.quickRow}>
      {([
        { label: t('today'), range: [today, today] as [string, string] },
        { label: t('ev_weekend'), range: upcomingWeekend(today) },
        { label: t('ev_this_week'), range: restOfWeek(today) },
      ]).map((q) => {
        const active = isQuickActive(q.range[0], q.range[1]);
        return (
          <TouchableOpacity
            key={q.label}
            style={[styles.quickChip, active && styles.quickChipActive]}
            onPress={() => (active ? clearRange() : applyQuick(q.range[0], q.range[1]))}
            activeOpacity={0.8}
          >
            <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{q.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const listHeader = (
    <View>
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
              <Ionicons name={cat.icon} size={15} color={isActive ? '#FFFFFF' : theme.colors.primary} />
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{t(cat.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {quickChips}

      <MonthCalendar
        year={calY}
        month={calM}
        onPrev={() => (calM === 0 ? (setCalM(11), setCalY(calY - 1)) : setCalM(calM - 1))}
        onNext={() => (calM === 11 ? (setCalM(0), setCalY(calY + 1)) : setCalM(calM + 1))}
        eventDates={eventDates}
        from={rangeFrom}
        to={rangeTo}
        today={today}
        minDate={today}
        onSelectDay={selectDay}
      />

      <View style={styles.rangeBar}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
        <Text style={styles.rangeText}>{rangeLabel}</Text>
        {rangeFrom && (
          <TouchableOpacity onPress={clearRange} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, eventView === 'cards' && styles.viewBtnActive]}
            onPress={() => switchEventView('cards')}
            accessibilityRole="button"
            accessibilityLabel={t('view_cards')}
            accessibilityState={{ selected: eventView === 'cards' }}
          >
            <Ionicons name="image" size={15} color={eventView === 'cards' ? '#FFFFFF' : theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, eventView === 'compact' && styles.viewBtnActive]}
            onPress={() => switchEventView('compact')}
            accessibilityRole="button"
            accessibilityLabel={t('view_list')}
            accessibilityState={{ selected: eventView === 'compact' }}
          >
            <Ionicons name="list" size={17} color={eventView === 'compact' ? '#FFFFFF' : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('calendar')}</Text>
        <Text style={styles.subtitle}>{t('calendar_subtitle')}</Text>
      </View>

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

      {!loading && !error && (
        <FlatList
          ref={listRef}
          data={groupedEvents}
          keyExtractor={(item) => item.date}
          ListHeaderComponent={listHeader}
          extraData={eventView}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            setShowScrollTop((prev) => (prev !== y > 700 ? y > 700 : prev));
          }}
          renderItem={({ item }: { item: { date: string; events: Event[] } }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {item.date === today ? `🌟 ${t('today')}` : formatSectionDate(item.date)}
                </Text>
              </View>
              {item.events.map((event) =>
                eventView === 'compact'
                  ? <EventRow key={event.id} event={event} />
                  : <EventCard key={event.id} event={event} />,
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyEmoji}>🎭</Text>
              <Text style={styles.emptyText}>{rangeFrom ? t('ev_no_in_range') : t('no_events')}</Text>
              <Text style={styles.emptyHint}>{t('check_back_soon')}</Text>
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={loading}
          ListFooterComponent={
            hasHiddenEvents ? (
              <TouchableOpacity style={styles.premiumTeaser} onPress={onNavigateToAccount} activeOpacity={0.8}>
                <Text style={styles.premiumTeaserIcon}>🔒</Text>
                <View style={styles.premiumTeaserInfo}>
                  <Text style={styles.premiumTeaserTitle}>
                    {t('more_events_prefix')} {events.length - visibleEvents.length} {t('more_events_suffix')}
                  </Text>
                  <Text style={styles.premiumTeaserSub}>{t('upgrade_full_calendar')}</Text>
                </View>
                <Text style={styles.premiumTeaserArrow}>→</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      <ScrollTopButton
        visible={showScrollTop}
        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
      />
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  quickChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
  },
  quickChipActive: {
    backgroundColor: theme.colors.primary,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  quickChipTextActive: {
    color: '#FFFFFF',
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  rangeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.full,
    padding: 3,
  },
  viewBtn: {
    width: 34,
    height: 28,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
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
    color: '#1C1A17',
  },
  premiumTeaserSub: {
    fontSize: 12,
    color: '#5F594F',
  },
  premiumTeaserArrow: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});

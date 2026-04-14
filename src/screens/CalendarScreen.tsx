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
import { EventCard } from '../components/EventCard';
import { theme } from '../styles/theme';
import type { EventCategory } from '../types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const EVENT_CATEGORIES: { key: EventCategory | 'all'; label: string; icon: IoniconName }[] = [
  { key: 'all', label: 'Alle', icon: 'calendar-outline' },
  { key: 'festival', label: 'Festival', icon: 'musical-notes-outline' },
  { key: 'musik', label: 'Musik', icon: 'headset-outline' },
  { key: 'kultur', label: 'Kultur', icon: 'color-palette-outline' },
  { key: 'markt', label: 'Markt', icon: 'storefront-outline' },
  { key: 'theater', label: 'Theater', icon: 'film-outline' },
  { key: 'tour', label: 'Tour', icon: 'footsteps-outline' },
  { key: 'kulinarik', label: 'Kulinarik', icon: 'restaurant-outline' },
  { key: 'sport', label: 'Sport', icon: 'bicycle-outline' },
];

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function CalendarScreen() {
  const [category, setCategory] = useState<EventCategory | 'all'>('all');

  const { events, loading, error, refresh } = useEvents({
    category: category === 'all' ? undefined : category,
    from: getToday(),
  });

  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: typeof events }[] = [];
    const seen = new Set<string>();
    for (const event of events) {
      if (!seen.has(event.event_date)) {
        seen.add(event.event_date);
        groups.push({ date: event.event_date, events: [event] });
      } else {
        const last = groups[groups.length - 1];
        groups[groups.length - 1] = { ...last, events: [...last.events, event] };
      }
    }
    return groups;
  }, [events]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kalender</Text>
        <Text style={styles.subtitle}>Kommende Events in Winterthur</Text>
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
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && events.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎭</Text>
          <Text style={styles.emptyText}>Keine Events gefunden</Text>
          <Text style={styles.emptyHint}>Schau bald wieder vorbei!</Text>
        </View>
      )}

      {!loading && !error && events.length > 0 && (
        <FlatList
          data={groupedEvents}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {item.date === getToday() ? '🌟 Heute' : formatSectionDate(item.date)}
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
});

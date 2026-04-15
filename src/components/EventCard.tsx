import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import type { Event } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  festival: '🎪',
  musik: '🎵',
  kultur: '🎨',
  markt: '🛍️',
  theater: '🎭',
  tour: '🗺️',
  kulinarik: '🍷',
  sport: '🏅',
};

interface EventCardProps {
  event: Event;
}

function formatWeekday(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('de-CH', { weekday: 'short' }).toUpperCase();
  } catch {
    return '';
  }
}

function formatDay(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return String(date.getDate());
  } catch {
    return dateStr;
  }
}

function formatMonth(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('de-CH', { month: 'short' }).toUpperCase();
  } catch {
    return '';
  }
}

export function EventCard({ event }: EventCardProps) {
  const emoji = CATEGORY_EMOJI[event.cat] ?? '📅';

  const handleUrl = () => {
    if (event.url) {
      const url = event.url.startsWith('http') ? event.url : `https://${event.url}`;
      Linking.openURL(url).catch(console.error);
    }
  };

  const isToday = event.event_date === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.card}>
      {/* Date column */}
      <View style={styles.dateColumn}>
        <Text style={styles.weekday}>{formatWeekday(event.event_date)}</Text>
        <Text style={styles.dayNumber}>{formatDay(event.event_date)}</Text>
        <Text style={styles.month}>{formatMonth(event.event_date)}</Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayText}>HEUTE</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
        </View>

        {event.location ? (
          <Text style={styles.detail} numberOfLines={1}>
            📍 {event.location}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {event.event_time ? (
            <Text style={styles.metaItem}>🕐 {event.event_time}</Text>
          ) : null}
          {event.price ? (
            <Text style={styles.metaItem}>
              {event.price.toLowerCase() === 'kostenlos' ||
              event.price.toLowerCase() === 'free' ||
              event.price === '0'
                ? '🆓 Kostenlos'
                : `💶 ${event.price}`}
            </Text>
          ) : null}
        </View>

        {event.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

        {event.url ? (
          <TouchableOpacity style={styles.linkBtn} onPress={handleUrl}>
            <Text style={styles.linkText}>Mehr erfahren</Text>
            <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  dateColumn: {
    width: 72,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    gap: 1,
  },
  weekday: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  month: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: 3,
  },
  todayText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  emoji: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 20,
  },
  detail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  linkText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

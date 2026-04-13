import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
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

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('de-CH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
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
      <View style={styles.dateColumn}>
        <Text style={styles.dateText}>{formatDate(event.event_date)}</Text>
        {isToday && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayText}>HEUTE</Text>
          </View>
        )}
      </View>
      <View style={styles.divider} />
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
            <Text style={styles.linkText}>Mehr erfahren →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    overflow: 'hidden',
    ...theme.shadow.medium,
  },
  dateColumn: {
    width: 72,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  dateText: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  todayBadge: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  todayText: {
    color: theme.colors.surface,
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
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  linkText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

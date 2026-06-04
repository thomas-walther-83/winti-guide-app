import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';
import { useTranslation } from '../hooks/useTranslation';
import { getEventVisual } from '../config/categoryVisuals';
import type { Event } from '../types';

/** Kompakte Event-Zeile (das Datum steht bereits in der Gruppen-Überschrift). */
export function EventRow({ event }: { event: Event }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const visual = getEventVisual(event.cat);
  const { open } = useDetail();
  const { t } = useTranslation();

  const isFree =
    event.price &&
    ['kostenlos', 'free', '0'].includes(event.price.toLowerCase());
  const meta = [event.event_time, event.location].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => open({ kind: 'event', event })}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} – Details öffnen`}
    >
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: visual.bg }]}>
          <Ionicons name={visual.icon} size={20} color="rgba(255,255,255,0.95)" />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>

      {event.price ? (
        <Text style={[styles.price, isFree && styles.priceFree]} numberOfLines={1}>
          {isFree ? t('free') : event.price}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: 4,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    ...theme.shadow.small,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    maxWidth: 90,
  },
  priceFree: {
    color: theme.colors.success,
  },
});

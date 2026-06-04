import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface Props {
  /** Anzuzeigender Monat. */
  year: number;
  month: number; // 0-basiert
  onPrev: () => void;
  onNext: () => void;
  /** Tage (YYYY-MM-DD) mit Events → Punkt-Markierung. */
  eventDates: Set<string>;
  from: string | null;
  to: string | null;
  today: string;
  /** Tage vor minDate sind deaktiviert. */
  minDate?: string;
  onSelectDay: (date: string) => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function fmt(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function MonthCalendar({
  year, month, onPrev, onNext, eventDates, from, to, today, minDate, onSelectDay,
}: Props) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString('de-CH', {
    month: 'long',
    year: 'numeric',
  });

  const startIdx = (new Date(year, month, 1).getDay() + 6) % 7; // Mo = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <TouchableOpacity onPress={onPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Voriger Monat">
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={onNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Nächster Monat">
          <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day == null) return <View key={di} style={styles.cell} />;
            const ds = fmt(year, month, day);
            const disabled = minDate != null && ds < minDate;
            const isEndpoint = ds === from || ds === to;
            const inRange = from != null && to != null && ds > from && ds < to;
            const isToday = ds === today;
            const hasEvent = eventDates.has(ds);
            return (
              <TouchableOpacity
                key={di}
                style={styles.cell}
                onPress={() => !disabled && onSelectDay(ds)}
                disabled={disabled}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View
                  style={[
                    styles.dayCircle,
                    inRange && styles.dayInRange,
                    isToday && !isEndpoint && styles.dayToday,
                    isEndpoint && styles.dayEndpoint,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayDisabled,
                      isEndpoint && styles.dayTextEndpoint,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
                <View
                  style={[
                    styles.dot,
                    hasEvent && !isEndpoint && styles.dotVisible,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    ...theme.shadow.small,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  monthLabel: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 0,
    width: '100%',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  dayEndpoint: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dayTextEndpoint: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayDisabled: {
    color: theme.colors.border,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  dotVisible: {
    backgroundColor: theme.colors.premium,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { useAppTier } from '../hooks/useAppTier';

interface PremiumGateProps {
  children: React.ReactNode;
  /** Text shown in the locked-feature teaser */
  reason?: string;
  /** Called when the user taps "Upgrade" */
  onUpgrade: () => void;
}

/**
 * Renders `children` for premium users.
 * For free-tier users it renders a locked-feature placeholder instead.
 */
export function PremiumGate({ children, reason, onUpgrade }: PremiumGateProps) {
  const { isPremium, loading } = useAppTier();

  if (loading) return null;

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>Premium-Feature</Text>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={onUpgrade} activeOpacity={0.8}>
        <Text style={styles.btnText}>⭐ Jetzt upgraden</Text>
      </TouchableOpacity>
      <Text style={styles.price}>Ab CHF 1.99 / Monat</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  lock: {
    fontSize: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  reason: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    backgroundColor: theme.colors.premium,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  price: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});

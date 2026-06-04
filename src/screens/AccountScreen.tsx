import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTier } from '../hooks/useAppTier';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTheme, useThemeMode, type ThemeMode } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';

// ── Stripe Checkout URLs ─────────────────────────────────────────────────────
// Replace with your actual Stripe Payment Links or Checkout Session URLs.
// Configure EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_URL and
// EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_URL in your .env
const STRIPE_PREMIUM_MONTHLY =
  process.env.EXPO_PUBLIC_STRIPE_PREMIUM_MONTHLY_URL ?? 'https://buy.stripe.com/premium_monthly';
const STRIPE_PREMIUM_YEARLY =
  process.env.EXPO_PUBLIC_STRIPE_PREMIUM_YEARLY_URL ?? 'https://buy.stripe.com/premium_yearly';

type AuthMode = 'login' | 'register';

export function AccountScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { user, signIn, signUp, signOut, loading: authLoading } = useAuth();
  const { tier, isPremium, loading: tierLoading, refresh: refreshTier } = useAppTier();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('enter_email_password'));
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const authError = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);

    setSubmitting(false);

    if (authError) {
      setError(translateAuthError(authError.message, t));
    } else if (mode === 'register') {
      setSuccessMsg(t('register_success'));
    }
  };

  const handleUpgrade = (billing: 'monthly' | 'yearly') => {
    const url = billing === 'monthly' ? STRIPE_PREMIUM_MONTHLY : STRIPE_PREMIUM_YEARLY;
    Linking.openURL(url).catch(() =>
      Alert.alert(t('error'), t('checkout_failed')),
    );
  };

  const handleSignOut = () => {
    Alert.alert(t('sign_out'), t('sign_out_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('sign_out'), style: 'destructive', onPress: signOut },
    ]);
  };

  const appearanceSwitcher = (
    <View style={styles.appearanceCard}>
      <Text style={styles.appearanceLabel}>{t('appearance')}</Text>
      <View style={styles.segRow}>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => {
          const active = themeMode === m;
          const label = m === 'system' ? t('theme_system') : m === 'light' ? t('theme_light') : t('theme_dark');
          const icon = m === 'system' ? 'phone-portrait-outline' : m === 'light' ? 'sunny-outline' : 'moon-outline';
          return (
            <TouchableOpacity
              key={m}
              style={[styles.segBtn, active && styles.segBtnActive]}
              onPress={() => setThemeMode(m)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={icon} size={15} color={active ? '#FFFFFF' : theme.colors.textSecondary} />
              <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  if (authLoading || tierLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Logged in ──────────────────────────────────────────────────────────────
  if (user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>👤 {t('account')}</Text>
          </View>

          <LanguageSwitcher />
          {appearanceSwitcher}

          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>
                  {isPremium ? '⭐ Premium' : '🆓 Free'}
                </Text>
              </View>
            </View>
          </View>

          {/* Premium upgrade card (only for free users) */}
          {!isPremium && (
            <View style={styles.upgradeCard}>
              <Text style={styles.upgradeTitle}>{t('premium_title')}</Text>
              <Text style={styles.upgradeSubtitle}>
                {t('premium_subtitle')}
              </Text>

              <View style={styles.featureList}>
                {[
                  t('feature_no_ads'),
                  t('feature_full_calendar'),
                  t('feature_unlimited_save'),
                  t('feature_exclusive_listings'),
                ].map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.upgradeButtons}>
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={() => handleUpgrade('monthly')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeBtnTitle}>{t('price_monthly')}</Text>
                  <Text style={styles.upgradeBtnSub}>{t('cancel_monthly')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.upgradeBtn, styles.upgradeBtnYearly]}
                  onPress={() => handleUpgrade('yearly')}
                  activeOpacity={0.8}
                >
                  <View style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>{t('best_value')}</Text>
                  </View>
                  <Text style={[styles.upgradeBtnTitle, styles.upgradeBtnTitleYearly]}>
                    {t('price_yearly')}
                  </Text>
                  <Text style={[styles.upgradeBtnSub, styles.upgradeBtnSubYearly]}>
                    {t('save_yearly')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={refreshTier} style={styles.refreshTier}>
                <Text style={styles.refreshTierText}>
                  {t('already_paid')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Premium active card */}
          {isPremium && (
            <View style={styles.premiumActiveCard}>
              <Text style={styles.premiumActiveIcon}>⭐</Text>
              <Text style={styles.premiumActiveTitle}>{t('premium_active')}</Text>
              <Text style={styles.premiumActiveSub}>
                {t('premium_thanks')}
              </Text>
            </View>
          )}

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>{t('sign_out')}</Text>
          </TouchableOpacity>

          {/* Partner link */}
          <View style={styles.partnerSection}>
            <Text style={styles.partnerTitle}>{t('partner_question')}</Text>
            <Text style={styles.partnerText}>
              {t('partner_promo')}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>👤 {t('account')}</Text>
        </View>

        <LanguageSwitcher />
        {appearanceSwitcher}

        <View style={styles.authCard}>
          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                {t('login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
              onPress={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder={t('password_placeholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={theme.colors.textMuted}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color={theme.colors.surface} size="small" />
              : <Text style={styles.submitBtnText}>
                  {mode === 'login' ? t('login') : t('create_account')}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* Guest info */}
        <View style={styles.guestBox}>
          <Text style={styles.guestText}>
            {t('guest_info')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function translateAuthError(msg: string, t: (key: any) => string): string {
  if (msg.includes('Invalid login credentials')) return t('auth_invalid');
  if (msg.includes('Email not confirmed')) return t('auth_not_confirmed');
  if (msg.includes('already registered')) return t('auth_already_registered');
  if (msg.includes('Password should be at least')) return t('auth_password_short');
  return msg;
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    paddingBottom: theme.spacing.xxl,
  },
  appearanceCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  appearanceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  segRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.full,
    padding: 3,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  segBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  segText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  segTextActive: {
    color: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  // ── Profile ────────────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadow.small,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // ── Upgrade ────────────────────────────────────────────────────────────────
  upgradeCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    ...theme.shadow.medium,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  upgradeSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  featureList: {
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureCheck: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '700',
    width: 20,
  },
  featureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  upgradeButtons: {
    gap: theme.spacing.sm,
  },
  upgradeBtn: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  upgradeBtnYearly: {
    backgroundColor: theme.colors.premium,
    position: 'relative',
    paddingTop: theme.spacing.lg,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.surface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  upgradeBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  upgradeBtnTitleYearly: {
    color: theme.colors.surface,
  },
  upgradeBtnSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  upgradeBtnSubYearly: {
    color: 'rgba(255,255,255,0.85)',
  },
  refreshTier: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  refreshTierText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  // ── Premium active ─────────────────────────────────────────────────────────
  premiumActiveCard: {
    backgroundColor: '#FFFBF0',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  premiumActiveIcon: {
    fontSize: 36,
  },
  premiumActiveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1A17',
  },
  premiumActiveSub: {
    fontSize: 13,
    color: '#5F594F',
    textAlign: 'center',
    lineHeight: 18,
  },
  // ── Sign out ───────────────────────────────────────────────────────────────
  signOutBtn: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.error,
  },
  // ── Partner section ────────────────────────────────────────────────────────
  partnerSection: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  partnerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  partnerText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // ── Auth form ──────────────────────────────────────────────────────────────
  authCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadow.medium,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.small,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  modeBtnTextActive: {
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
  },
  successText: {
    fontSize: 13,
    color: theme.colors.success,
    textAlign: 'center',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  guestBox: {
    marginHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  guestText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
  },
});

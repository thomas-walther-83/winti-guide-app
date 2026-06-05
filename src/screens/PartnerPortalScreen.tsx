import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../utils/alert';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyPartnerProfile,
  createPartnerProfile,
  fetchMySubscriptions,
  fetchMyInvoices,
  fetchMyAds,
  createPartnerAd,
} from '../services/supabaseService';
import { getErrorMessage } from '../utils/errors';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import type {
  Partner,
  PartnerSubscription,
  PartnerInvoice,
  PartnerAd,
  PartnerPlan,
  AdPosition,
} from '../types';

// ── Static plan configuration ─────────────────────────────────────────────────
const PARTNER_PLANS: PartnerPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    priceMonthly: 49,
    priceYearly: 490,
    features: ['1 Anzeige (Inline)', 'Basis-Statistiken', 'E-Mail-Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    priceMonthly: 99,
    priceYearly: 990,
    features: ['3 Anzeigen (Banner + Inline)', 'Erweiterte Statistiken', 'Featured-Listing', 'Prioritäts-Support'],
  },
  {
    id: 'premium',
    name: 'Premium',
    tier: 'premium',
    priceMonthly: 199,
    priceYearly: 1990,
    features: ['Unbegrenzte Anzeigen', 'Kategorie-Highlight', 'Vollständige Statistiken', 'Dedizierter Account Manager'],
  },
];

// ── Stripe Checkout URLs per plan ─────────────────────────────────────────────
// Set these as environment variables: EXPO_PUBLIC_STRIPE_PARTNER_{TIER}_URL
const STRIPE_PARTNER_URLS: Record<string, string> = {
  starter:
    process.env.EXPO_PUBLIC_STRIPE_PARTNER_STARTER_URL ?? 'https://buy.stripe.com/partner_starter',
  pro:
    process.env.EXPO_PUBLIC_STRIPE_PARTNER_PRO_URL ?? 'https://buy.stripe.com/partner_pro',
  premium:
    process.env.EXPO_PUBLIC_STRIPE_PARTNER_PREMIUM_URL ?? 'https://buy.stripe.com/partner_premium',
};

type PortalView = 'dashboard' | 'register' | 'plans' | 'new_ad';

export function PartnerPortalScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [view, setView] = useState<PortalView>('dashboard');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [subscriptions, setSubscriptions] = useState<PartnerSubscription[]>([]);
  const [invoices, setInvoices] = useState<PartnerInvoice[]>([]);
  const [ads, setAds] = useState<PartnerAd[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const p = await fetchMyPartnerProfile();
      setPartner(p);
      if (p) {
        const [subs, invs, myAds] = await Promise.all([
          fetchMySubscriptions(p.id),
          fetchMyInvoices(p.id),
          fetchMyAds(p.id),
        ]);
        setSubscriptions(subs);
        setInvoices(invs);
        setAds(myAds);
      }
    } catch (err) {
      console.error('PartnerPortal load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📢 {t('partner_portal')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔒</Text>
          <Text style={styles.emptyTitle}>{t('partner_login_required')}</Text>
          <Text style={styles.emptyText}>
            {t('partner_login_hint')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'register' || (!partner && view === 'dashboard')) {
    return <RegisterView onRegistered={() => { load(); setView('dashboard'); }} />;
  }

  if (view === 'plans') {
    return (
      <PlanSelectionView
        currentTier={partner?.tier}
        onBack={() => setView('dashboard')}
        onPlanSelected={() => { load(); setView('dashboard'); }}
      />
    );
  }

  if (view === 'new_ad') {
    return (
      <NewAdView
        partnerId={partner!.id}
        onBack={() => setView('dashboard')}
        onCreated={() => { load(); setView('dashboard'); }}
      />
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const activeSub = subscriptions.find((s) => s.status === 'active');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>📢 {t('partner_portal')}</Text>
          <Text style={styles.subtitle}>{t('partner_manage_subtitle')}</Text>
        </View>

        {/* Status card */}
        <View style={[styles.card, partner!.status === 'pending' && styles.cardWarning]}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{partner!.company_name}</Text>
              <Text style={styles.cardSub}>
                {PARTNER_PLANS.find((p) => p.tier === partner!.tier)?.name ?? partner!.tier} {t('package_suffix')}
              </Text>
            </View>
            <View style={[styles.statusBadge, partner!.status === 'active' ? styles.statusActive : styles.statusPending]}>
              <Text style={styles.statusText}>
                {partner!.status === 'active' ? t('status_active') : t('status_pending')}
              </Text>
            </View>
          </View>
          {partner!.status === 'pending' && (
            <Text style={styles.pendingNote}>
              {t('partner_pending_note')}
            </Text>
          )}
        </View>

        {/* Active subscription */}
        {activeSub && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('current_subscription')}</Text>
            <Text style={styles.subPlan}>{activeSub.plan}</Text>
            <Text style={styles.subDetails}>
              CHF {activeSub.price_chf} / {activeSub.billing_cycle === 'monthly' ? t('billing_month') : t('billing_year')}
            </Text>
            {activeSub.ends_at && (
              <Text style={styles.subDetails}>
                {t('runs_until')} {new Date(activeSub.ends_at).toLocaleDateString('de-CH')}
              </Text>
            )}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => setView('new_ad')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>➕</Text>
            <Text style={styles.actionLabel}>{t('new_ad')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => setView('plans')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionEmoji}>📦</Text>
            <Text style={styles.actionLabel}>{t('change_package')}</Text>
          </TouchableOpacity>
        </View>

        {/* Ads list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('my_ads')} ({ads.length})</Text>
          {ads.length === 0 ? (
            <Text style={styles.emptyHint}>{t('no_ads_yet')}</Text>
          ) : (
            ads.map((ad) => (
              <View key={ad.id} style={styles.adRow}>
                <View style={styles.adInfo}>
                  <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                  <Text style={styles.adMeta}>
                    {ad.position} · 👁 {ad.impressions ?? 0} · 🖱 {ad.clicks ?? 0}
                  </Text>
                </View>
                <View style={[styles.adStatus, ad.is_active ? styles.adStatusActive : styles.adStatusPending]}>
                  <Text style={styles.adStatusText}>
                    {ad.is_active ? t('ad_active') : t('ad_pending')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Invoices */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('invoices')} ({invoices.length})</Text>
          {invoices.length === 0 ? (
            <Text style={styles.emptyHint}>{t('no_invoices')}</Text>
          ) : (
            invoices.map((inv) => (
              <View key={inv.id} style={styles.invoiceRow}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceAmount}>CHF {Number(inv.amount_chf).toFixed(2)}</Text>
                  <Text style={styles.invoiceMeta}>
                    {t('due')} {new Date(inv.due_date).toLocaleDateString('de-CH')}
                  </Text>
                </View>
                <View style={[styles.invoiceStatus, inv.status === 'paid' ? styles.invoicePaid : styles.invoiceUnpaid]}>
                  <Text style={styles.invoiceStatusText}>
                    {inv.status === 'paid' ? t('invoice_paid') : inv.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Register sub-view ─────────────────────────────────────────────────────────
function RegisterView({ onRegistered }: { onRegistered: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState('restaurants');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!companyName.trim() || !email.trim()) {
      setError(t('company_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPartnerProfile({
        company_name: companyName.trim(),
        contact_email: email.trim(),
        contact_phone: phone.trim(),
        website: website.trim(),
        category,
        tier: 'starter',
        status: 'pending',
      });
      onRegistered();
    } catch (err) {
      setError(getErrorMessage(err, t('register_failed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>📢 {t('partner_registration')}</Text>
          <Text style={styles.subtitle}>{t('create_company_profile')}</Text>
        </View>

        <View style={styles.card}>
          <FormField
            label={t('company_name_label')}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t('company_name_placeholder')}
          />
          <FormField
            label={t('contact_email_label')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('contact_email_placeholder')}
            keyboardType="email-address"
          />
          <FormField
            label={t('phone_label')}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('phone_placeholder_partner')}
            keyboardType="phone-pad"
          />
          <FormField
            label={t('website_label')}
            value={website}
            onChangeText={setWebsite}
            placeholder={t('website_placeholder')}
            keyboardType="url"
          />

          <Text style={styles.fieldLabel}>{t('category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            <View style={styles.catScrollInner}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catChip, category === cat.key && styles.catChipActive]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text style={[styles.catChipText, category === cat.key && styles.catChipTextActive]}>
                    {cat.emoji} {t(cat.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={theme.colors.surface} size="small" />
              : <Text style={styles.submitBtnText}>{t('create_profile')}</Text>
            }
          </TouchableOpacity>

          <Text style={styles.formNote}>
            {t('register_note')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Plan selection sub-view ───────────────────────────────────────────────────
function PlanSelectionView({
  currentTier,
  onBack,
  onPlanSelected,
}: {
  currentTier?: string;
  onBack: () => void;
  onPlanSelected: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const handleSelect = (plan: PartnerPlan) => {
    const url = STRIPE_PARTNER_URLS[plan.tier];
    Alert.alert(
      `${plan.name} ${t('package_suffix')}`,
      `CHF ${plan.priceMonthly}/${t('billing_month')} ${t('or_yearly_save').replace('{year}', String(plan.priceYearly))}\n\n${t('stripe_redirect_note')}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('continue_to_stripe'),
          onPress: () => {
            const { Linking } = require('react-native');
            Linking.openURL(url).catch(() =>
              Alert.alert(t('error'), t('stripe_open_failed')),
            );
            onPlanSelected();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📦 {t('choose_package')}</Text>
          <Text style={styles.subtitle}>{t('package_for_business')}</Text>
        </View>

        {PARTNER_PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          return (
            <View key={plan.id} style={[styles.planCard, isCurrent && styles.planCardActive]}>
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{t('current_package')}</Text>
                </View>
              )}
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>CHF {plan.priceMonthly}/{t('billing_month')}</Text>
              <Text style={styles.planPriceYear}>{t('or_yearly_save').replace('{year}', String(plan.priceYearly))}</Text>

              <View style={styles.planFeatures}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.planFeatureRow}>
                    <Text style={styles.planFeatureCheck}>✓</Text>
                    <Text style={styles.planFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.planBtn, isCurrent && styles.planBtnDisabled]}
                onPress={() => !isCurrent && handleSelect(plan)}
                disabled={isCurrent}
                activeOpacity={0.8}
              >
                <Text style={[styles.planBtnText, isCurrent && styles.planBtnTextDisabled]}>
                  {isCurrent ? t('currently_active') : `${plan.name} ${t('select_suffix')}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── New Ad sub-view ───────────────────────────────────────────────────────────
function NewAdView({
  partnerId,
  onBack,
  onCreated,
}: {
  partnerId: string;
  onBack: () => void;
  onCreated: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState(t('more_info'));
  const [ctaUrl, setCtaUrl] = useState('');
  const [position, setPosition] = useState<AdPosition>('inline');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError(t('title_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createPartnerAd({
        partner_id: partnerId,
        title: title.trim(),
        subtitle: subtitle.trim(),
        cta_label: ctaLabel.trim() || t('more_info'),
        cta_url: ctaUrl.trim(),
        position,
        is_active: false,
      });
      Alert.alert(t('ad_submitted_title'), t('ad_submitted_body'));
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, t('ad_create_failed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>➕ {t('new_ad')}</Text>
        </View>

        <View style={styles.card}>
          <FormField
            label={t('title_label')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('title_placeholder')}
          />
          <FormField
            label={t('subtitle_label')}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder={t('subtitle_placeholder')}
          />
          <FormField
            label={t('button_text_label')}
            value={ctaLabel}
            onChangeText={setCtaLabel}
            placeholder={t('more_info')}
          />
          <FormField
            label={t('target_url_label')}
            value={ctaUrl}
            onChangeText={setCtaUrl}
            placeholder={t('target_url_placeholder')}
            keyboardType="url"
          />

          <Text style={styles.fieldLabel}>{t('position')}</Text>
          <View style={styles.positionRow}>
            {POSITIONS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.positionChip, position === p.key && styles.positionChipActive]}
                onPress={() => setPosition(p.key)}
              >
                <Text style={[styles.positionChipText, position === p.key && styles.positionChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.positionHint}>
            {position === 'banner' && t('position_banner_hint')}
            {position === 'inline' && t('position_inline_hint')}
            {position === 'featured' && t('position_featured_hint')}
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color={theme.colors.surface} size="small" />
              : <Text style={styles.submitBtnText}>{t('submit_ad')}</Text>
            }
          </TouchableOpacity>

          <Text style={styles.formNote}>
            {t('ad_review_note')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

type TranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

const CATEGORIES: { key: string; emoji: string; labelKey: TranslationKey }[] = [
  { key: 'restaurants', emoji: '🍽️', labelKey: 'restaurants' },
  { key: 'cafes', emoji: '☕', labelKey: 'cafes' },
  { key: 'bars', emoji: '🍸', labelKey: 'bars' },
  { key: 'hotels', emoji: '🏨', labelKey: 'hotels' },
  { key: 'events', emoji: '🎪', labelKey: 'events' },
  { key: 'geschaefte', emoji: '🛍️', labelKey: 'geschaefte' },
  { key: 'sport', emoji: '🏊', labelKey: 'sport' },
  { key: 'kultur', emoji: '🎨', labelKey: 'kultur' },
];

// Positions use product/brand terms that stay the same across languages.
const POSITIONS: { key: AdPosition; label: string }[] = [
  { key: 'inline', label: 'Inline' },
  { key: 'banner', label: 'Banner' },
  { key: 'featured', label: 'Featured' },
];

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    paddingBottom: theme.spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    marginBottom: theme.spacing.sm,
  },
  backBtnText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  cardWarning: {
    borderWidth: 1.5,
    borderColor: theme.colors.secondary,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingNote: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 17,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subPlan: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subDetails: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  actionTile: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
    ...theme.shadow.small,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  adRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  adInfo: {
    flex: 1,
    gap: 3,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  adMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  adStatus: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  adStatusActive: {
    backgroundColor: '#dcfce7',
  },
  adStatusPending: {
    backgroundColor: '#f3f4f6',
  },
  adStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  invoiceInfo: {
    flex: 1,
    gap: 3,
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  invoiceMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  invoiceStatus: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  invoicePaid: {
    backgroundColor: '#dcfce7',
  },
  invoiceUnpaid: {
    backgroundColor: '#fee2e2',
  },
  invoiceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Plan selection
  planCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  planCardActive: {
    borderColor: theme.colors.primary,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginBottom: theme.spacing.sm,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.surface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  planPriceYear: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  planFeatures: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planFeatureCheck: {
    fontSize: 14,
    color: theme.colors.success,
    fontWeight: '700',
    width: 20,
  },
  planFeatureText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  planBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  planBtnDisabled: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  planBtnTextDisabled: {
    color: theme.colors.textMuted,
  },
  // Form fields
  formField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
  },
  catScroll: {
    flexGrow: 0,
    marginBottom: theme.spacing.xs,
  },
  catScrollInner: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  catChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  catChipTextActive: {
    color: theme.colors.surface,
  },
  positionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  positionChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  positionChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  positionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  positionChipTextActive: {
    color: theme.colors.surface,
  },
  positionHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: theme.colors.error,
    textAlign: 'center',
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
  formNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});

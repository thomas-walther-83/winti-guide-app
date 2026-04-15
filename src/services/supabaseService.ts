import { supabase } from '../config/supabase';
import type {
  Listing,
  Event,
  Ad,
  ListingCategory,
  EventCategory,
  PartnerAd,
  Partner,
  PartnerSubscription,
  PartnerInvoice,
  AppUser,
} from '../types';

// ── Listings ─────────────────────────────────────────────────────────────────

export async function fetchListings(options?: {
  category?: ListingCategory;
  search?: string;
}): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function fetchListingsWithCoords(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id, name, category, address, lat, lon')
    .eq('is_active', true)
    .not('lat', 'is', null)
    .not('lon', 'is', null);

  if (error) throw error;
  return (data ?? []) as Listing[];
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEvents(options?: {
  category?: EventCategory;
  from?: string;
}): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('is_active', true)
    .order('event_date');

  if (options?.category) {
    query = query.eq('cat', options.category);
  }

  if (options?.from) {
    query = query.gte('event_date', options.from);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Event[];
}

// ── Ads ──────────────────────────────────────────────────────────────────────

export async function fetchAds(): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []) as Ad[];
}

// ── Partner-Ads (öffentlich, für App-Nutzer) ─────────────────────────────────

export async function fetchPartnerAds(position?: string): Promise<PartnerAd[]> {
  let query = supabase
    .from('partner_ads')
    .select('*')
    .eq('is_active', true)
    .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString());

  if (position) {
    query = query.eq('position', position);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PartnerAd[];
}

/** Increment impression counter for a partner ad (fire-and-forget). */
export async function trackAdImpression(adId: string): Promise<void> {
  await supabase.rpc('increment_ad_impressions', { ad_id: adId });
}

/** Increment click counter for a partner ad (fire-and-forget). */
export async function trackAdClick(adId: string): Promise<void> {
  await supabase.rpc('increment_ad_clicks', { ad_id: adId });
}

// ── App-Nutzer ────────────────────────────────────────────────────────────────

export async function fetchAppUser(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as AppUser | null;
}

// ── Partner-Self-Service ──────────────────────────────────────────────────────

export async function fetchMyPartnerProfile(): Promise<Partner | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as Partner | null;
}

export async function createPartnerProfile(
  profile: Omit<Partner, 'id' | 'created_at' | 'updated_at'>,
): Promise<Partner> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Nicht eingeloggt');

  const { data, error } = await supabase
    .from('partners')
    .insert({ ...profile, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data as Partner;
}

export async function updatePartnerProfile(
  partnerId: string,
  updates: Partial<Partner>,
): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', partnerId);

  if (error) throw error;
}

export async function fetchMySubscriptions(partnerId: string): Promise<PartnerSubscription[]> {
  const { data, error } = await supabase
    .from('partner_subscriptions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PartnerSubscription[];
}

export async function fetchMyInvoices(partnerId: string): Promise<PartnerInvoice[]> {
  const { data, error } = await supabase
    .from('partner_invoices')
    .select('*')
    .eq('partner_id', partnerId)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PartnerInvoice[];
}

export async function fetchMyAds(partnerId: string): Promise<PartnerAd[]> {
  const { data, error } = await supabase
    .from('partner_ads')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PartnerAd[];
}

export async function createPartnerAd(
  ad: Omit<PartnerAd, 'id' | 'clicks' | 'impressions' | 'created_at' | 'updated_at'>,
): Promise<PartnerAd> {
  const { data, error } = await supabase
    .from('partner_ads')
    .insert({ ...ad, is_active: false }) // starts inactive, needs admin approval
    .select()
    .single();

  if (error) throw error;
  return data as PartnerAd;
}

export async function updatePartnerAd(
  adId: string,
  updates: Partial<PartnerAd>,
): Promise<void> {
  const { error } = await supabase
    .from('partner_ads')
    .update(updates)
    .eq('id', adId);

  if (error) throw error;
}

// ── Admin: Partner-Verwaltung (nur Service-Role / Admin) ─────────────────────

export async function adminFetchAllPartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function adminUpdatePartnerStatus(
  partnerId: string,
  status: Partner['status'],
): Promise<void> {
  const { error } = await supabase
    .from('partners')
    .update({ status })
    .eq('id', partnerId);

  if (error) throw error;
}

export async function adminFetchAllInvoices(): Promise<PartnerInvoice[]> {
  const { data, error } = await supabase
    .from('partner_invoices')
    .select('*, partners(company_name)')
    .order('due_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PartnerInvoice[];
}

export async function adminFetchAllPartnerAds(): Promise<PartnerAd[]> {
  const { data, error } = await supabase
    .from('partner_ads')
    .select('*, partners(company_name, status)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PartnerAd[];
}

export async function adminTogglePartnerAd(adId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('partner_ads')
    .update({ is_active: isActive })
    .eq('id', adId);

  if (error) throw error;
}

export async function adminMarkInvoicePaid(
  invoiceId: string,
  paidAt: string,
): Promise<void> {
  const { error } = await supabase
    .from('partner_invoices')
    .update({ status: 'paid', paid_at: paidAt })
    .eq('id', invoiceId);

  if (error) throw error;
}

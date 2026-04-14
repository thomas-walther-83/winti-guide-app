// ── App-Nutzer / Tier ────────────────────────────────────────────────────────

export type AppTier = 'free' | 'premium';

export interface AppUser {
  id: string;
  tier: AppTier;
  stripe_customer_id?: string;
  stripe_sub_id?: string;
  purchased_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── Partner ──────────────────────────────────────────────────────────────────

export type PartnerTier = 'starter' | 'pro' | 'premium';
export type PartnerStatus = 'pending' | 'active' | 'suspended';

export interface Partner {
  id: string;
  user_id?: string | null;
  company_name: string;
  category?: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  tier: PartnerTier;
  status: PartnerStatus;
  stripe_customer_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Partner-Abonnement ───────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'cancelled' | 'overdue' | 'trial';
export type BillingCycle = 'monthly' | 'yearly';

export interface PartnerSubscription {
  id: string;
  partner_id: string;
  plan: string;
  price_chf: number;
  billing_cycle: BillingCycle;
  starts_at: string;
  ends_at?: string | null;
  stripe_sub_id?: string;
  status: SubscriptionStatus;
  created_at?: string;
  updated_at?: string;
}

// ── Partner-Rechnung ─────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface PartnerInvoice {
  id: string;
  partner_id: string;
  subscription_id?: string | null;
  amount_chf: number;
  due_date: string;
  paid_at?: string | null;
  invoice_pdf_url?: string;
  stripe_invoice_id?: string;
  status: InvoiceStatus;
  created_at?: string;
  updated_at?: string;
}

// ── Partner-Anzeige ──────────────────────────────────────────────────────────

export type AdPosition = 'banner' | 'inline' | 'featured';

export interface PartnerAd {
  id: string;
  partner_id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  position: AdPosition;
  starts_at?: string;
  ends_at?: string | null;
  clicks?: number;
  impressions?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Partner-Pakete (statische Konfiguration) ─────────────────────────────────

export interface PartnerPlan {
  id: string;
  name: string;
  tier: PartnerTier;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

// ── Listing ──────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  source?: string;
  source_id?: string;
  category: ListingCategory;
  sub_type?: string;
  name: string;
  address?: string;
  hours?: string;
  phone?: string;
  website?: string;
  stars?: string;
  description?: string;
  lat?: number | null;
  lon?: number | null;
  partner_id?: string | null;
  is_premium?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  source?: string;
  source_id?: string;
  title: string;
  cat: EventCategory;
  location?: string;
  event_date: string;
  event_time?: string;
  price?: string;
  description?: string;
  url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Ad {
  id: string;
  title: string;
  subtitle?: string;
  cta_label?: string;
  cta_url?: string;
  position?: string;
  is_active?: boolean;
}

export type Language = 'de' | 'en' | 'fr' | 'it';

export type ListingCategory =
  | 'restaurants'
  | 'cafes'
  | 'bars'
  | 'hotels'
  | 'sightseeing'
  | 'kultur'
  | 'geschaefte'
  | 'sport'
  | 'touren';

export type EventCategory =
  | 'festival'
  | 'musik'
  | 'kultur'
  | 'markt'
  | 'theater'
  | 'tour'
  | 'kulinarik'
  | 'sport';

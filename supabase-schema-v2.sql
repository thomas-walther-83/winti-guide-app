-- ═══════════════════════════════════════════════════════════════════
-- Winti Guide – Supabase Schema V2 (Business-Modell Migration)
-- Neue Tabellen: partners, partner_subscriptions, partner_invoices,
--                partner_ads, app_users
-- Bestehende Tabellen: listings (partner_id FK hinzufügen)
-- ═══════════════════════════════════════════════════════════════════


-- ── Partner-Profile ──────────────────────────────────────────────────────────
create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  company_name  text not null,
  category      text default '',             -- restaurants | hotels | events | etc.
  contact_email text not null,
  contact_phone text default '',
  website       text default '',
  tier          text default 'starter',      -- starter | pro | premium
  status        text default 'pending',      -- pending | active | suspended
  stripe_customer_id text default '',        -- Stripe Customer ID
  notes         text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_partners_user_id on public.partners(user_id);
create index if not exists idx_partners_status  on public.partners(status);


-- ── Partner-Abonnements ───────────────────────────────────────────────────────
create table if not exists public.partner_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  plan             text not null,            -- starter_monthly | pro_monthly | premium_monthly | starter_yearly | …
  price_chf        numeric(10,2) not null,
  billing_cycle    text default 'monthly',   -- monthly | yearly
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  stripe_sub_id    text default '',          -- Stripe Subscription ID
  status           text default 'active',    -- active | cancelled | overdue | trial
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_partner_subs_partner_id on public.partner_subscriptions(partner_id);
create index if not exists idx_partner_subs_status     on public.partner_subscriptions(status);


-- ── Partner-Rechnungen ────────────────────────────────────────────────────────
create table if not exists public.partner_invoices (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  subscription_id  uuid references public.partner_subscriptions(id) on delete set null,
  amount_chf       numeric(10,2) not null,
  due_date         date not null,
  paid_at          timestamptz,
  invoice_pdf_url  text default '',
  stripe_invoice_id text default '',         -- Stripe Invoice ID
  status           text default 'draft',     -- draft | sent | paid | overdue | void
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_partner_inv_partner_id on public.partner_invoices(partner_id);
create index if not exists idx_partner_inv_status     on public.partner_invoices(status);
create index if not exists idx_partner_inv_due        on public.partner_invoices(due_date);


-- ── Partner-Anzeigen ─────────────────────────────────────────────────────────
create table if not exists public.partner_ads (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.partners(id) on delete cascade,
  title          text not null,
  subtitle       text default '',
  image_url      text default '',
  cta_label      text default 'Mehr erfahren',
  cta_url        text default '',
  position       text default 'inline',      -- banner | inline | featured
  starts_at      timestamptz default now(),
  ends_at        timestamptz,                -- NULL = läuft bis Abo endet
  clicks         integer default 0,
  impressions    integer default 0,
  is_active      boolean default false,      -- muss vom Admin freigegeben werden
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists idx_partner_ads_partner_id on public.partner_ads(partner_id);
create index if not exists idx_partner_ads_active     on public.partner_ads(is_active);
create index if not exists idx_partner_ads_position   on public.partner_ads(position);


-- ── App-Nutzer (Tier-Verwaltung) ─────────────────────────────────────────────
create table if not exists public.app_users (
  id              uuid primary key references auth.users(id) on delete cascade,
  tier            text default 'free',        -- free | premium
  stripe_customer_id text default '',
  stripe_sub_id   text default '',
  purchased_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_app_users_tier on public.app_users(tier);


-- ── Listings: partner_id FK hinzufügen ───────────────────────────────────────
alter table public.listings
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create index if not exists idx_listings_partner_id on public.listings(partner_id);


-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

alter table public.partners             enable row level security;
alter table public.partner_subscriptions enable row level security;
alter table public.partner_invoices     enable row level security;
alter table public.partner_ads          enable row level security;
alter table public.app_users            enable row level security;

-- ── app_users: Nutzer liest/schreibt nur eigene Zeile ────────────────────────
create policy "app_users: own read"
  on public.app_users for select
  using (auth.uid() = id);

create policy "app_users: own insert"
  on public.app_users for insert
  with check (auth.uid() = id);

create policy "app_users: own update"
  on public.app_users for update
  using (auth.uid() = id);

create policy "app_users: service full"
  on public.app_users for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ── partner_ads: öffentlich lesen wenn aktiv & Abo aktiv ─────────────────────
create policy "partner_ads: public read active"
  on public.partner_ads for select
  using (
    is_active = true
    and (ends_at is null or ends_at > now())
  );

create policy "partner_ads: partner own write"
  on public.partner_ads for all
  using (
    partner_id in (
      select id from public.partners where user_id = auth.uid()
    )
  );

create policy "partner_ads: service full"
  on public.partner_ads for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ── partners: Partner liest/schreibt eigenes Profil ──────────────────────────
create policy "partners: own read"
  on public.partners for select
  using (user_id = auth.uid());

create policy "partners: own insert"
  on public.partners for insert
  with check (user_id = auth.uid());

create policy "partners: own update"
  on public.partners for update
  using (user_id = auth.uid());

create policy "partners: service full"
  on public.partners for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ── partner_subscriptions: Partner liest eigene Abos ────────────────────────
create policy "partner_subs: own read"
  on public.partner_subscriptions for select
  using (
    partner_id in (
      select id from public.partners where user_id = auth.uid()
    )
  );

create policy "partner_subs: service full"
  on public.partner_subscriptions for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ── partner_invoices: Partner liest eigene Rechnungen ────────────────────────
create policy "partner_inv: own read"
  on public.partner_invoices for select
  using (
    partner_id in (
      select id from public.partners where user_id = auth.uid()
    )
  );

create policy "partner_inv: service full"
  on public.partner_invoices for all
  using (auth.jwt() ->> 'role' = 'service_role');


-- ═══════════════════════════════════════════════════════════════════
-- Auto-Update Timestamps
-- ═══════════════════════════════════════════════════════════════════

drop trigger if exists trg_partners_updated             on public.partners;
drop trigger if exists trg_partner_subs_updated         on public.partner_subscriptions;
drop trigger if exists trg_partner_inv_updated          on public.partner_invoices;
drop trigger if exists trg_partner_ads_updated          on public.partner_ads;
drop trigger if exists trg_app_users_updated            on public.app_users;

create trigger trg_partners_updated
  before update on public.partners
  for each row execute function update_updated_at();

create trigger trg_partner_subs_updated
  before update on public.partner_subscriptions
  for each row execute function update_updated_at();

create trigger trg_partner_inv_updated
  before update on public.partner_invoices
  for each row execute function update_updated_at();

create trigger trg_partner_ads_updated
  before update on public.partner_ads
  for each row execute function update_updated_at();

create trigger trg_app_users_updated
  before update on public.app_users
  for each row execute function update_updated_at();


-- ═══════════════════════════════════════════════════════════════════
-- Hilfreiche Views
-- ═══════════════════════════════════════════════════════════════════

-- Aktive Partner-Anzeigen mit Partner-Info (für Admin-Panel)
create or replace view public.partner_ads_with_partner as
select
  pa.*,
  p.company_name,
  p.tier        as partner_tier,
  p.status      as partner_status
from public.partner_ads pa
join public.partners p on p.id = pa.partner_id;

-- Partner mit Abo-Status (für Admin-Panel)
create or replace view public.partners_with_subscription as
select
  p.*,
  ps.plan,
  ps.price_chf,
  ps.billing_cycle,
  ps.starts_at  as sub_starts,
  ps.ends_at    as sub_ends,
  ps.status     as sub_status
from public.partners p
left join public.partner_subscriptions ps
  on ps.partner_id = p.id
  and ps.status = 'active'
order by p.created_at desc;


-- ═══════════════════════════════════════════════════════════════════
-- Stripe Webhook Helper Funktion (aufgerufen durch Edge Function)
-- ═══════════════════════════════════════════════════════════════════

-- Setzt app_users.tier auf 'premium' nach erfolgreicher Zahlung
create or replace function public.activate_app_premium(
  p_user_id      uuid,
  p_stripe_sub   text,
  p_expires_at   timestamptz default null
)
returns void language plpgsql security definer as $$
begin
  insert into public.app_users (id, tier, stripe_sub_id, purchased_at, expires_at)
  values (p_user_id, 'premium', p_stripe_sub, now(), p_expires_at)
  on conflict (id) do update
    set tier          = 'premium',
        stripe_sub_id = p_stripe_sub,
        purchased_at  = now(),
        expires_at    = p_expires_at,
        updated_at    = now();
end;
$$;

-- Setzt app_users.tier auf 'free' nach Kündigung / Ablauf
create or replace function public.deactivate_app_premium(p_stripe_sub text)
returns void language plpgsql security definer as $$
begin
  update public.app_users
  set tier       = 'free',
      expires_at = now(),
      updated_at = now()
  where stripe_sub_id = p_stripe_sub;
end;
$$;

-- Aktualisiert Partner-Subscription nach Stripe-Invoice-Event
create or replace function public.record_partner_payment(
  p_stripe_inv_id  text,
  p_partner_id     uuid,
  p_amount_chf     numeric,
  p_paid_at        timestamptz
)
returns void language plpgsql security definer as $$
begin
  update public.partner_invoices
  set status    = 'paid',
      paid_at   = p_paid_at,
      updated_at = now()
  where stripe_invoice_id = p_stripe_inv_id;

  -- Partner auf 'active' setzen falls er noch 'pending' war
  update public.partners
  set status     = 'active',
      updated_at = now()
  where id = p_partner_id
    and status = 'pending';
end;
$$;


-- ═══════════════════════════════════════════════════════════════════
-- Beispieldaten
-- ═══════════════════════════════════════════════════════════════════

-- Beispiel-Partner (für Entwicklung/Testing – ohne echte auth.users Verknüpfung)
insert into public.partners (company_name, category, contact_email, tier, status)
values
  ('Restaurant Neumarkt',   'restaurants', 'info@restaurant-neumarkt.ch', 'pro',     'active'),
  ('Hotel Wartmann',        'hotels',      'info@wartmann.ch',            'premium', 'active'),
  ('Kraftfeld Bar',         'bars',        'info@kraftfeld.net',          'starter', 'pending')
on conflict do nothing;

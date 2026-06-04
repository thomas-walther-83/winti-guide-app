-- ═══════════════════════════════════════════════════════════════════
-- Migration: Featured-Listings für „Empfohlen für dich"
-- Idempotent. Wird vom Workflow .github/workflows/db-migrate.yml ausgeführt.
--
-- Admin setzt is_featured + optional featured_until im Admin-Screen;
-- HomeScreen hebt diese Listings in der „Empfohlen für dich"-Reihe nach vorne.
-- ═══════════════════════════════════════════════════════════════════

alter table public.listings
  add column if not exists is_featured boolean not null default false;

alter table public.listings
  add column if not exists featured_until timestamptz;

create index if not exists idx_listings_featured
  on public.listings(is_featured) where is_featured = true;

-- ── RLS: Admin darf is_featured/featured_until ändern ────────────────
-- Listings sind sonst global lesbar (öffentlicher Katalog), Anlage/
-- Pflege läuft via Importer mit Service-Role. Admin-UPDATE-Policy ist
-- neu und unabhängig vom Importer (der mit Service-Role RLS umgeht).
drop policy if exists listings_admin_update on public.listings;
create policy listings_admin_update on public.listings
  for update using (public.is_admin()) with check (public.is_admin());

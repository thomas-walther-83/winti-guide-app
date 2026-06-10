-- ═══════════════════════════════════════════════════════════════════
-- Migration: is_admin() härten — Case-insensitiver E-Mail-Vergleich
--
-- Der JWT-email-Claim folgt der Schreibweise bei der Registrierung.
-- Ein exakter Vergleich könnte einen legitimen Admin aussperren
-- (oder bei abweichender Normalisierung zu Verwechslungen führen).
-- lower() auf beiden Seiten macht den Vergleich robust.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    lower((auth.jwt() ->> 'email')::text) = any(array[
      'twwinterthur@gmail.com'
    ]),
    false
  );
$$;

-- ═══════════════════════════════════════════════════════════════════
-- Migration: AI-Guide Conversation Log + User Opt-Out (idempotent)
-- Speichert Q&A für Qualitätskontrolle und Prompt-Iteration.
-- Opt-out pro Nutzer in app_users.ai_logging_opt_out.
-- ═══════════════════════════════════════════════════════════════════

-- ── Opt-out-Flag auf app_users ──────────────────────────────────────
alter table public.app_users
  add column if not exists ai_logging_opt_out boolean not null default false;

-- ── Konversations-Log ───────────────────────────────────────────────
create table if not exists public.ai_conversations (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  user_id             uuid references auth.users(id) on delete set null,
  session_id          text,                       -- vom Client erzeugt, gruppiert Turns
  question            text not null,
  answer              text not null,
  model               text not null,
  locale              text,                       -- 'de' | 'en' | 'fr' | 'it'
  latency_ms          integer,
  listings_used       jsonb not null default '[]'::jsonb,  -- array of listing ids
  events_used         jsonb not null default '[]'::jsonb,  -- array of event ids
  used_geo            boolean not null default false,
  off_topic_blocked   boolean not null default false,
  unknown_names_count integer not null default 0  -- post-hoc Halluzinations-Detektor
);

create index if not exists idx_ai_conversations_user
  on public.ai_conversations(user_id, created_at desc);
create index if not exists idx_ai_conversations_session
  on public.ai_conversations(session_id);
create index if not exists idx_ai_conversations_created
  on public.ai_conversations(created_at desc);

alter table public.ai_conversations enable row level security;

-- Nutzer dürfen nur die eigenen Conversations lesen.
drop policy if exists "ai_conversations: own read" on public.ai_conversations;
create policy "ai_conversations: own read"
  on public.ai_conversations for select
  using (auth.uid() = user_id);

-- Admins (per is_admin() Funktion) dürfen alles lesen — für QA & Prompt-Tuning.
drop policy if exists "ai_conversations: admin read" on public.ai_conversations;
create policy "ai_conversations: admin read"
  on public.ai_conversations for select
  using (public.is_admin());

-- Inserts laufen ausschliesslich über die Edge Function mit service_role —
-- kein Client darf direkt schreiben.
drop policy if exists "ai_conversations: service insert" on public.ai_conversations;
create policy "ai_conversations: service insert"
  on public.ai_conversations for insert
  with check (auth.jwt() ->> 'role' = 'service_role');

// Supabase Edge Function: ai-guide
//
// Server-seitiger LLM-Endpunkt für den "Thomas"-Reiseführer-Chat.
// Schlüssel bleibt im Server-Env (Supabase Secrets) → nicht im Client-Bundle.
//
// Provider: Groq (https://console.groq.com). Free-Tier, kein Auto-Billing —
// bei Erreichen des Rate-Limits werden Requests abgewiesen, es entstehen
// niemals Kosten ohne aktive Plan-Wahl im Groq-Dashboard.
//
// Setup:
//   1. Bei https://console.groq.com einen kostenlosen Account anlegen.
//   2. Unter "API Keys" einen Key erzeugen.
//   3. Als Supabase-Secret hinterlegen:
//        supabase secrets set GROQ_API_KEY=gsk_…
//   4. Funktion deployen:
//        supabase functions deploy ai-guide --no-verify-jwt
//
// Bei fehlendem Key antwortet die Funktion mit `provider_unavailable`,
// der Client fällt dann auf die lokalen Template-Antworten zurück.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Groq Free-Tier: Llama-3.3-70B ist sehr stark in Deutsch, ~500 tok/s,
// aktuelles Rate-Limit ~14k tok/min. Reicht für sehr viele User parallel.
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Antwort-Länge knapp halten — billiger, schneller, passt zum Use Case.
const MAX_TOKENS = 320;
const TEMPERATURE = 0.6;

// Per-IP-Budget: hartes Cap, damit auch bei Missbrauch das Groq-Free-Tier
// nicht in Sekunden leer ist. 30 Anfragen / Stunde / IP.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_PER_IP = 30;
const ipHits: Map<string, number[]> = new Map();

const ALLOWED_CATEGORIES = [
  'restaurants', 'cafes', 'bars', 'hotels', 'sightseeing', 'kultur',
  'geschaefte', 'sport',
] as const;
type Category = typeof ALLOWED_CATEGORIES[number];

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: Category }> = [
  { keywords: ['restaurant', 'essen', 'speisen', 'pizza', 'italienisch', 'sushi', 'küche', 'mittag', 'abendessen', 'lunch', 'dinner'], category: 'restaurants' },
  { keywords: ['café', 'cafe', 'kaffee', 'frühstück', 'brunch'], category: 'cafes' },
  { keywords: ['bar', 'nacht', 'cocktail', 'ausgehen', 'feiern', 'club', 'drink'], category: 'bars' },
  { keywords: ['hotel', 'übernacht', 'unterkunft', 'schlafen', 'hostel'], category: 'hotels' },
  { keywords: ['sehenswürdigkeit', 'museum', 'highlight', 'besichtigen', 'altstadt', 'park'], category: 'sightseeing' },
  { keywords: ['theater', 'konzert', 'musik', 'oper', 'kabarett'], category: 'kultur' },
  { keywords: ['einkauf', 'shop', 'laden', 'boutique', 'markt'], category: 'geschaefte' },
  { keywords: ['sport', 'fitness', 'schwimm', 'training', 'wandern', 'bike'], category: 'sport' },
];

function detectCategory(q: string): Category | undefined {
  const lower = q.toLowerCase();
  return CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((kw) => lower.includes(kw)))?.category;
}

interface ListingRow {
  name: string;
  sub_type?: string | null;
  address?: string | null;
  hours?: string | null;
  description?: string | null;
  stars?: string | null;
  tags?: string[] | null;
  is_premium?: boolean | null;
}

interface EventRow {
  title: string;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  cat?: string | null;
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchListings(category: Category | undefined): Promise<ListingRow[]> {
  let q = sb
    .from('listings')
    .select('name, sub_type, address, hours, description, stars, tags, is_premium')
    .eq('is_active', true)
    .limit(category ? 40 : 60);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as ListingRow[];
}

async function fetchUpcomingEvents(): Promise<EventRow[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await sb
    .from('events')
    .select('title, event_date, event_time, location, cat')
    .eq('is_active', true)
    .gte('event_date', today)
    .order('event_date')
    .limit(30);
  if (error || !data) return [];
  return data as EventRow[];
}

function formatListing(l: ListingRow): string {
  const parts = [l.name];
  if (l.sub_type) parts.push(`(${l.sub_type})`);
  if (l.stars) parts.push(`⭐ ${l.stars}`);
  if (l.address) parts.push(`– ${l.address}`);
  if (l.hours) parts.push(`| ${l.hours}`);
  if (l.tags && l.tags.length) parts.push(`| #${l.tags.slice(0, 4).join(' #')}`);
  if (l.description) parts.push(`| ${(l.description || '').slice(0, 140)}`);
  return parts.join(' ');
}

function formatEvent(e: EventRow): string {
  const date = e.event_date + (e.event_time ? ` ${e.event_time}` : '');
  const loc = e.location ? ` @ ${e.location}` : '';
  const cat = e.cat ? ` [${e.cat}]` : '';
  return `${date}${cat}: ${e.title}${loc}`;
}

const SYSTEM_PROMPT_BASE = `Du bist Thomas, ein freundlicher und ortskundiger lokaler Reiseführer für Winterthur (Winti), Schweiz.
Du hilfst Besuchern und Einwohnern dabei, die besten Restaurants, Cafés, Bars, Hotels, Sehenswürdigkeiten,
kulturellen Highlights, lokale Veranstaltungen, Ausflugsziele und Geheimtipps in und um Winterthur zu entdecken.

REGELN:
- Gib konkrete, hilfreiche Empfehlungen mit echten Namen und Adressen ausschliesslich aus der Liste unten.
- Erfinde NIEMALS Orte, Events oder Adressen, die nicht in der Liste stehen.
- Bevorzuge Treffer mit höherer Sternebewertung; bei Events sortiere nach Datum.
- Antworte immer auf Deutsch (oder der Sprache der Frage), max. 3–5 Sätze, locker und persönlich.
- Erwähne 1–3 konkrete Namen pro Antwort, nicht mehr.
- Wenn nichts in der Liste passt: ehrlich sagen, dass du gerade keinen passenden Tipp hast, und nach mehr Kontext fragen.

THEMENBESCHRÄNKUNG:
Beantworte nur Reise-/Freizeit-/Stadt-Fragen rund um Winterthur. Bei off-topic Fragen
(Programmierung, Politik, Mathe, Tech-Support für diese App, usw.): freundlich ablehnen mit
"Als Reiseführer Thomas kann ich dir bei diesem Thema leider nicht helfen. Ich beantworte gerne
Fragen rund um Winterthur, Ausflugsziele, Restaurants, Sehenswürdigkeiten und alles, was deinen
Aufenthalt unvergesslich macht. 😊"`;

function buildSystemPrompt(listings: ListingRow[], events: EventRow[]): string {
  const sections: string[] = [SYSTEM_PROMPT_BASE];

  const partners = listings.filter((l) => l.is_premium);
  const regular = listings
    .filter((l) => !l.is_premium)
    .sort((a, b) => (parseFloat(b.stars ?? '0') || 0) - (parseFloat(a.stars ?? '0') || 0));

  if (regular.length) {
    sections.push(
      `HOCH BEWERTETE ORTE (nutze diese für Empfehlungen, sortiert nach Bewertung):\n${regular.map(formatListing).join('\n')}`,
    );
  }
  if (partners.length) {
    sections.push(
      `PARTNER-EMPFEHLUNGEN (bezahlte Werbepartner — nur empfehlen, wenn sie wirklich passen, IMMER als "Partner" kennzeichnen):\n${partners.map(formatListing).join('\n')}`,
    );
  }
  if (events.length) {
    sections.push(
      `KOMMENDE EVENTS (chronologisch, nutze diese für "was läuft am Wochenende"-Fragen):\n${events.map(formatEvent).join('\n')}`,
    );
  }
  return sections.join('\n\n');
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length <= RATE_LIMIT_PER_IP;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface RequestBody {
  question?: unknown;
  history?: unknown;
}

function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is ChatMessage =>
      m !== null &&
      typeof m === 'object' &&
      ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
      typeof (m as { text?: unknown }).text === 'string',
    )
    .slice(-8) // letzte 8 Turns reichen — hält Kosten und Latenz niedrig
    .map((m) => ({ role: m.role, text: m.text.slice(0, 1000) }));
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRate(ip)) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Zu viele Anfragen, bitte später erneut versuchen.' }),
      { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 1000) : '';
  if (!question) {
    return new Response(JSON.stringify({ error: 'missing_question' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  const history = sanitizeHistory(body.history);

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'provider_unavailable', message: 'AI-Provider nicht konfiguriert.' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  const category = detectCategory(question);
  const [listings, events] = await Promise.all([
    fetchListings(category),
    // Events nur ziehen, wenn die Frage relevant ist — spart Tokens.
    /event|veranstaltung|wochenende|konzert|festival|programm|los/i.test(question)
      ? fetchUpcomingEvents()
      : Promise.resolve([] as EventRow[]),
  ]);

  const messages = [
    { role: 'system', content: buildSystemPrompt(listings, events) },
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: question },
  ];

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error', groqRes.status, errText);
      return new Response(
        JSON.stringify({
          error: 'provider_error',
          status: groqRes.status,
          message: groqRes.status === 429
            ? 'AI ist gerade überlastet, bitte gleich nochmal versuchen.'
            : 'AI-Dienst nicht erreichbar.',
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const json = await groqRes.json();
    const answer = json?.choices?.[0]?.message?.content?.trim() ?? '';
    return new Response(
      JSON.stringify({ answer, model: GROQ_MODEL, listings_count: listings.length, events_count: events.length }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge function exception', err);
    return new Response(JSON.stringify({ error: 'exception' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

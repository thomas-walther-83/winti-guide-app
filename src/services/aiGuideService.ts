import { supabase } from '../config/supabase';
import type { ListingCategory } from '../types';

// Der LLM-Call läuft serverseitig in einer Supabase Edge Function
// (`supabase/functions/ai-guide`). API-Key bleibt im Server-Env, niemals
// im Client-Bundle. Bei fehlender oder fehlerhafter Server-Antwort fällt
// dieser Client automatisch auf die lokale Template-Antwort zurück.

// URL + öffentlicher Key — gleiche Defaults wie config/supabase.ts.
// Hier direkt referenziert für den fetch()-Pfad, der das supabase-js
// functions.invoke umgeht (vermeidet kumulative Memory-Last auf iOS-PWA).
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dphhqwisluirihmahyee.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_-VhbMGsUIHDW_Z0U4v9iQw_qw0xiSTf';

const CATEGORY_LISTINGS_LIMIT = 40;
const ALL_LISTINGS_LIMIT = 60;

const OFF_TOPIC_REPLY =
  'Als Reiseführer Thomas kann ich dir bei diesem Thema leider nicht helfen. Ich beantworte gerne Fragen rund um Winterthur, Ausflugsziele, Restaurants, Sehenswürdigkeiten und alles, was deinen Aufenthalt unvergesslich macht. 😊';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Zusätzlicher Kontext, den Aufrufer (z.B. AiGuideCard) durchreichen können. */
export interface AiGuideContext {
  /** ISO-639-1 Sprachcode, z.B. 'de' | 'en' | 'fr' | 'it'. Default 'de'. */
  locale?: string;
  /** Letzte bekannte Position, wenn der Nutzer Standort freigegeben hat. */
  userLat?: number;
  userLon?: number;
  /** Gruppiert Q&A einer Chat-Session — clientseitig erzeugt. */
  sessionId?: string;
}

/** Session-ID lebt für die Lebensdauer des JS-Kontexts (= eine App-Sitzung). */
const SESSION_ID = (() => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
})();

export function getAiGuideSessionId(): string {
  return SESSION_ID;
}

// User-ID einmal pro Session cachen. Vorher rief jeder Chat-Turn
// supabase.auth.getUser() auf, was einen Server-Roundtrip kostet und
// auf iOS-PWA über mehrere Turns die WebView-Lebenszeit unter Druck
// setzen kann (Memory + Network-Handles akkumulieren).
let cachedUserId: string | null | undefined = undefined;
async function getCachedUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data?.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
}

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: ListingCategory }> = [
  { keywords: ['restaurant', 'essen', 'speisen', 'pizza', 'italienisch', 'sushi', 'küche', 'mittag', 'abendessen'], category: 'restaurants' },
  { keywords: ['café', 'cafe', 'kaffee', 'frühstück'], category: 'cafes' },
  { keywords: ['bar', 'nacht', 'cocktail', 'ausgehen', 'feiern', 'club'], category: 'bars' },
  { keywords: ['hotel', 'übernacht', 'unterkunft', 'schlafen'], category: 'hotels' },
  { keywords: ['sehenswürdigkeit', 'sehen', 'museum', 'highlight', 'attraction', 'besichtigen'], category: 'sightseeing' },
  { keywords: ['kultur', 'theater', 'konzert', 'musik'], category: 'kultur' },
  { keywords: ['einkauf', 'shop', 'laden', 'boutique'], category: 'geschaefte' },
  { keywords: ['sport', 'fitness', 'schwimm', 'training'], category: 'sport' },
];

function detectCategory(question: string): ListingCategory | undefined {
  const q = question.toLowerCase();
  return CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((kw) => q.includes(kw)))?.category;
}

interface ListingRow {
  name: string;
  sub_type?: string;
  address?: string;
  hours?: string;
  description?: string;
  stars?: string;
  is_premium?: boolean;
}

interface ListingsContext {
  regular: string;
  partners: string;
}

const STAR_RATING_SUFFIX_RE = /\s*⭐\s*[\d.]+\s*$/;
function formatRow(l: ListingRow): string {
  const parts: string[] = [l.name];
  if (l.sub_type) parts.push(`(${l.sub_type})`);
  if (l.stars) parts.push(`⭐ ${l.stars}`);
  if (l.address) parts.push(`– ${l.address}`);
  if (l.hours) parts.push(`| Öffnungszeiten: ${l.hours}`);
  if (l.description) parts.push(`| ${l.description}`);
  return parts.join(' ');
}

async function fetchListingsContext(category?: ListingCategory): Promise<ListingsContext> {
  try {
    let query = supabase
      .from('listings')
      .select('name, sub_type, address, hours, description, stars, is_premium')
      .eq('is_active', true)
      .limit(category ? CATEGORY_LISTINGS_LIMIT : ALL_LISTINGS_LIMIT);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return { regular: '', partners: '' };

    const rows = data as ListingRow[];
    const partners = rows.filter((r) => r.is_premium);
    const regular = rows
      .filter((r) => !r.is_premium)
      .sort((a, b) => {
        const sa = parseFloat(a.stars ?? '') || 0;
        const sb = parseFloat(b.stars ?? '') || 0;
        if (sb !== sa) return sb - sa;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });

    return {
      regular: regular.map(formatRow).join('\n'),
      partners: partners.map(formatRow).join('\n'),
    };
  } catch {
    return { regular: '', partners: '' };
  }
}

/** Fragt die ai-guide Edge Function via direktes fetch. Wirft bei Provider-Fehler. */
async function askEdgeFunction(
  question: string,
  history: ChatMessage[],
  ctx?: AiGuideContext,
): Promise<string | null> {
  // user_id kommt aus der Auth-Session, damit der Server Favoriten holen
  // und (mit Opt-out-Check) die Konversation loggen kann.
  const userId = await getCachedUserId();

  // WICHTIG: kein supabase.functions.invoke — der SDK-Wrapper hat in der
  // Vergangenheit auf iOS-PWA Response-Objekte länger gehalten, was über
  // mehrere Turns kumulativ die WebView-Memory drückte. Direktes fetch
  // gibt uns volle Kontrolle: Body sofort lesen, JSON parsen, fertig.
  const url = `${SUPABASE_URL}/functions/v1/ai-guide`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        question,
        history,
        locale: ctx?.locale ?? 'de',
        session_id: ctx?.sessionId ?? SESSION_ID,
        user_id: userId,
        user_lat: ctx?.userLat,
        user_lon: ctx?.userLon,
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return null; // Netzwerk-Fehler / Abort → Fallback
  }
  clearTimeout(timeoutId);

  if (response.status === 429) {
    throw new Error(
      'Der AI-Guide ist gerade überlastet. Bitte versuche es in ein paar Minuten erneut.',
    );
  }
  if (!response.ok) {
    return null; // 5xx / 503 → Fallback
  }

  // Body komplett lesen und dann sofort verwerfen — wichtig, damit iOS
  // den Response-Stream nicht in einem Puffer hält.
  const text = await response.text();
  let data: { answer?: unknown } | null = null;
  try {
    data = JSON.parse(text) as { answer?: unknown };
  } catch {
    return null;
  }
  const ans = String(data?.answer ?? '').trim();
  // Control-Chars entfernen (außer \n \t) — Schutz gegen iOS-WebKit
  // Render-Bugs mit exotischen Steuerzeichen aus dem LLM-Output.
  // Control-Chars 0x00-0x1F (ausser \n und \t) sowie 0x7F entfernen.
  const ctrlRe = new RegExp("[\u0000-\u0008\u000B-\u001F\u007F]", "g");
  const clean = ans.replace(ctrlRe, '');
  return clean || null;
}

/** Öffentliche API: stellt die Frage an Thomas. */
export async function askAiGuide(
  question: string,
  history: ChatMessage[] = [],
  ctx?: AiGuideContext,
): Promise<string> {
  // Lokaler Off-Topic-Filter, damit auch ohne Server-Roundtrip eine
  // saubere Ablehnung kommt (spart Tokens, schnellere UX).
  if (isObviouslyOffTopic(question)) {
    return OFF_TOPIC_REPLY;
  }

  try {
    const remote = await askEdgeFunction(question, history, ctx);
    if (remote) return remote;
  } catch (err) {
    // Echte Fehler (Rate-Limit etc.) weiterreichen, Soft-Fail (return null)
    // landet im lokalen Fallback.
    if (err instanceof Error) throw err;
  }

  // Fallback: lokale Template-Antwort mit DB-Listing.
  const category = detectCategory(question);
  const listingsCtx = await fetchListingsContext(category);
  return getOfflineResponse(question, listingsCtx);
}

function isObviouslyOffTopic(question: string): boolean {
  const q = question.toLowerCase();
  const offTopicKeywords = [
    'app', 'code', 'programmier', 'software', 'bug', 'fehler im', 'github',
    'javascript', 'typescript', 'react', 'datenbank', 'api', 'server',
    'politik', 'mathematik', 'formel', 'gleichung', 'physik', 'chemie',
    'wie funktioniert diese', 'wie ist die app', 'was kann die app',
  ];
  return offTopicKeywords.some((kw) => q.includes(kw));
}

function buildListingsResponse(ctx: ListingsContext, categoryLabel: string): string {
  const source = ctx.regular || ctx.partners;
  if (!source) return '';
  const lines = source.split('\n').filter(Boolean);
  if (lines.length === 0) return '';
  const top = lines.slice(0, 3).map((l) => {
    const beforeMeta = l.split('|')[0].trim();
    const beforeAddress = beforeMeta.split('–')[0].trim();
    return beforeAddress.replace(STAR_RATING_SUFFIX_RE, '').trim() || beforeAddress;
  });
  return `Hier sind einige empfehlenswerte ${categoryLabel} in Winterthur: ${top.join('; ')}. Schau dir die vollständige Liste in der App an!`;
}

/** Fallback-Antworten ohne Server. Nutzt echte Listings aus der DB. */
function getOfflineResponse(question: string, ctx: ListingsContext): string {
  const q = question.toLowerCase();

  if (q.includes('name') || q.includes('wer bist') || q.includes('wer du')) {
    return 'Ich bin Thomas, dein persönlicher Reiseführer für Winterthur! Ich helfe dir dabei, die schönsten Ecken der Stadt zu entdecken – von der Altstadt bis zu versteckten Geheimtipps. 😊';
  }
  if (q.includes('ankommen') || q.includes('angekommen') || q.includes('neu')) {
    return 'Willkommen in Winterthur! 🎉 Ich bin Thomas, dein lokaler Guide. Starte am besten mit einem Spaziergang durch die Altstadt rund um den Stadtgarten, gönn dir einen Kaffee an der Marktgasse und schau dir danach das Kunstmuseum an – eines der bedeutendsten in der Schweiz.';
  }
  if (q.includes('highlight') || q.includes('sehenswürdigkeit') || q.includes('sehen') || q.includes('museum')) {
    return buildListingsResponse(ctx, 'Sehenswürdigkeiten') ||
      'Die Top-Highlights in Winterthur sind das Kunstmuseum und die Fotostiftung Schweiz, das historische Schloss Kyburg, der Stadtgarten, die Altstadt mit ihren Lauben sowie das Technorama für Familien.';
  }
  if (q.includes('essen') || q.includes('restaurant') || q.includes('speisen') ||
      q.includes('pizza') || q.includes('italienisch') || q.includes('küche')) {
    return buildListingsResponse(ctx, 'Restaurants') ||
      'Winterthur bietet eine tolle Gastronomie! In der Altstadt findest du viele Restaurants – von traditioneller Schweizer Küche bis hin zu internationalen Spezialitäten.';
  }
  if (q.includes('café') || q.includes('cafe') || q.includes('kaffee')) {
    return buildListingsResponse(ctx, 'Cafés') ||
      'Für einen guten Kaffee empfehle ich die Cafés rund um die Marktgasse und den Stadtgarten.';
  }
  if (q.includes('nacht') || q.includes('bar') || q.includes('abend') || q.includes('ausgehen')) {
    return buildListingsResponse(ctx, 'Bars') ||
      'Das Winterthurer Nachtleben konzentriert sich rund um die Altstadt und den Neumarkt. Zahlreiche Bars und Clubs bieten ein abwechslungsreiches Programm.';
  }
  if (q.includes('hotel') || q.includes('übernacht') || q.includes('unterkunft')) {
    return buildListingsResponse(ctx, 'Hotels') ||
      'Winterthur bietet verschiedene Übernachtungsmöglichkeiten – von gemütlichen Boutique-Hotels bis zu komfortablen Stadthotels.';
  }
  return buildListingsResponse(ctx, 'Orte') ||
    'Winterthur hat viel zu bieten! Erkunde die Altstadt, besuche eines der rund 20 Museen oder genieße die lokale Gastronomie. Hast du eine konkretere Frage? Ich, Thomas, helfe dir gerne weiter. 😊';
}

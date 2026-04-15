import { supabase } from '../config/supabase';
import type { ListingCategory } from '../types';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const CATEGORY_LISTINGS_LIMIT = 40;
const ALL_LISTINGS_LIMIT = 60;

const SYSTEM_PROMPT_BASE = `Du bist Thomas, ein freundlicher und ortskundiger lokaler Reiseführer für Winterthur (Winti), Schweiz. \
Du hilfst Besuchern und Einwohnern dabei, die besten Restaurants, Cafés, Bars, Hotels, Sehenswürdigkeiten, \
kulturellen Highlights, lokale Veranstaltungen, Ausflugsziele und Geheimtipps in und um Winterthur zu entdecken. \
Gib konkrete, hilfreiche Empfehlungen mit echten Namen und Adressen aus der Liste unten wie ein echter Stadtführer. \
Antworte immer auf Deutsch und halte deine Antworten kurz und prägnant (max. 3–4 Sätze). \
Dein Name ist Thomas. Stelle dich als Thomas vor, wenn du nach deinem Namen gefragt wirst. \
\n\
WICHTIG – Themeneinschränkung: Du beantwortest ausschliesslich Fragen, die ein lokaler Reiseführer beantworten würde: \
Sehenswürdigkeiten, Restaurants, Bars, Cafés, Hotels, Ausflugsziele, Veranstaltungen, öffentlicher Verkehr, \
Einkaufen, lokale Kultur, Geschichte von Winterthur, Wettertipps für Ausflüge und ähnliche Reise- und Freizeitthemen. \
Wenn jemand eine Frage stellt, die nichts mit Reisen, Freizeit oder Winterthur zu tun hat – z.B. Fragen zu Technik, \
Programmierung, Politik, Mathematik, dem Aufbau dieser App oder anderen ortsfremden Themen – antworte freundlich: \
"Als Reiseführer Thomas kann ich dir bei diesem Thema leider nicht helfen. Ich beantworte gerne Fragen rund um \
Winterthur, Ausflugsziele, Restaurants, Sehenswürdigkeiten und alles, was deinen Aufenthalt unvergesslich macht. 😊"`;

const OFF_TOPIC_REPLY = 'Als Reiseführer Thomas kann ich dir bei diesem Thema leider nicht helfen. Ich beantworte gerne Fragen rund um Winterthur, Ausflugsziele, Restaurants, Sehenswürdigkeiten und alles, was deinen Aufenthalt unvergesslich macht. 😊';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Infer the most relevant listing category from the user's question. */
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
  const match = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((kw) => q.includes(kw)));
  return match?.category;
}

/** Fetch active listings from Supabase and format them as a compact context string. */
async function fetchListingsContext(category?: ListingCategory): Promise<string> {
  try {
    let query = supabase
      .from('listings')
      .select('name, sub_type, address, hours, description')
      .eq('is_active', true)
      .order('name')
      .limit(category ? CATEGORY_LISTINGS_LIMIT : ALL_LISTINGS_LIMIT);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return '';

    const lines = (data as Array<{
      name: string;
      sub_type?: string;
      address?: string;
      hours?: string;
      description?: string;
    }>).map((l) => {
      const parts: string[] = [l.name];
      if (l.sub_type) parts.push(`(${l.sub_type})`);
      if (l.address) parts.push(`– ${l.address}`);
      if (l.hours) parts.push(`| Öffnungszeiten: ${l.hours}`);
      if (l.description) parts.push(`| ${l.description}`);
      return parts.join(' ');
    });

    return lines.join('\n');
  } catch {
    return '';
  }
}

/** Build the system prompt, optionally enriched with live listings data. */
function buildSystemPrompt(listingsContext: string): string {
  if (!listingsContext) return SYSTEM_PROMPT_BASE;
  return `${SYSTEM_PROMPT_BASE}\n\nAKTUELLE ORTE IN WINTERTHUR (nutze diese echten Daten für spezifische Empfehlungen):\n${listingsContext}`;
}

/** Send a message to the OpenAI Chat API and return the assistant reply. */
export async function askAiGuide(
  question: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const category = detectCategory(question);
  const listingsContext = await fetchListingsContext(category);

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    return getOfflineResponse(question, listingsContext);
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(listingsContext) },
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: question },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Fehler: ${response.status} – ${err}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content?.trim() ?? 'Keine Antwort erhalten.';
}

/** Build a response from listings context listing up to 3 specific places. */
function buildListingsResponse(listingsContext: string, categoryLabel: string): string {
  if (!listingsContext) return '';
  const lines = listingsContext.split('\n').filter(Boolean);
  if (lines.length === 0) return '';
  const top = lines.slice(0, 3).map((l) => {
    // Extract the name/type portion before the address separator '–' or metadata separator '|'
    const beforeMeta = l.split('|')[0].trim();
    const beforeAddress = beforeMeta.split('–')[0].trim();
    return beforeAddress || beforeMeta;
  });
  return `Hier sind einige empfehlenswerte ${categoryLabel} in Winterthur: ${top.join('; ')}. Schau dir die vollständige Liste in der App an!`;
}

/** Fallback responses used when no API key is configured. */
function getOfflineResponse(question: string, listingsContext: string): string {
  const q = question.toLowerCase();

  // Detect clearly off-topic queries (tech, app, coding, math, politics, etc.)
  const offTopicKeywords = [
    'app', 'code', 'programmier', 'software', 'bug', 'fehler im', 'github',
    'javascript', 'typescript', 'react', 'datenbank', 'api', 'server',
    'politik', 'mathematik', 'formel', 'gleichung', 'physik', 'chemie',
    'wie funktioniert diese', 'wie ist die app', 'was kann die app',
  ];
  if (offTopicKeywords.some((kw) => q.includes(kw))) {
    return OFF_TOPIC_REPLY;
  }

  if (q.includes('name') || q.includes('wer bist') || q.includes('wer du')) {
    return 'Ich bin Thomas, dein persönlicher Reiseführer für Winterthur! Ich helfe dir dabei, die schönsten Ecken der Stadt zu entdecken – von der Altstadt bis zu versteckten Geheimtipps. 😊';
  }
  if (q.includes('ankommen') || q.includes('angekommen') || q.includes('neu')) {
    return 'Willkommen in Winterthur! 🎉 Ich bin Thomas, dein lokaler Guide. Starte am besten mit einem Spaziergang durch die Altstadt rund um den Stadtgarten, gönn dir einen Kaffee an der Marktgasse und schau dir danach das Kunstmuseum an – eines der bedeutendsten in der Schweiz.';
  }
  if (q.includes('highlight') || q.includes('sehenswürdigkeit') || q.includes('sehen') || q.includes('museum')) {
    return buildListingsResponse(listingsContext, 'Sehenswürdigkeiten') ||
      'Die Top-Highlights in Winterthur sind das Kunstmuseum und die Fotostiftung Schweiz, das historische Schloss Kyburg, der Stadtgarten, die Altstadt mit ihren Lauben sowie das Technorama für Familien.';
  }
  if (q.includes('essen') || q.includes('restaurant') || q.includes('speisen') ||
      q.includes('pizza') || q.includes('italienisch') || q.includes('küche')) {
    return buildListingsResponse(listingsContext, 'Restaurants') ||
      'Winterthur bietet eine tolle Gastronomie! In der Altstadt findest du viele Restaurants – von traditioneller Schweizer Küche bis hin zu internationalen Spezialitäten. Das Viertel rund um den Neumarkt ist besonders belebt und empfehlenswert.';
  }
  if (q.includes('café') || q.includes('cafe') || q.includes('kaffee')) {
    return buildListingsResponse(listingsContext, 'Cafés') ||
      'Für einen guten Kaffee empfehle ich die Cafés rund um die Marktgasse und den Stadtgarten. Viele bieten auch frisches Gebäck und hausgemachte Kuchen an – perfekt für eine Pause zwischendurch.';
  }
  if (q.includes('nacht') || q.includes('bar') || q.includes('abend') || q.includes('ausgehen')) {
    return buildListingsResponse(listingsContext, 'Bars') ||
      'Das Winterthurer Nachtleben konzentriert sich rund um die Altstadt und den Neumarkt. Zahlreiche Bars und Clubs bieten ein abwechslungsreiches Programm von entspannten Cocktailbars bis zu lebhaften Tanzlokalen.';
  }
  if (q.includes('hotel') || q.includes('übernacht') || q.includes('unterkunft')) {
    return buildListingsResponse(listingsContext, 'Hotels') ||
      'Winterthur bietet verschiedene Übernachtungsmöglichkeiten – von gemütlichen Boutique-Hotels bis zu komfortablen Stadthotels. Das Zentrum ist ideal für kurze Wege zu den Sehenswürdigkeiten.';
  }
  return buildListingsResponse(listingsContext, 'Orte') ||
    'Winterthur hat viel zu bieten! Erkunde die Altstadt, besuche eines der rund 20 Museen oder genieße die lokale Gastronomie. Hast du eine konkretere Frage? Ich, Thomas, helfe dir gerne weiter. 😊';
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const SYSTEM_PROMPT = `Du bist ein freundlicher und kenntnisreicher KI Local Guide für Winterthur (Winti), Schweiz. \
Du hilfst Besuchern und Einwohnern dabei, die besten Restaurants, Cafés, Bars, Hotels, Sehenswürdigkeiten, \
kulturellen Highlights und lokalen Geheimtipps zu entdecken. \
Gib konkrete, hilfreiche Empfehlungen. Antworte immer auf Deutsch und halte deine Antworten kurz und prägnant (max. 3–4 Sätze).`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

/** Send a message to the OpenAI Chat API and return the assistant reply. */
export async function askAiGuide(
  question: string,
  history: ChatMessage[] = [],
): Promise<string> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
    return getOfflineResponse(question);
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
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

/** Fallback responses used when no API key is configured. */
function getOfflineResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('ankommen') || q.includes('angekommen') || q.includes('neu')) {
    return 'Willkommen in Winterthur! 🎉 Starte am besten mit einem Spaziergang durch die Altstadt rund um den Stadtgarten, gönn dir einen Kaffee in einem der gemütlichen Cafés an der Marktgasse und schau dir danach das Kunstmuseum an – eines der bedeutendsten in der Schweiz.';
  }
  if (q.includes('highlight') || q.includes('sehenswürdigkeit') || q.includes('sehen')) {
    return 'Die Top-Highlights in Winterthur sind das Kunstmuseum und die Fotostiftung Schweiz, das historische Schloss Kyburg, der Stadtgarten, die Altstadt mit ihren Lauben sowie das Technorama für Familien.';
  }
  if (q.includes('essen') || q.includes('restaurant') || q.includes('speisen')) {
    return 'Winterthur bietet eine tolle Gastronomie! In der Altstadt findest du viele Restaurants – von traditioneller Schweizer Küche bis hin zu internationalen Spezialitäten. Das Viertel rund um den Neumarkt ist besonders belebt und empfehlenswert.';
  }
  if (q.includes('café') || q.includes('cafe') || q.includes('kaffee')) {
    return 'Für einen guten Kaffee empfehle ich die Cafés rund um die Marktgasse und den Stadtgarten. Viele bieten auch frisches Gebäck und hausgemachte Kuchen an – perfekt für eine Pause zwischendurch.';
  }
  if (q.includes('nacht') || q.includes('bar') || q.includes('abend')) {
    return 'Das Winterthurer Nachtleben konzentriert sich rund um die Altstadt und den Neumarkt. Zahlreiche Bars und Clubs bieten ein abwechslungsreiches Programm von entspannten Cocktailbars bis zu lebhaften Tanzlokalen – besonders die Gasse und die Technoramastrasse sind bekannte Ausgehviertel.';
  }
  return 'Winterthur hat viel zu bieten! Erkunde die Altstadt, besuche eines der rund 20 Museen oder genieße die lokale Gastronomie. Hast du eine konkretere Frage? Ich helfe dir gerne weiter. 😊';
}

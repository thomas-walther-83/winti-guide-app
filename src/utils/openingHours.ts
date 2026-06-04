/**
 * Best-effort-Parser für deutschsprachige Öffnungszeiten-Freitexte.
 * Gibt zurück:
 *   true  → laut Text aktuell geöffnet
 *   false → laut Text aktuell geschlossen
 *   null  → nicht interpretierbar (z. B. „nach Vereinbarung“)
 *
 * Unterstützt u. a.: „Mo-Sa 11:00-21:00“, „Täglich 9-18 Uhr“,
 * „Mo-Fr 8:00-12:00, 14:00-18:00“, „Mo-Fr 8-12, Sa 9-13“.
 */

const ABBR: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0 };
// Wochenreihenfolge Mo..So für Bereichs-Expansion.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function expandRange(a: number, b: number): number[] {
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return [];
  const out: number[] = [];
  let i = ia;
  // inklusive, mit Umlauf (z. B. Fr-Mo)
  while (true) {
    out.push(ORDER[i]);
    if (i === ib) break;
    i = (i + 1) % ORDER.length;
  }
  return out;
}

/** Tage eines Regel-Segments; null = keine Tage genannt → gilt für alle Tage. */
function parseDays(rule: string): Set<number> | null {
  const set = new Set<number>();
  const rangeRe = /\b(mo|di|mi|do|fr|sa|so)\s*-\s*(mo|di|mi|do|fr|sa|so)\b/g;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(rule))) {
    expandRange(ABBR[m[1]], ABBR[m[2]]).forEach((d) => set.add(d));
  }
  const singleRe = /\b(mo|di|mi|do|fr|sa|so)\b/g;
  while ((m = singleRe.exec(rule))) {
    set.add(ABBR[m[1]]);
  }
  return set.size ? set : null;
}

/** Zeitbereiche [startMin, endMin] eines Segments. */
function parseTimes(rule: string): Array<[number, number]> {
  const re = /(\d{1,2})(?:[:.](\d{2}))?\s*-\s*(\d{1,2})(?:[:.](\d{2}))?/g;
  const out: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(rule))) {
    const sh = +m[1];
    const eh = +m[3];
    if (sh > 24 || eh > 24) continue; // offensichtlich kein Zeit-, sondern Datumsbereich
    const a = sh * 60 + (m[2] ? +m[2] : 0);
    let b = eh * 60 + (m[4] ? +m[4] : 0);
    if (b === 0) b = 24 * 60; // „…-24:00“ / „…-0“ = Tagesende
    out.push([a, b]);
  }
  return out;
}

export function isOpenNow(hours?: string | null, now: Date = new Date()): boolean | null {
  if (!hours || !hours.trim()) return null;
  const s = hours.toLowerCase().replace(/[–—]/g, '-').replace(/uhr/g, ' ');

  const allDays = /(täglich|taeglich|jeden tag|daily|7\s*\/\s*7|durchgehend|alle tage|mo\s*-\s*so)/.test(s);
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();

  // In Regeln zerlegen: an „;“, Zeilenumbruch oder einem Komma, das vor einem
  // Tages-Token steht (so bleibt „8:00-12:00, 14:00-18:00“ eine Regel).
  const rules = s.split(/[;\n]|,(?=\s*(?:mo|di|mi|do|fr|sa|so)\b)/);

  let sawTime = false;
  for (const rule of rules) {
    const times = parseTimes(rule);
    if (!times.length) continue;
    sawTime = true;
    const days = allDays ? null : parseDays(rule);
    const dayMatches = days === null || days.has(day);
    if (!dayMatches) continue;
    for (const [a, b] of times) {
      const open = b > a ? mins >= a && mins < b : mins >= a || mins < b; // über Mitternacht
      if (open) return true;
    }
  }
  return sawTime ? false : null;
}

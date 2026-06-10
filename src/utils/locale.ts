import type { Language } from '../types';

/**
 * Mapping App-Sprache → BCP-47-Locale für Datums-/Zahlenformate.
 * Schweiz-Varianten, wo vorhanden (Datumsformat dd.mm.yyyy etc.).
 */
const DATE_LOCALES: Record<Language, string> = {
  de: 'de-CH',
  en: 'en-GB',
  fr: 'fr-CH',
  it: 'it-CH',
};

export function dateLocale(language: Language): string {
  return DATE_LOCALES[language] ?? 'de-CH';
}

/**
 * Kurz-Wochentage (Mo–So) in der App-Sprache, generiert über Intl —
 * keine hartcodierte Liste pro Sprache nötig.
 * 2024-01-01 war ein Montag; daraus 7 aufeinanderfolgende Tage.
 */
export function weekdaysShort(language: Language): string[] {
  const locale = dateLocale(language);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    days.push(
      d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }).replace(/\.$/, ''),
    );
  }
  return days;
}

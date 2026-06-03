import { useState, useCallback, useContext } from 'react';
import type { Language } from '../types';
import { LanguageContext } from '../context/LanguageContext';
import de from '../locales/de.json';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';

type TranslationDict = typeof de;
type TranslationKey = keyof TranslationDict;

const translations: Record<Language, TranslationDict> = { de, en, fr, it };

interface UseTranslationResult {
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  availableLanguages: Language[];
}

export function useTranslation(): UseTranslationResult {
  // App-weiter Sprach-State, falls ein LanguageProvider vorhanden ist;
  // sonst lokaler Fallback (z. B. isolierte Hook-Tests ohne Provider).
  const ctx = useContext(LanguageContext);
  const [localLanguage, setLocalLanguage] = useState<Language>('de');

  const language = ctx ? ctx.language : localLanguage;
  const setLanguageFn = ctx ? ctx.setLanguage : setLocalLanguage;

  const setLanguage = useCallback(
    (lang: Language) => {
      setLanguageFn(lang);
    },
    [setLanguageFn],
  );

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] ?? translations['de'][key] ?? key;
    },
    [language],
  );

  return {
    t,
    language,
    setLanguage,
    availableLanguages: ['de', 'en', 'fr', 'it'],
  };
}

import { useState, useCallback } from 'react';
import type { Language } from '../types';
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
  const [language, setLanguageState] = useState<Language>('de');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

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

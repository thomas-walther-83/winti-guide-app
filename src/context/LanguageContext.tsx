import React, { createContext, useState } from 'react';
import type { Language } from '../types';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

/**
 * App-weiter Sprach-State. useTranslation konsumiert diesen Context, fällt
 * aber auf lokalen State zurück, wenn kein Provider vorhanden ist (z. B. in
 * isolierten Hook-Tests). So bleibt die Sprache app-weit synchron, ohne die
 * Standalone-Nutzung zu brechen.
 */
export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('de');
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

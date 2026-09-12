'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations['zh'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Chinese ('zh') as requested by the user
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_language') as Language | null;
      if (saved === 'zh' || saved === 'en') {
        return saved;
      }
    }
    return 'zh';
  });

  useEffect(() => {
    // Keep localStorage in sync whenever language changes
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', language);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'zh' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: translations.zh
    };
  }
  return context;
}

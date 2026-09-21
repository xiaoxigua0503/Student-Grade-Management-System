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
  // Initial state matches SSR render perfectly
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_language') as Language | null;
      if (saved === 'en') {
        queueMicrotask(() => {
          setLanguageState('en');
        });
      }
    } catch {
      // Ignore localStorage access restrictions in sandboxed iframes
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => {
      const nextLang = prev === 'zh' ? 'en' : 'zh';
      try {
        localStorage.setItem('app_language', nextLang);
      } catch {
        // Ignore
      }
      return nextLang;
    });
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

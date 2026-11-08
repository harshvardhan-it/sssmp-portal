import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language } from '../types';
import hiJson from '../locales/hi.json';
import enJson from '../locales/en.json';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, paramsOrFallback?: Record<string, any> | string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, any>> = {
  hi: hiJson,
  en: enJson,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('sssmp_lang') as Language;
      return saved === 'en' ? 'en' : 'hi'; // Hindi default as required
    } catch (e) {
      return 'hi';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('sssmp_lang', lang);
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (
    path: string,
    paramsOrFallback?: Record<string, any> | string,
    fallback?: string
  ): string => {
    let params: Record<string, any> | undefined;
    let defaultFallback: string | undefined;

    if (typeof paramsOrFallback === 'string') {
      defaultFallback = paramsOrFallback;
    } else if (typeof paramsOrFallback === 'object') {
      params = paramsOrFallback;
      defaultFallback = fallback;
    } else {
      defaultFallback = fallback;
    }

    const keys = path.split('.');
    let current: any = translations[language];
    let found = true;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }

    if (!found || typeof current !== 'string') {
      // Fallback to Hindi
      let fallbackCur: any = translations.hi;
      let fbFound = true;
      for (const fbKey of keys) {
        if (fallbackCur && typeof fallbackCur === 'object' && fbKey in fallbackCur) {
          fallbackCur = fallbackCur[fbKey];
        } else {
          fbFound = false;
          break;
        }
      }
      current = fbFound && typeof fallbackCur === 'string' ? fallbackCur : (defaultFallback || path);
    }

    let result = typeof current === 'string' ? current : (defaultFallback || path);

    if (params && typeof result === 'string') {
      Object.keys(params).forEach((paramKey) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(params![paramKey]));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { translations, TranslationKey } from '../utils/translations';

export type Language = 'en' | 'da' | 'no' | 'sv';

export interface ExchangeRates {
  EUR: number;
  DKK: number;
  NOK: number;
  SEK: number;
  USD: number;
  timestamp: number;
}

const STABLE_RATES: ExchangeRates = {
  EUR: 1.0,
  DKK: 7.46,
  NOK: 11.38,
  SEK: 11.23,
  USD: 1.08,
  timestamp: Date.now()
};

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
  translateDynamic: (text: string) => Promise<string>;
  formatPrice: (priceInEUR: number) => string;
  currencySymbol: string;
  currencyCode: string;
  rates: ExchangeRates;
  updateRates: (newRates: Partial<ExchangeRates>) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => 
    (localStorage.getItem('voltstoreai_lang') as Language) || 'en'
  );
  
  const [rates, setRates] = useState<ExchangeRates>(() => {
    const saved = localStorage.getItem('voltstoreai_rates_v3');
    try {
      return saved ? JSON.parse(saved) : STABLE_RATES;
    } catch {
      return STABLE_RATES;
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('voltstoreai_lang', lang);
  }, []);

  const updateRates = useCallback((newRates: Partial<ExchangeRates>) => {
    setRates(prev => {
      const updated = { ...prev, ...newRates, timestamp: Date.now() };
      localStorage.setItem('voltstoreai_rates_v3', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const translateDynamic = useCallback(async (text: string): Promise<string> => {
    return text || '';
  }, []);

  const t = useCallback((key: TranslationKey | string): string => {
    const currentSet = translations[language] || translations['en'];
    const val = (currentSet as any)[key] || (translations['en'] as any)[key];
    // Повертаємо ключ, якщо переклад не знайдено, щоб уникнути undefined у текстових вузлах
    return val || String(key);
  }, [language]);

  const currentLangData = useMemo(() => 
    translations[language] || translations['en'], 
  [language]);

  const currencyCode = useMemo(() => currentLangData.currency_code, [currentLangData]);
  const currencySymbol = useMemo(() => currentLangData.currency_symbol, [currentLangData]);

  const formatPrice = useCallback((priceInEUR: number): string => {
    const rate = rates[currencyCode as keyof ExchangeRates] || 1.0;
    const converted = (Number(priceInEUR) || 0) * rate;
    
    // Вибір локалі для коректного відображення роздільників
    const locale = language === 'en' ? 'en-US' : 'de-DE';
    
    return `${currencySymbol}${converted.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }, [currencySymbol, currencyCode, language, rates]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    translateDynamic,
    formatPrice,
    currencySymbol,
    currencyCode,
    rates,
    updateRates
  }), [language, setLanguage, t, translateDynamic, formatPrice, currencySymbol, currencyCode, rates, updateRates]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
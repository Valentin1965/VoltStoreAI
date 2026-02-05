
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { translations, TranslationKey } from '../utils/translations';

export type Language = 'en' | 'da' | 'no' | 'se';

export interface ExchangeRates {
  EUR: number; // Base currency, always 1.0
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
  SEK: 11.45,
  USD: 1.09,
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
    const saved = localStorage.getItem('voltstoreai_rates_v4');
    return saved ? JSON.parse(saved) : STABLE_RATES;
  });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('voltstoreai_lang', lang);
  };

  const updateRates = useCallback((newRates: Partial<ExchangeRates>) => {
    setRates(prev => {
      const updated = { ...prev, ...newRates, EUR: 1.0, timestamp: Date.now() };
      localStorage.setItem('voltstoreai_rates_v4', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const translateDynamic = async (text: string): Promise<string> => {
    return text;
  };

  const t = useCallback((key: TranslationKey | string): string => {
    const currentSet = translations[language] || translations['en'];
    const val = (currentSet as any)[key] || (translations['en'] as any)[key] || key;
    return val;
  }, [language]);

  const currentLangData = translations[language] || translations['en'];
  const currencyCode = currentLangData.currency_code;
  const currencySymbol = currentLangData.currency_symbol;

  const formatPrice = useCallback((priceInEUR: number): string => {
    const rate = rates[currencyCode as keyof ExchangeRates] || 1.0;
    const converted = (priceInEUR || 0) * rate;
    
    const locale = language === 'en' ? 'en-US' : (language === 'da' ? 'da-DK' : (language === 'no' ? 'nb-NO' : 'sv-SE'));
    
    return `${currencySymbol}${converted.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }, [currencySymbol, currencyCode, language, rates]);

  return (
    <LanguageContext.Provider value={{ 
      language, setLanguage, t, translateDynamic, formatPrice, 
      currencySymbol, currencyCode, rates, updateRates 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};

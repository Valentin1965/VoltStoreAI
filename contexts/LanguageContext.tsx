
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { translations, TranslationKey } from '../utils/translations';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from './NotificationContext';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

export type Language = 'en' | 'da' | 'no' | 'sv';

interface ExchangeRates {
  USD: number;
  DKK: number;
  NOK: number;
  SEK: number;
}

const FALLBACK_RATES: ExchangeRates = {
  USD: 1.0,
  DKK: 6.92,
  NOK: 10.55,
  SEK: 10.42
};

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatPrice: (priceInUSD: number) => string;
  currencySymbol: string;
  currencyCode: string;
  isLoadingRates: boolean;
  refreshRates: () => Promise<void>;
  isApiRestricted: boolean;
  checkAndPromptKey: () => Promise<boolean>;
}

// Повноцінний об'єкт за замовчуванням. 
// Якщо хук викликається поза провайдером, додаток все одно працюватиме.
const DEFAULT_VALUE: LanguageContextType = {
  language: 'en',
  setLanguage: () => console.warn('LanguageProvider not found'),
  t: (key) => {
    const translationSet = translations['en'] || {};
    return (translationSet as any)[key] || key;
  },
  formatPrice: (p) => `$${(p || 0).toLocaleString()}`,
  currencySymbol: '$',
  currencyCode: 'USD',
  isLoadingRates: false,
  refreshRates: async () => {},
  isApiRestricted: false,
  checkAndPromptKey: async () => true
};

const LanguageContext = createContext<LanguageContextType>(DEFAULT_VALUE);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notification = useNotification();
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('voltstore_lang') as Language) || 'en';
    } catch {
      return 'en';
    }
  });
  
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isApiRestricted, setIsApiRestricted] = useState(false);
  const isKeyBlocked = useRef(false);

  const checkAndPromptKey = useCallback(async () => {
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          if (typeof window.aistudio?.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setIsApiRestricted(false);
            isKeyBlocked.current = false;
            return true;
          }
        }
      } catch (e) {
        console.error("API Key check error", e);
      }
    }
    return true;
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '' || isKeyBlocked.current) {
      return;
    }

    setIsLoadingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Return approximate exchange rates for 1 USD to: DKK, NOK, SEK. ONLY JSON: {"DKK": number, "NOK": number, "SEK": number}',
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.DKK && data.NOK && data.SEK) {
        setRates({
          USD: 1.0,
          DKK: Number(data.DKK),
          NOK: Number(data.NOK),
          SEK: Number(data.SEK)
        });
      }
    } catch (err: any) {
      const errStr = String(err).toLowerCase();
      if (errStr.includes('leaked') || errStr.includes('403') || errStr.includes('permission_denied') || errStr.includes('not found')) {
        isKeyBlocked.current = true;
        setIsApiRestricted(true);
      }
    } finally {
      setIsLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchExchangeRates, 2000);
    const interval = setInterval(fetchExchangeRates, 3600000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchExchangeRates]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('voltstore_lang', lang);
    } catch (e) {}
  };

  const t = (key: TranslationKey): string => {
    const translationSet = translations[language] || translations['en'];
    return (translationSet as any)[key] || (translations['en'] as any)[key] || key;
  };

  const currentLangTranslations = translations[language] || translations['en'];
  const currencyCode = currentLangTranslations.currency_code;
  const currencySymbol = currentLangTranslations.currency_symbol;
  const currentRate = rates[currencyCode as keyof ExchangeRates] || FALLBACK_RATES[currencyCode as keyof ExchangeRates] || 1.0;

  const formatPrice = (priceInUSD: number): string => {
    const converted = (priceInUSD || 0) * currentRate;
    return `${currencySymbol}${converted.toLocaleString(language === 'en' ? 'en-US' : 'de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      formatPrice, 
      currencySymbol, 
      currencyCode,
      isLoadingRates,
      refreshRates: fetchExchangeRates,
      isApiRestricted,
      checkAndPromptKey
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Абсолютно безпечний хук: завжди повертає об'єкт, ніколи не викидає помилку
export const useLanguage = (): LanguageContextType => {
  return useContext(LanguageContext) || DEFAULT_VALUE;
};


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
  timestamp: number;
}

const FALLBACK_RATES: ExchangeRates = {
  USD: 1.0,
  DKK: 6.92,
  NOK: 10.55,
  SEK: 10.42,
  timestamp: 0
};

const CACHE_KEY = 'voltstore_rates_v2';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 години

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

const DEFAULT_VALUE: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
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
  const { addNotification } = useNotification();
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return (localStorage.getItem('voltstore_lang') as Language) || 'en';
    } catch {
      return 'en';
    }
  });
  
  const [rates, setRates] = useState<ExchangeRates>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          return parsed;
        }
      }
    } catch (e) {}
    return FALLBACK_RATES;
  });

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

  const fetchExchangeRates = useCallback(async (force = false) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '' || isKeyBlocked.current) {
      return;
    }

    // Перевірка свіжості кешу
    if (!force && rates.timestamp > 0 && (Date.now() - rates.timestamp < CACHE_DURATION)) {
      return;
    }

    setIsLoadingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Return current exchange rates for 1 USD to: DKK, NOK, SEK. ONLY JSON: {"DKK": number, "NOK": number, "SEK": number}',
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.DKK && data.NOK && data.SEK) {
        const newRates = {
          USD: 1.0,
          DKK: Number(data.DKK),
          NOK: Number(data.NOK),
          SEK: Number(data.SEK),
          timestamp: Date.now()
        };
        setRates(newRates);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newRates));
      }
    } catch (err: any) {
      const errStr = String(err).toLowerCase();
      console.error("Exchange Rate API Error:", errStr);
      
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('limit')) {
        console.warn("API Quota exceeded. Using cached/fallback rates.");
        // Не блокуємо ключ, просто чекаємо наступного циклу
      } else if (errStr.includes('503')) {
        console.warn("Gemini API is temporarily unavailable (503).");
      } else if (errStr.includes('leaked') || errStr.includes('403') || errStr.includes('permission_denied') || errStr.includes('not found')) {
        isKeyBlocked.current = true;
        setIsApiRestricted(true);
      }
    } finally {
      setIsLoadingRates(false);
    }
  }, [rates.timestamp]);

  useEffect(() => {
    const timer = setTimeout(() => fetchExchangeRates(), 5000); // Збільшена затримка при старті
    return () => clearTimeout(timer);
  }, [fetchExchangeRates]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('voltstore_lang', lang);
    } catch (e) {}
  };

  const t = useCallback((key: TranslationKey): string => {
    const translationSet = translations[language] || translations['en'];
    return (translationSet as any)[key] || (translations['en'] as any)[key] || key;
  }, [language]);

  const currentLangTranslations = translations[language] || translations['en'];
  const currencyCode = currentLangTranslations.currency_code;
  const currencySymbol = currentLangTranslations.currency_symbol;
  const currentRate = rates[currencyCode as keyof ExchangeRates] || FALLBACK_RATES[currencyCode as keyof ExchangeRates] || 1.0;

  const formatPrice = useCallback((priceInUSD: number): string => {
    const converted = (priceInUSD || 0) * currentRate;
    return `${currencySymbol}${converted.toLocaleString(language === 'en' ? 'en-US' : 'de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }, [currencySymbol, currentRate, language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      formatPrice, 
      currencySymbol, 
      currencyCode,
      isLoadingRates,
      refreshRates: () => fetchExchangeRates(true),
      isApiRestricted,
      checkAndPromptKey
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  return useContext(LanguageContext) || DEFAULT_VALUE;
};

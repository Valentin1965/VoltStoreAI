
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

export interface ExchangeRates {
  EUR: number;
  DKK: number;
  NOK: number;
  SEK: number;
  USD: number;
  timestamp: number;
}

const FALLBACK_RATES: ExchangeRates = {
  EUR: 1.0,
  DKK: 7.46,
  NOK: 11.38,
  SEK: 11.23,
  USD: 1.08,
  timestamp: 0
};

const CACHE_KEY = 'voltstore_rates_v4_eur';
const SUPPRESS_KEY = 'voltstore_api_suppress';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SUPPRESS_DURATION = 4 * 60 * 60 * 1000; // 4 hours pause on 429

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatPrice: (priceInEUR: number) => string;
  currencySymbol: string;
  currencyCode: string;
  isLoadingRates: boolean;
  rates: ExchangeRates;
  refreshRates: () => Promise<void>;
  isApiRestricted: boolean;
  checkAndPromptKey: () => Promise<boolean>;
}

const DEFAULT_VALUE: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  formatPrice: (p) => `€${(p || 0).toLocaleString()}`,
  currencySymbol: '€',
  currencyCode: 'EUR',
  isLoadingRates: false,
  rates: FALLBACK_RATES,
  refreshRates: async () => {},
  isApiRestricted: false,
  checkAndPromptKey: async () => true
};

const LanguageContext = createContext<LanguageContextType>(DEFAULT_VALUE);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    const suppressUntil = Number(localStorage.getItem(SUPPRESS_KEY) || 0);
    if (!force && Date.now() < suppressUntil) {
      return;
    }

    if (!force && rates.timestamp > 0 && (Date.now() - rates.timestamp < CACHE_DURATION)) {
      return;
    }

    setIsLoadingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: 'Get approximate exchange rates for 1 EUR to: DKK, NOK, SEK, USD. ONLY JSON: {"DKK": number, "NOK": number, "SEK": number, "USD": number}',
        config: {
          responseMimeType: "application/json",
          temperature: 0,
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.DKK && data.NOK && data.SEK) {
        const newRates = {
          EUR: 1.0,
          DKK: Number(data.DKK),
          NOK: Number(data.NOK),
          SEK: Number(data.SEK),
          USD: Number(data.USD || 1.08),
          timestamp: Date.now()
        };
        setRates(newRates);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newRates));
        localStorage.removeItem(SUPPRESS_KEY);
      }
    } catch (err: any) {
      const errStr = String(err).toLowerCase();
      
      if (errStr.includes('429') || errStr.includes('quota')) {
        localStorage.setItem(SUPPRESS_KEY, String(Date.now() + SUPPRESS_DURATION));
      } else if (
        errStr.includes('leaked') || 
        errStr.includes('expired') || 
        errStr.includes('403') || 
        errStr.includes('invalid') || 
        errStr.includes('permission_denied')
      ) {
        console.warn("[Language Guard] API Key is restricted or expired. Disabling AI features.");
        isKeyBlocked.current = true;
        setIsApiRestricted(true);
      }
    } finally {
      setIsLoadingRates(false);
    }
  }, [rates.timestamp]);

  useEffect(() => {
    const isCacheValid = rates.timestamp > 0 && (Date.now() - rates.timestamp < CACHE_DURATION);
    const suppressUntil = Number(localStorage.getItem(SUPPRESS_KEY) || 0);
    const isSuppressed = Date.now() < suppressUntil;

    if (!isCacheValid && !isSuppressed) {
      const timer = setTimeout(() => fetchExchangeRates(), 7000);
      return () => clearTimeout(timer);
    }
  }, [fetchExchangeRates, rates.timestamp]);

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
  
  // All formats derived from EUR base
  const currentRate = rates[currencyCode as keyof ExchangeRates] || FALLBACK_RATES[currencyCode as keyof ExchangeRates] || 1.0;

  const formatPrice = useCallback((priceInEUR: number): string => {
    const converted = (priceInEUR || 0) * currentRate;
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
      rates,
      refreshRates: () => fetchExchangeRates(true),
      isApiRestricted,
      checkAndPromptKey
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) return DEFAULT_VALUE;
  return context;
};

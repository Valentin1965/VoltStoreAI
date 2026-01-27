
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { translations, TranslationKey } from '../utils/translations';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from './NotificationContext';

declare global {
  /**
   * AIStudio interface for global window object tracking.
   */
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

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotification();
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('voltstore_lang') as Language) || 'en';
  });
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [isApiRestricted, setIsApiRestricted] = useState(false);
  
  const isKeyBlocked = useRef(false);

  // Fix: Triggering openSelectKey handles the mandatory step for user-selected keys
  const checkAndPromptKey = useCallback(async () => {
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        if (typeof window.aistudio?.openSelectKey === 'function') {
          await window.aistudio.openSelectKey();
          // Reset internal restricted state after prompting for a new key
          setIsApiRestricted(false);
          isKeyBlocked.current = false;
          return true;
        }
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
      // Create a new GoogleGenAI instance right before making an API call to ensure it uses the up-to-date key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Return approximate exchange rates for 1 USD to: DKK, NOK, SEK. ONLY JSON: {"DKK": number, "NOK": number, "SEK": number}',
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      // Use the .text property directly instead of a method call
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
      console.warn('[Currency Service] AI fetch unavailable:', errStr);
      
      // Handle cases where the entity was not found by prompting key selection again
      if (errStr.includes('leaked') || errStr.includes('403') || errStr.includes('permission_denied') || errStr.includes('not found')) {
        isKeyBlocked.current = true;
        setIsApiRestricted(true);
      }
    } finally {
      setIsLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchExchangeRates, 1500);
    const interval = setInterval(fetchExchangeRates, 3600000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchExchangeRates]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('voltstore_lang', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  const currencyCode = translations[language].currency_code;
  const currencySymbol = translations[language].currency_symbol;
  const currentRate = rates[currencyCode as keyof ExchangeRates] || FALLBACK_RATES[currencyCode as keyof ExchangeRates] || 1.0;

  const formatPrice = (priceInUSD: number): string => {
    const converted = priceInUSD * currentRate;
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

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};


import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { translations, TranslationKey } from '../utils/translations';
import { GoogleGenAI } from "@google/genai";
import { useNotification } from './NotificationContext';

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

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatPrice: (priceInUSD: number) => string;
  currencySymbol: string;
  currencyCode: string;
  isLoadingRates: boolean;
  refreshRates: () => Promise<void>;
  isApiRestricted: boolean;
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
  const hasNotifiedSecurity = useRef(false);

  const fetchExchangeRates = useCallback(async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '' || isKeyBlocked.current) {
      return;
    }

    setIsLoadingRates(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
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
      console.warn('[Currency Service] AI fetch unavailable:', errStr);
      
      if (errStr.includes('leaked') || errStr.includes('403') || errStr.includes('permission_denied')) {
        isKeyBlocked.current = true;
        setIsApiRestricted(true);
        if (!hasNotifiedSecurity.current) {
          addNotification("Service: Using fixed exchange rates.", "info");
          hasNotifiedSecurity.current = true;
        }
      }
    } finally {
      setIsLoadingRates(false);
    }
  }, [addNotification]);

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
      isApiRestricted
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { translations, TranslationKey } from '../utils/translations';
import { LocalizedText } from '../types';
import { safeStorage } from '../utils/storage';
import { supabase } from '../services/supabase';

export type Language = 'en' | 'da' | 'no' | 'se';
export type CurrencyCode = 'EUR' | 'DKK' | 'NOK' | 'SEK' | 'USD';

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
  SEK: 11.45,
  USD: 1.09,
  timestamp: Date.now()
};

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  t: (key: TranslationKey | string) => string;
  getLoc: (text: LocalizedText | null | undefined) => string;
  formatPrice: (priceInEUR: number) => string;
  currencySymbol: string;
  currencyCode: string;
  rates: ExchangeRates;
  exchangeRates: ExchangeRates;
  updateRates: (newRates: Partial<ExchangeRates>) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('da');
  const [currency, setCurrencyState] = useState<CurrencyCode>('DKK');
  const [rates, setRates] = useState<ExchangeRates>(STABLE_RATES);
  const isInitialized = useRef(false);

  // ── Fetch rates from Supabase (authoritative source) ─────────────────────
  // Declared before the init useEffect that calls it
  const fetchRatesFromDB = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_exchange_rates');
      if (error || !data) return;
      const dbRates: ExchangeRates = { ...STABLE_RATES, ...data, EUR: 1.0, timestamp: Date.now() };
      setRates(dbRates);
      safeStorage.setItem('voltstoreai_rates_v4', JSON.stringify(dbRates));
    } catch { /* offline — keep current rates */ }
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    
    const savedLang = safeStorage.getItem('voltstoreai_lang');
    const savedCurr = safeStorage.getItem('voltstoreai_currency');
    const savedRates = safeStorage.getItem('voltstoreai_rates_v4');
    
    if (savedLang) setLanguageState(savedLang as Language);
    if (savedCurr) setCurrencyState(savedCurr as CurrencyCode);
    if (savedRates) setRates(JSON.parse(savedRates));

    isInitialized.current = true;

    // Fetch authoritative rates from Supabase (overrides localStorage if newer)
    // Small delay so UI renders first with cached rates
    setTimeout(() => fetchRatesFromDB(), 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setCurrency = useCallback((curr: CurrencyCode) => {
    setCurrencyState(curr);
    safeStorage.setItem('voltstoreai_currency', curr);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    safeStorage.setItem('voltstoreai_lang', lang);
    
    switch(lang) {
      case 'da': setCurrency('DKK'); break;
      case 'no': setCurrency('NOK'); break;
      case 'se': setCurrency('SEK'); break;
      case 'en': setCurrency('EUR'); break;
    }
  }, [setCurrency]);

  const updateRates = useCallback(async (newRates: Partial<ExchangeRates>) => {
    const adminKey = import.meta.env.VITE_ADMIN_PASSWORD;
    const updated: ExchangeRates = { ...STABLE_RATES, ...newRates, EUR: 1.0, timestamp: Date.now() };

    // 1. Optimistic local update
    setRates(updated);
    safeStorage.setItem('voltstoreai_rates_v4', JSON.stringify(updated));

    // 2. Persist to Supabase so all devices see the new rates
    try {
      const { error } = await supabase.rpc('admin_update_rates', {
        p_key: adminKey,
        p_rates: { EUR: updated.EUR, DKK: updated.DKK, NOK: updated.NOK, SEK: updated.SEK, USD: updated.USD },
      });
      if (error) console.error('[Rates] Supabase sync failed:', error.message);
    } catch (e) { console.error('[Rates] Network error:', e); }
  }, []);

  const t = useCallback((key: TranslationKey | string): string => {
    const currentSet = translations[language] || translations['da'];
    return (currentSet as any)[key] || (translations['da'] as any)[key] || key;
  }, [language]);

  const getLoc = useCallback((text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['da'] || (text as any)['en'] || Object.values(text as any)[0] || "";
  }, [language]);

  const currencySymbol = useMemo(() => {
    switch (currency) {
      case 'EUR': return '€';
      case 'DKK': return 'kr.';
      case 'NOK':
      case 'SEK': return 'kr';
      case 'USD': return '$';
      default: return '€';
    }
  }, [currency]);

  const formatPrice = useCallback((priceInEUR: number): string => {
    const rate = rates[currency as keyof ExchangeRates] || 1.0;
    const converted = (priceInEUR || 0) * rate;
    const localeMap = { en: 'en-US', da: 'da-DK', no: 'nb-NO', se: 'sv-SE' };
    const locale = localeMap[language] || 'da-DK';
    
    const formattedNumber = converted.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    switch (currency) {
      case 'DKK': return `kr. ${formattedNumber}`;
      case 'NOK':
      case 'SEK': return `${formattedNumber} kr`;
      case 'EUR': return `€${formattedNumber}`;
      case 'USD': return `$${formattedNumber}`;
      default: return `${formattedNumber} ${currencySymbol}`;
    }
  }, [currencySymbol, currency, language, rates]);

  return (
    <LanguageContext.Provider value={{ 
      language, setLanguage, currency, setCurrency, t, getLoc, formatPrice, 
      currencySymbol, currencyCode: currency, rates, exchangeRates: rates, updateRates 
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
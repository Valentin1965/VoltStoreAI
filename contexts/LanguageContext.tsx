import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { translations, TranslationKey } from '../utils/translations';

export type Language = 'en' | 'da' | 'no' | 'sv';

const STABLE_RATES = { EUR: 1.0, DKK: 7.46, NOK: 11.38, SEK: 11.23, USD: 1.08, timestamp: Date.now() };

const LanguageContext = createContext<any>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('voltstore_lang') as Language) || 'en');
  const [rates] = useState(STABLE_RATES);
  const [aiCache, setAiCache] = useState<Record<string, string>>(() => JSON.parse(localStorage.getItem('voltstore_ai_translations') || '{}'));

  useEffect(() => { localStorage.setItem('voltstore_ai_translations', JSON.stringify(aiCache)); }, [aiCache]);

  const translateDynamic = async (text: string): Promise<string> => {
    if (!text || language === 'en') return text;
    const cacheKey = `${language}:${text}`;
    if (aiCache[cacheKey]) return aiCache[cacheKey];

    const apiKey = "AIzaSyDhNAK8S9_HQdCQD-y9nkY_d9IaLOmm9tg";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Translate to ${language}: "${text}"` }] }] })
      });

      const resData = await response.json();
      // ЗАХИСТ ВІД ПОМИЛКИ TypeError
      const translated = resData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (translated) {
        setAiCache(prev => ({ ...prev, [cacheKey]: translated }));
        return translated;
      }
      return text;
    } catch (e) {
      return text;
    }
  };

  const formatPrice = useCallback((priceInEUR: number): string => {
    const langData = translations[language] || translations['en'];
    const rate = (rates as any)[langData.currency_code] || 1.0;
    const converted = priceInEUR * rate;
    return `${langData.currency_symbol}${converted.toLocaleString(language === 'en' ? 'en-US' : 'de-DE', { maximumFractionDigits: 0 })}`;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, setLanguage: (l: Language) => { setLanguageState(l); localStorage.setItem('voltstore_lang', l); }, 
      t: (key: string) => (translations[language] as any)[key] || key, 
      translateDynamic, formatPrice, 
      currencySymbol: (translations[language] as any).currency_symbol, 
      currencyCode: (translations[language] as any).currency_code 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

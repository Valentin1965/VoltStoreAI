import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useNotification } from './NotificationContext';
import { safeStorage } from '../utils/storage';

interface CompareContextType {
  compareList: Product[];
  toggleCompare: (product: Product) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareList, setCompareList] = useState<Product[]>([]);
  const { addNotification } = useNotification();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    const saved = safeStorage.getItem('voltstoreai_compare');
    if (saved) setCompareList(JSON.parse(saved));
    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    safeStorage.setItem('voltstoreai_compare', JSON.stringify(compareList));
  }, [compareList]);

  const toggleCompare = (product: Product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        addNotification('Removed from comparison', 'info');
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length >= 4) {
        addNotification('Maximum 4 items for comparison', 'error');
        return prev;
      }
      addNotification('Added to comparison', 'success');
      return [...prev, product];
    });
  };

  const isInCompare = (id: string) => compareList.some(p => p.id === id);
  const clearCompare = () => setCompareList([]);

  return (
    <CompareContext.Provider value={{ compareList, toggleCompare, isInCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within CompareProvider');
  return context;
};
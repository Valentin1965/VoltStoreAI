import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Category } from '../types';
import { supabase } from '../services/supabase';
import { useNotification } from './NotificationContext';
import { useLanguage } from './LanguageContext';
import { MOCK_PRODUCTS } from '../utils/constants';

export interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  categories: Category[];
  selectedCategory: Category | 'All';
  setSelectedCategory: (category: Category | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProducts: Product[];
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const sanitizeForDb = (product: any) => {
  const { id, created_at, ...cleanProduct } = product;
  
  const processJsonField = (field: any) => {
    if (field === null || field === undefined) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string' && field.trim() !== '') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  cleanProduct.specs = processJsonField(cleanProduct.specs);
  cleanProduct.docs = processJsonField(cleanProduct.docs);
  cleanProduct.features = Array.isArray(cleanProduct.features) ? cleanProduct.features : [];
  cleanProduct.kitComponents = Array.isArray(cleanProduct.kitComponents) ? cleanProduct.kitComponents : [];
  
  cleanProduct.is_active = cleanProduct.is_active !== false;
  cleanProduct.is_leader = cleanProduct.is_leader === true;
  cleanProduct.price = Number(cleanProduct.price) || 0;
  cleanProduct.stock = Number(cleanProduct.stock) || 0;
  
  if (Array.isArray(cleanProduct.images)) {
    cleanProduct.images = cleanProduct.images.filter((img: string) => img && img.trim() !== '');
  }
  
  return cleanProduct;
};

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [localKits, setLocalKits] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('voltstoreai_local_kits');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotification();
  const { language } = useLanguage();

  const products = useMemo(() => {
    const baseProducts = dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS;
    return [...localKits, ...baseProducts];
  }, [localKits, dbProducts]);

  useEffect(() => {
    try {
      localStorage.setItem('voltstoreai_local_kits', JSON.stringify(localKits));
    } catch (e) {}
  }, [localKits]);

  const fetchProducts = useCallback(async () => {
    if (!navigator.onLine) {
      console.warn('[ProductsContext] Device is offline. Using mock products.');
      setIsLoading(false);
      return;
    }

    const supabaseUrl = (supabase as any).supabaseUrl;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setDbProducts(data || []);
    } catch (err: any) {
      console.warn('[ProductsContext] Failed to fetch from Supabase:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    window.addEventListener('online', fetchProducts);
    return () => window.removeEventListener('online', fetchProducts);
  }, [fetchProducts]);

  const getLocalizedValue = (val: any, lang: string): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return (val as any)[lang] || (val as any)['en'] || Object.values(val)[0] as string || "";
    return String(val);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const productName = getLocalizedValue(p.name, language || 'en');
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products, language]);

  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    if (newProduct.category === 'Kits') {
      const kitWithId = { 
        ...newProduct, 
        id: `KIT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        is_active: newProduct.is_active ?? true,
        kitComponents: newProduct.kitComponents || []
      } as Product;
      setLocalKits(prev => [kitWithId, ...prev]);
      addNotification('Kit saved locally', 'success');
      return;
    }
    
    if (!navigator.onLine) {
      addNotification('Cannot add product while offline.', 'error');
      return;
    }

    try {
      const cleanData = sanitizeForDb(newProduct);
      const { data, error } = await supabase.from('products').insert([cleanData]).select();
      if (error) throw error;
      if (data) setDbProducts(prev => [data[0], ...prev]);
      addNotification('Product added to database', 'success');
    } catch (err: any) {
      addNotification(`Network Error: Ensure you are online.`, 'error');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    if (String(updatedProduct.id).startsWith('KIT-')) {
      setLocalKits(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addNotification('Kit updated locally', 'success');
      return;
    }

    if (!navigator.onLine) {
      addNotification('Cannot update while offline.', 'error');
      return;
    }

    try {
      const cleanData = sanitizeForDb(updatedProduct);
      const { error } = await supabase.from('products').update(cleanData).eq('id', updatedProduct.id);
      if (error) throw error;
      setDbProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addNotification('Product updated in database', 'success');
    } catch (err: any) {
      addNotification(`Update failed. Check your connection.`, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    if (String(id).startsWith('KIT-')) {
      setLocalKits(prev => prev.filter(p => p.id !== id));
      addNotification('Kit deleted', 'info');
      return;
    }

    if (!navigator.onLine) {
      addNotification('Cannot delete while offline.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setDbProducts(prev => prev.filter(p => p.id !== id));
      addNotification('Product deleted from database', 'info');
    } catch (err: any) {
      addNotification(`Delete failed. Check your connection.`, 'error');
    }
  };

  return (
    <ProductsContext.Provider value={{
      products, isLoading, categories: ['Charging Stations', 'Inverters', 'Batteries', 'Solar Panels', 'Kits'],
      selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, filteredProducts,
      fetchProducts, addProduct, updateProduct, deleteProduct
    }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = (): ProductsContextType => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};
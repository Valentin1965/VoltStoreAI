
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';
import { supabase } from '../services/supabase';
import { useNotification } from './NotificationContext';
import { useLanguage } from './LanguageContext';

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

// Допоміжна функція для очищення об'єкта перед записом у БД
const sanitizeForDb = (product: any) => {
  const { kitComponents, id, created_at, ...cleanProduct } = product;
  
  // Якщо база даних jsonb, ми можемо передавати масиви прямо. 
  // Але для надійності переконуємось, що це або масив, або розпарсений об'єкт.
  if (typeof cleanProduct.specs === 'string') {
    try { cleanProduct.specs = JSON.parse(cleanProduct.specs); } catch { cleanProduct.specs = []; }
  }
  if (typeof cleanProduct.docs === 'string') {
    try { cleanProduct.docs = JSON.parse(cleanProduct.docs); } catch { cleanProduct.docs = []; }
  }
  
  if (cleanProduct.is_active === undefined || cleanProduct.is_active === null) {
    cleanProduct.is_active = true;
  }
  
  return cleanProduct;
};

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [localKits, setLocalKits] = useState<Product[]>(() => {
    const saved = localStorage.getItem('voltstore_local_kits');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotification();
  const { language } = useLanguage();

  const products = useMemo(() => [...localKits, ...dbProducts], [localKits, dbProducts]);

  useEffect(() => {
    localStorage.setItem('voltstore_local_kits', JSON.stringify(localKits));
  }, [localKits]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDbProducts(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      addNotification('Помилка завантаження товарів.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getLocalizedValue = (val: any, lang: string): string => {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val[lang] || val['en'] || Object.values(val)[0] as string || "";
    }
    return String(val);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isActive = p.is_active !== false;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      const productName = getLocalizedValue(p.name, language);
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return isActive && matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products, language]);

  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    if (newProduct.category === 'Kits') {
      const kitWithId = { 
        ...newProduct, 
        id: 'KIT-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        is_active: newProduct.is_active ?? true
      } as Product;
      setLocalKits(prev => [kitWithId, ...prev]);
      addNotification('Комплект збережено локально', 'success');
      return;
    }

    try {
      const cleanData = sanitizeForDb(newProduct);
      const { data, error } = await supabase
        .from('products')
        .insert([cleanData])
        .select();

      if (error) throw error;
      if (data) setDbProducts(prev => [data[0], ...prev]);
      addNotification('Товар додано в базу', 'success');
    } catch (err: any) {
      console.error('DB Add Error:', err);
      addNotification('Помилка БД: ' + err.message, 'error');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    if (String(updatedProduct.id).startsWith('KIT-')) {
      setLocalKits(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addNotification('Комплект оновлено локально', 'success');
      return;
    }

    try {
      const cleanData = sanitizeForDb(updatedProduct);
      const { error } = await supabase
        .from('products')
        .update(cleanData)
        .eq('id', updatedProduct.id);

      if (error) throw error;
      setDbProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addNotification('Товар оновлено в базі', 'success');
    } catch (err: any) {
      console.error('DB Update Error:', err);
      addNotification('Помилка оновлення: ' + err.message, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    if (String(id).startsWith('KIT-')) {
      setLocalKits(prev => prev.filter(p => p.id !== id));
      addNotification('Комплект видалено', 'info');
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDbProducts(prev => prev.filter(p => p.id !== id));
      addNotification('Товар видалено з бази', 'info');
    } catch (err: any) {
      console.error('DB Delete Error:', err);
      addNotification('Помилка видалення: ' + err.message, 'error');
    }
  };

  const contextValue: ProductsContextType = {
    products,
    isLoading,
    categories: ['Charging Stations', 'Inverters', 'Batteries', 'Solar Panels', 'Kits'],
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    filteredProducts,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  };

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = (): ProductsContextType => {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within ProductsProvider');
  return context;
};

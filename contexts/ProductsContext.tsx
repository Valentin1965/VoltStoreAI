
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';
import { supabase } from '../services/supabase';
import { useNotification } from './NotificationContext';

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

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotification();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const productName = p.name || '';
      const productDesc = p.description || '';
      const matchesSearch = productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           productDesc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products]);

  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select();

      if (error) throw error;
      if (data) setProducts(prev => [data[0], ...prev]);
      addNotification('Товар додано успішно', 'success');
    } catch (err: any) {
      addNotification('Помилка: ' + err.message, 'error');
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', updatedProduct.id);

      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      addNotification('Дані оновлено', 'success');
    } catch (err: any) {
      addNotification('Помилка: ' + err.message, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      addNotification('Товар видалено', 'info');
    } catch (err: any) {
      addNotification('Помилка: ' + err.message, 'error');
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
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
};

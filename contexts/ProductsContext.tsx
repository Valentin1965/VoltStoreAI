
import React, { createContext, useContext, useState, useMemo } from 'react';
import { Product, Category } from '../types';
import { MOCK_PRODUCTS } from '../utils/constants';

// URLs for themed gallery images based on category keywords
const getThemedGallery = (category: string, id: string) => {
  const themes: Record<string, string[]> = {
    'Batteries': [
      'https://images.unsplash.com/photo-1548333341-9cbbd3049829?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=600&auto=format&fit=crop'
    ],
    'Inverters': [
      'https://images.unsplash.com/photo-1558449028-b53a39d100fc?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?q=80&w=600&auto=format&fit=crop'
    ],
    'Solar Panels': [
      'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1545209174-dae93e532361?q=80&w=600&auto=format&fit=crop'
    ],
    'Kits': [
      'https://images.unsplash.com/photo-1559302995-f0a1bc370428?q=80&w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=600&auto=format&fit=crop'
    ]
  };
  return themes[category] || [
    'https://images.unsplash.com/photo-1466611653911-954554331f93?q=80&w=600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=600&auto=format&fit=crop'
  ];
};

const INITIAL_PRODUCTS = MOCK_PRODUCTS.map(p => ({
  ...p,
  images: [
    p.image,
    ...getThemedGallery(p.category, p.id)
  ]
}));

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  selectedCategory: Category | 'All';
  setSelectedCategory: (category: Category | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredProducts: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, products]);

  const addProduct = (newProduct: Omit<Product, 'id'>) => {
    const productWithId = { ...newProduct, id: Math.random().toString(36).substr(2, 9) };
    setProducts(prev => [productWithId, ...prev]);
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <ProductsContext.Provider value={{
      products,
      categories: ['Generators', 'Inverters', 'Batteries', 'Solar Panels', 'Kits'],
      selectedCategory,
      setSelectedCategory,
      searchQuery,
      setSearchQuery,
      filteredProducts,
      addProduct,
      updateProduct,
      deleteProduct
    }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within ProductsProvider');
  return context;
};

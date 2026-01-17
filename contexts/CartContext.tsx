
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, KitPart } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, parts?: KitPart[]) => void;
  removeItem: (id: string) => void;
  removePart: (itemId: string, partId: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('voltstore_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('voltstore_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, parts?: KitPart[]) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing && !parts) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      // Kits with parts are treated as unique items to avoid merging different configurations
      const id = parts ? `${product.id}-${Date.now()}` : product.id;
      return [...prev, { ...product, id, quantity: 1, parts }];
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const removePart = (itemId: string, partId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.parts) {
        const partToRemove = item.parts.find(p => p.id === partId);
        if (!partToRemove) return item;

        const updatedParts = item.parts.filter(p => p.id !== partId);
        const newPrice = item.price - (partToRemove.price * partToRemove.quantity);
        
        return {
          ...item,
          parts: updatedParts,
          price: Math.max(0, newPrice)
        };
      }
      return item;
    }));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, removePart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

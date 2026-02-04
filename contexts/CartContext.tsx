
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, KitPart } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, parts?: KitPart[]) => void;
  removeItem: (id: string) => void;
  removePart: (itemId: string, partId: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updatePartQuantity: (itemId: string, partId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('voltstoreai_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('voltstoreai_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, parts?: KitPart[]) => {
    setItems(prev => {
      if (parts) {
        const id = `${product.id}-${Date.now()}`;
        return [...prev, { ...product, id, quantity: 1, parts }];
      }
      const existing = prev.find(i => i.id === product.id && !i.parts);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
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
        const priceReduction = partToRemove.price * partToRemove.quantity;
        return {
          ...item,
          parts: updatedParts,
          price: Math.max(0, item.price - priceReduction)
        };
      }
      return item;
    }));
  };

  const updatePartQuantity = (itemId: string, partId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.parts) {
        let priceDiff = 0;
        const updatedParts = item.parts.map(p => {
          if (p.id === partId) {
            const newQty = Math.max(1, p.quantity + delta);
            priceDiff = (newQty - p.quantity) * p.price;
            return { ...p, quantity: newQty };
          }
          return p;
        });
        return {
          ...item,
          parts: updatedParts,
          price: Math.max(0, item.price + priceDiff)
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
    <CartContext.Provider value={{ 
      items, addItem, removeItem, removePart, updateQuantity, updatePartQuantity,
      clearCart, totalItems, totalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

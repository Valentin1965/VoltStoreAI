import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem, Product, KitPart } from '../types';

// ── Cart persistence ───────────────────────────────────────────────────────
// Cart is saved to localStorage keyed per user (userId). TTL = 24 hours.
// Anonymous sessions use key 'anon'. Cart is always cleared on logout.

const CART_TTL = 24 * 60 * 60 * 1000;  // 24 hours

function cartKey(userId: string | null) {
  return `gls_cart_${userId || 'anon'}`;
}

function loadCart(userId: string | null): CartItemWithBase[] {
  try {
    const raw = localStorage.getItem(cartKey(userId));
    if (!raw) return [];
    const { items, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CART_TTL) {
      localStorage.removeItem(cartKey(userId));
      return [];
    }
    return items || [];
  } catch { return []; }
}

function saveCart(userId: string | null, items: CartItemWithBase[]) {
  try {
    if (items.length === 0) {
      localStorage.removeItem(cartKey(userId));
    } else {
      localStorage.setItem(cartKey(userId), JSON.stringify({ items, savedAt: Date.now() }));
    }
  } catch { /* storage full */ }
}

// CartItem extended with _basePrice so applyDiscount can recalculate at any time.
interface CartItemWithBase extends CartItem {
  _basePrice: number;
}

interface CartContextType {
  items: CartItem[];
  userId: string | null;
  /** Called by UserContext when user logs in/out — migrates cart between keys */
  setCartUser: (id: string | null) => void;
  addItem: (product: Product, parts?: KitPart[]) => void;
  removeItem: (id: string) => void;
  removePart: (itemId: string, partId: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updatePartQuantity: (itemId: string, partId: string, delta: number) => void;
  clearCart: () => void;
  /** Re-price all items from _basePrice. percent=0 → restore full prices */
  applyDiscount: (percent: number) => void;
  totalItems: number;
  totalPrice: number;
  isVatEnabled: boolean;
  setVatEnabled: (enabled: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId]       = useState<string | null>(null);
  const [items, setItems]         = useState<CartItemWithBase[]>(() => loadCart(null));
  const [isVatEnabled, setVatEnabled] = useState(true);

  // ── Persist to localStorage on every change ──────────────────────────────
  useEffect(() => { saveCart(userId, items); }, [items, userId]);

  // ── Migrate cart when user logs in / out ─────────────────────────────────
  const setCartUser = useCallback((id: string | null) => {
    setUserId(prev => {
      if (prev === id) return prev;

      setItems(current => {
        // Merge: user's saved cart + current anonymous items (current wins if same product)
        const saved = loadCart(id);
        if (id === null) {
          // Logout → clear personal cart from storage, keep nothing
          localStorage.removeItem(cartKey(prev));
          return [];
        }
        // Login → saved cart takes priority; add any anon items not already in saved cart
        const merged = [...saved];
        current.forEach(anonItem => {
          const already = merged.find(s => s.id === anonItem.id && !anonItem.parts);
          if (!already) merged.push(anonItem);
        });
        // Clear the anon cart since we've merged it
        localStorage.removeItem(cartKey(null));
        return merged;
      });

      return id;
    });
  }, []);

  // ── Add item ──────────────────────────────────────────────────────────────
  const addItem = useCallback((product: Product, parts?: KitPart[]) => {
    setItems(prev => {
      const base = (product as any)._basePrice ?? product.price;
      if (parts) {
        const id = `${product.id}-${Date.now()}`;
        return [...prev, { ...product, id, quantity: 1, parts, _basePrice: base }];
      }
      const existing = prev.find(i => i.id === product.id && !i.parts);
      if (existing) {
        return prev.map(i =>
          i.id === product.id && !i.parts ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1, _basePrice: base }];
    });
  }, []);

  const removeItem = useCallback((id: string) =>
    setItems(prev => prev.filter(i => i.id !== id)), []);

  const removePart = useCallback((itemId: string, partId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId && item.parts) {
        const part = item.parts.find(p => p.id === partId);
        if (!part) return item;
        const reduction = part.price * part.quantity;
        return {
          ...item,
          parts:      item.parts.filter(p => p.id !== partId),
          price:      Math.max(0, item.price - reduction),
          _basePrice: Math.max(0, item._basePrice - reduction),
        };
      }
      return item;
    }));
  }, []);

  const updatePartQuantity = useCallback((itemId: string, partId: string, delta: number) => {
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
          parts:      updatedParts,
          price:      Math.max(0, item.price + priceDiff),
          _basePrice: Math.max(0, item._basePrice + priceDiff),
        };
      }
      return item;
    }));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(cartKey(userId));
  }, [userId]);

  // ── Apply / remove discount from _basePrice ──────────────────────────────
  const applyDiscount = useCallback((percent: number) => {
    const clamped = Math.max(0, Math.min(100, percent));
    setItems(prev => prev.map(item => ({
      ...item,
      price: clamped > 0
        ? +(item._basePrice * (1 - clamped / 100)).toFixed(2)
        : item._basePrice,
    })));
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, userId, setCartUser,
      addItem, removeItem, removePart,
      updateQuantity, updatePartQuantity,
      clearCart, applyDiscount,
      totalItems, totalPrice, isVatEnabled, setVatEnabled,
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

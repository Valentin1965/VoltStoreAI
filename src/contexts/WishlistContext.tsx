/**
 * BookingContext — real bookings saved to Supabase `bookings` table.
 *
 * SQL migration (run once in Supabase SQL editor):
 * ─────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS bookings (
 *   id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   product_id    text NOT NULL,
 *   product_name  text NOT NULL,
 *   product_image text,
 *   product_price numeric NOT NULL,
 *   product_category text,
 *   customer_email text NOT NULL,
 *   customer_name  text,
 *   customer_phone text,
 *   status         text DEFAULT 'pending'
 *                  CHECK (status IN ('pending','confirmed','expired','cancelled','converted')),
 *   expires_at     timestamptz NOT NULL,
 *   created_at     timestamptz DEFAULT now(),
 *   user_id        uuid,
 *   notes          text
 * );
 * ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public_insert" ON bookings FOR INSERT WITH CHECK (true);
 * CREATE POLICY "public_read"   ON bookings FOR SELECT USING (true);
 * CREATE POLICY "public_update" ON bookings FOR UPDATE USING (true);
 * ─────────────────────────────────────────────────
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { Booking, BookingStatus } from '../types';
import { useNotification } from './NotificationContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { safeStorage } from '../utils/storage';

const BOOKING_TTL_HOURS = 48;

interface WishlistContextType {
  wishlist: Product[];            // kept for UI compatibility (products in booking)
  bookings: Booking[];
  toggleWishlist: (product: Product, customerEmail?: string, customerName?: string) => Promise<void>;
  isInWishlist: (id: string) => boolean;
  cancelBooking: (bookingId: string) => Promise<void>;
  convertToCart: (bookingId: string) => void;
  refreshBookings: (email: string) => Promise<void>;
  pendingEmail: string;
  setPendingEmail: (e: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const localKey = 'gls_bookings_local';

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingEmail, setPendingEmail] = useState('');
  const { addNotification } = useNotification();

  // Load from localStorage on mount (fallback + cache)
  useEffect(() => {
    const saved = safeStorage.getItem(localKey);
    if (saved) {
      try {
        const parsed: Booking[] = JSON.parse(saved);
        // Filter out expired ones
        const active = parsed.filter(b => new Date(b.expires_at) > new Date() && b.status !== 'cancelled');
        setBookings(active);
      } catch {}
    }
  }, []);

  // Persist to localStorage whenever bookings change
  useEffect(() => {
    safeStorage.setItem(localKey, JSON.stringify(bookings));
  }, [bookings]);

  // Fetch bookings from Supabase by email
  const refreshBookings = useCallback(async (email: string) => {
    if (!isSupabaseConfigured || !email) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_email', email.toLowerCase())
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setBookings(data as Booking[]);
        safeStorage.setItem(localKey, JSON.stringify(data));
      }
    } catch (e: any) {
      console.warn('[BookingContext] refreshBookings:', e.message);
    }
  }, []);

  const toggleWishlist = useCallback(async (
    product: Product,
    customerEmail?: string,
    customerName?: string
  ) => {
    const existing = bookings.find(
      b => b.product_id === product.id && b.status !== 'cancelled' && b.status !== 'expired'
    );

    if (existing) {
      // Cancel booking
      await cancelBooking(existing.id);
      return;
    }

    const email = customerEmail || pendingEmail;
    if (!email || !email.includes('@')) {
      // Signal that we need email — caller handles modal
      addNotification('Enter your email to book this product', 'info');
      return;
    }

    const expiresAt = new Date(Date.now() + BOOKING_TTL_HOURS * 3600 * 1000).toISOString();
    const productName = typeof product.name === 'string'
      ? product.name
      : (product.name as any)?.en || (product.name as any)?.da || 'Product';

    const newBooking: Omit<Booking, 'id' | 'created_at'> = {
      product_id:       product.id,
      product_name:     productName,
      product_image:    product.image || '',
      product_price:    product.price || 0,
      product_category: product.category || '',
      customer_email:   email.toLowerCase(),
      customer_name:    customerName || '',
      status:           'pending',
      expires_at:       expiresAt,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert([newBooking])
          .select()
          .maybeSingle();
        if (error) throw error;
        setBookings(prev => [data as Booking, ...prev]);
        addNotification(`"${productName}" booked for 48h`, 'success');
        return;
      } catch (e: any) {
        console.warn('[BookingContext] insert failed, using local fallback:', e.message);
      }
    }

    // Fallback: local only
    const localBooking: Booking = {
      ...newBooking,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setBookings(prev => [localBooking, ...prev]);
    addNotification(`"${productName}" booked locally (DB offline)`, 'success');
  }, [bookings, pendingEmail, addNotification]);

  const cancelBooking = useCallback(async (bookingId: string) => {
    if (isSupabaseConfigured && !bookingId.startsWith('local-')) {
      try {
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
      } catch (e: any) {
        console.warn('[BookingContext] cancel failed:', e.message);
      }
    }
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b)
    );
    addNotification('Booking cancelled', 'info');
  }, [addNotification]);

  const convertToCart = useCallback((bookingId: string) => {
    if (isSupabaseConfigured && !bookingId.startsWith('local-')) {
      supabase.from('bookings').update({ status: 'converted' }).eq('id', bookingId).then(() => {});
    }
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: 'converted' as BookingStatus } : b)
    );
  }, []);

  // Derive wishlist (products) from active bookings — for backward compat
  const activeBookings = bookings.filter(
    b => b.status !== 'cancelled' && b.status !== 'converted'
       && new Date(b.expires_at) > new Date()
  );

  const wishlist: Product[] = activeBookings.map(b => ({
    id: b.product_id,
    name: b.product_name,
    image: b.product_image,
    price: b.product_price,
    category: b.product_category as any,
    features: [],
    stock: 1,
    is_active: true,
  }));

  const isInWishlist = useCallback((id: string) =>
    activeBookings.some(b => b.product_id === id),
  [activeBookings]);

  return (
    <WishlistContext.Provider value={{
      wishlist, bookings: activeBookings,
      toggleWishlist, isInWishlist,
      cancelBooking, convertToCart, refreshBookings,
      pendingEmail, setPendingEmail,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};

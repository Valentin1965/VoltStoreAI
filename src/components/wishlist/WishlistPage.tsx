import React, { useState, useMemo, useEffect } from 'react';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { useUser } from '../../contexts/UserContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Booking, Product } from '../../types';
import {
  Heart, ShoppingCart, Trash2, Clock, ShoppingBag,
  CheckCircle2, XCircle, RefreshCw, Mail, AlertCircle, Calendar, Zap, Search
} from 'lucide-react';
import { DualPrice } from '../PriceDisplay';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600&auto=format&fit=crop';

function useCountdown(expiresAt: string) {
  const calc = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, expired: true };
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { h, m, expired: false };
  };
  const [val, setVal] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setVal(calc()), 60000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return val;
}

const statusColor: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  expired:   'bg-slate-100 text-slate-400 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-400 border-rose-100',
  converted: 'bg-blue-50 text-blue-500 border-blue-100',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor[status] || statusColor.pending}`}>
    {status}
  </span>
);

const BookingCard: React.FC<{
  booking: Booking;
  onCancel: () => void;
  onAddToCart: () => void;
}> = ({ booking, onCancel, onAddToCart }) => {
  const countdown = useCountdown(booking.expires_at);
  const isActive  = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <div className={`bg-white rounded-[2rem] border-2 overflow-hidden transition-all ${
      isActive ? 'border-slate-100 hover:border-emerald-300 shadow-sm' : 'border-slate-50 opacity-60'
    }`}>
      <div className="flex gap-4 p-5">
        {/* Image */}
        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5">
          <img
            src={booking.product_image || IMAGE_FALLBACK}
            alt={booking.product_name}
            className="max-w-full max-h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{booking.product_category}</p>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug line-clamp-1">{booking.product_name}</h3>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <DualPrice priceExVat={booking.product_price} />

          {/* Expiry / countdown */}
          {isActive && (
            <div className={`flex items-center gap-1.5 text-[9px] font-bold ${countdown.expired ? 'text-rose-500' : 'text-slate-400'}`}>
              <Clock size={11} />
              {countdown.expired
                ? 'Expired'
                : `Expires in ${countdown.h}h ${countdown.m}m`
              }
            </div>
          )}

          {/* Booking date */}
          <div className="flex items-center gap-1.5 text-[9px] text-slate-300 font-bold">
            <Calendar size={10} />
            {new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Actions */}
      {isActive && !countdown.expired && (
        <div className="flex border-t border-slate-50">
          <button
            onClick={onCancel}
            className="flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
          >
            <XCircle size={13} /> Cancel
          </button>
          <div className="w-px bg-slate-50" />
          <button
            onClick={onAddToCart}
            className="flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <ShoppingCart size={13} /> Add to Cart
          </button>
        </div>
      )}
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const { t } = useLanguage();
  const { bookings, cancelBooking, convertToCart, refreshBookings, toggleWishlist, isInWishlist, setPendingEmail } = useWishlist();
  const { addItem } = useCart();
  const { currentUser } = useUser();
  const { products } = useProducts();
  const { addNotification } = useNotification();

  const [emailFilter, setEmailFilter] = useState(currentUser?.email || '');
  const [refreshing, setRefreshing] = useState(false);
  const [bookingModal, setBookingModal] = useState<Product | null>(null);
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingName, setBookingName]   = useState('');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const allCategories = useMemo(() =>
    ['All', ...Array.from(new Set(products.filter(p => p.is_active !== false).map(p => p.category).filter(Boolean)))],
  [products]);

  const recommendations = useMemo(() => {
    return products.filter(p => {
      if (p.is_active === false) return false;
      if (catFilter !== 'All' && p.category !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = typeof p.name === 'string' ? p.name : (p.name as any)?.en || (p.name as any)?.da || '';
        return name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) ||
               (p.BrandProd || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, search, catFilter]);

  const handleBookProduct = async (p: Product) => {
    if (isInWishlist(p.id)) {
      const b = bookings.find(bk => bk.product_id === p.id);
      if (b) await cancelBooking(b.id);
      return;
    }
    const email = currentUser?.email || emailFilter;
    if (email && email.includes('@')) {
      setPendingEmail(email);
      await toggleWishlist(p, email, currentUser?.name || bookingName);
    } else {
      setBookingModal(p);
      setBookingEmail('');
      setBookingName('');
    }
  };

  const handleBookingSubmit = async () => {
    if (!bookingModal || !bookingEmail.includes('@')) {
      addNotification('Enter a valid email', 'error');
      return;
    }
    setPendingEmail(bookingEmail);
    setEmailFilter(bookingEmail);
    await toggleWishlist(bookingModal, bookingEmail, bookingName);
    setBookingModal(null);
  };

  const activeBookings   = useMemo(() => bookings.filter(b => b.status === 'pending' || b.status === 'confirmed'), [bookings]);
  const inactiveBookings = useMemo(() => bookings.filter(b => b.status === 'cancelled' || b.status === 'expired' || b.status === 'converted'), [bookings]);
  const totalPrice       = useMemo(() => activeBookings.reduce((s, b) => s + b.product_price, 0), [activeBookings]);

  const handleRefresh = async () => {
    if (!emailFilter.includes('@')) { addNotification('Enter a valid email', 'error'); return; }
    setRefreshing(true);
    await refreshBookings(emailFilter);
    setRefreshing(false);
    addNotification('Bookings refreshed', 'success');
  };

  const handleAddToCart = (booking: Booking) => {
    addItem({
      id: booking.product_id,
      name: booking.product_name,
      image: booking.product_image,
      price: booking.product_price,
      category: booking.product_category as any,
      features: [],
      stock: 1,
      is_active: true,
    });
    convertToCart(booking.id);
    addNotification('Added to cart', 'success');
  };

  const handleAddAllToCart = () => {
    activeBookings.forEach(b => handleAddToCart(b));
    addNotification(`${activeBookings.length} items added to cart`, 'success');
  };


  // Single unified view — always show catalog + bookings list
  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8">

      {/* Header — only when there are active bookings */}
      {activeBookings.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="bg-rose-500 p-4 rounded-2xl shadow-xl">
              <Heart size={28} fill="white" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">My Bookings</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {activeBookings.length} active · reserved 48h
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} disabled={refreshing}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-slate-300 hover:text-white">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="text-right hidden sm:block">
              <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Total</span>
              <DualPrice priceExVat={totalPrice} align="right" className="text-emerald-400" secondaryClassName="text-emerald-400" />
            </div>
            <button onClick={handleAddAllToCart}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95">
              <ShoppingBag size={16} /> Add All to Cart
            </button>
          </div>
        </div>
      )}

      {/* Active bookings */}
      {activeBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Bookings — {activeBookings.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map(b => (
              <BookingCard key={b.id} booking={b}
                onCancel={() => cancelBooking(b.id)}
                onAddToCart={() => handleAddToCart(b)} />
            ))}
          </div>
        </div>
      )}

      {/* Inactive bookings */}
      {inactiveBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle size={14} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History — {inactiveBookings.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactiveBookings.map(b => (
              <BookingCard key={b.id} booking={b} onCancel={() => {}} onAddToCart={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* ── Full Catalog ── */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-emerald-500 shrink-0" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {bookings.length === 0 ? t('recommended_booking') : 'Add More Products'}
              <span className="ml-2 text-slate-300">— {recommendations.length} items</span>
            </span>
          </div>
          {/* Load by email (for guests) */}
          {!currentUser && (
            <div className="flex gap-2 shrink-0">
              <input type="email" placeholder="your@email.com" value={emailFilter}
                onChange={e => setEmailFilter(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRefresh()}
                className="w-40 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none focus:border-emerald-400" />
              <button onClick={handleRefresh} disabled={refreshing}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-emerald-500 transition-all text-[10px] font-black uppercase flex items-center gap-1.5">
                {refreshing ? <RefreshCw size={12} className="animate-spin" /> : <><RefreshCw size={12} /> Load</>}
              </button>
            </div>
          )}
        </div>

        {/* Search + Category filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  catFilter === cat
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {recommendations.length === 0 && (
          <p className="text-center py-10 text-slate-300 text-[10px] font-black uppercase">Connect DB to see products</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map(p => {
            const booked = isInWishlist(p.id);
            const name = typeof p.name === 'string' ? p.name : (p.name as any)?.en || (p.name as any)?.da || '';
            return (
              <div key={p.id} className={`group bg-white border-2 rounded-3xl p-4 hover:shadow-lg transition-all flex flex-col ${booked ? 'border-rose-200 bg-rose-50' : 'border-slate-100 hover:border-emerald-300'}`}>
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-50 border border-slate-50">
                  <img src={p.image || IMAGE_FALLBACK} alt={name}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    onError={e => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                  <button onClick={() => handleBookProduct(p)}
                    className={`absolute top-2 right-2 p-2 rounded-xl shadow transition-all ${booked ? 'bg-rose-500 text-white' : 'bg-white text-slate-300 hover:text-rose-500'}`}>
                    <Heart size={14} fill={booked ? 'white' : 'none'} />
                  </button>
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">{p.category}</p>
                  <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-tight line-clamp-2 leading-snug">{name}</h4>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <DualPrice priceExVat={p.price || 0} />
                  <button onClick={() => handleBookProduct(p)}
                    className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all flex items-center gap-1 whitespace-nowrap ${booked ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}>
                    <Heart size={10} fill={booked ? 'white' : 'none'} />
                    {booked ? 'Booked ✓' : 'Book'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Email modal for unauthenticated booking */}
      {bookingModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}
          onClick={() => setBookingModal(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
            <div>
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-3">
                <Heart size={22} fill="currentColor" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Book This Product</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Reserved 48h · Free · No payment required</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
              <img src={bookingModal.image || IMAGE_FALLBACK} alt="" className="w-10 h-10 object-contain rounded-xl bg-white p-1" />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-900 uppercase truncate">
                  {typeof bookingModal.name === 'string' ? bookingModal.name : (bookingModal.name as any)?.en || ''}
                </p>
                <p className="text-[9px] text-emerald-600 font-bold">{bookingModal.category}</p>
              </div>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Your name (optional)" value={bookingName}
                onChange={e => setBookingName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all" />
              <input type="email" placeholder="your@email.com *" value={bookingEmail}
                onChange={e => setBookingEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBookingSubmit()}
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBookingModal(null)}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleBookingSubmit}
                className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                <Heart size={13} fill="white" /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

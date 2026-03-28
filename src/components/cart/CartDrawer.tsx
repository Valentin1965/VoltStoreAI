
import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, LogIn } from 'lucide-react';
import { LocalizedText } from '../../types';
import { DualPrice } from '../PriceDisplay';

const useLocalizedText = () => {
  const { language } = useLanguage();
  return (text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['en'] || Object.values(text as any)[0] || "";
  };
};

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Signed-in user → go to checkout */
  onCheckout: () => void;
  onSignInToOrder: () => void;
  onGuestCheckout: () => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onCheckout,
  onSignInToOrder,
  onGuestCheckout,
}) => {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();
  const { t } = useLanguage();
  const { currentUser } = useUser();
  const getLoc = useLocalizedText();

  const getSafeImage = (img: string | null | undefined) => {
    if (!img || typeof img !== 'string' || img.trim() === '') return null;
    return img;
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[201] transform transition-transform duration-500 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-yellow-400">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{t('cart_title')}</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{totalItems} {t('units')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="bg-slate-50 p-6 rounded-full border border-slate-100">
                <ShoppingBag size={40} className="text-slate-200" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('empty_cart')}</p>
            </div>
          ) : (
            items.map((item) => {
              const displayImage = getSafeImage(item.image);
              return (
                <div key={item.id} className="flex gap-4 group/item pb-6 border-b border-slate-50 last:border-0">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-1">
                    <img 
                      src={displayImage ? displayImage : IMAGE_FALLBACK} 
                      alt={getLoc(item.name) || 'Product'} 
                      className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500" 
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-tighter truncate leading-none mb-1">{getLoc(item.name)}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.category}</span>
                        <DualPrice priceExVat={(item.price || 0) * item.quantity} align="right" showLabels={false} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-slate-400 hover:text-yellow-600 shadow-sm transition-all"
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                            if (!Number.isFinite(next)) return;
                            const safe = Math.max(1, next);
                            const delta = safe - item.quantity;
                            if (delta !== 0) updateQuantity(item.id, delta);
                          }}
                          className="w-10 text-center font-black text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white text-slate-400 hover:text-yellow-600 shadow-sm transition-all"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cart_total_value')}</span>
              <DualPrice priceExVat={totalPrice} align="right" className="text-xl" />
            </div>
            {currentUser ? (
              <button
                type="button"
                onClick={() => { onClose(); onCheckout(); }}
                className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 group active:scale-95"
              >
                {t('cart_checkout_btn')}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { onClose(); onSignInToOrder(); }}
                  className="w-full bg-slate-900 hover:bg-emerald-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 group active:scale-95"
                >
                  <LogIn size={18} />
                  {t('cart_sign_in_to_order')}
                </button>
                <button
                  type="button"
                  onClick={() => { onClose(); onGuestCheckout(); }}
                  className="w-full py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border-2 border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all"
                >
                  {t('cart_guest_checkout')}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('gls-nav-cart-full')); }}
              className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
            >
              {t('cart_open_full')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

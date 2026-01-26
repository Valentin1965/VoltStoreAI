
import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { LocalizedText } from '../../types';

// Helper hook to handle LocalizedText objects
const useLocalizedText = () => {
  const { language } = useLanguage();
  return (text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return text[language] || text['en'] || Object.values(text)[0] || "";
  };
};

interface CartPageProps {
  onCheckout: () => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { t, formatPrice } = useLanguage();
  const getLoc = useLocalizedText();

  const getSafeImage = (img: string | null | undefined) => {
    if (!img || typeof img !== 'string' || img.trim() === '') return null;
    return img;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in bg-white rounded-[3rem] border border-slate-100 shadow-xl">
        <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <ShoppingBag className="text-slate-200" size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">{t('empty_cart')}</h2>
        <p className="text-slate-400 mb-8 max-w-xs mx-auto font-medium uppercase text-[9px] tracking-widest">
          {t('cart_empty_desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-20 max-w-6xl mx-auto">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tighter">
          <ShoppingBag className="text-yellow-500" size={24} /> {t('cart_title')}
        </h2>
        
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-md hover:border-yellow-400/50 transition-all group/item">
            <div className="p-4 flex gap-5 items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-1">
                <img 
                  src={getSafeImage(item.image) || IMAGE_FALLBACK} 
                  alt={getLoc(item.name) || 'Product'} 
                  className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform" 
                  onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-900 truncate text-[11px] uppercase tracking-tighter">{getLoc(item.name)}</h3>
                  {item.parts && (
                    <span className="bg-yellow-400 text-yellow-950 text-[7px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 shadow-sm">{t('bundle')}</span>
                  )}
                </div>
                <p className="text-[8px] text-slate-400 mb-3 font-black uppercase tracking-widest">{item.category}</p>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all shadow-sm active:scale-90"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-6 text-center font-black text-xs text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all shadow-sm active:scale-90"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-black text-slate-900 tracking-tighter">{formatPrice((item.price ?? 0) * item.quantity)}</div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors mt-2 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 sticky top-32 shadow-xl">
          <h3 className="text-sm font-black text-slate-900 mb-6 uppercase tracking-tighter">{t('cart_summary')}</h3>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>{t('cart_items_count')}</span>
              <span className="text-slate-900">{items.length} {t('units')}</span>
            </div>
            <div className="pt-6 border-t border-slate-100 flex flex-col gap-1">
              <span className="font-black text-slate-400 uppercase text-[8px] tracking-widest">{t('cart_total_value')}</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatPrice(totalPrice ?? 0)}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 active:scale-95 group"
          >
            {t('cart_checkout_btn')}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

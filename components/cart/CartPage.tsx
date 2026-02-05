import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import { Plus, Minus, ShoppingBag, ArrowRight, UserCheck, UserPlus, UserCircle, ChevronLeft } from 'lucide-react';
import { LocalizedText } from '../../types';

const useLocalizedText = () => {
  const { language } = useLanguage();
  return (text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['en'] || Object.values(text as any)[0] || "";
  };
};

interface CartPageProps {
  onCheckout: () => void;
}

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, totalPrice } = useCart();
  const { t, formatPrice } = useLanguage();
  const { currentUser } = useUser();
  const getLoc = useLocalizedText();
  
  const [showAuthChoice, setShowAuthChoice] = useState(false);

  const getSafeImage = (img: string | null | undefined) => {
    if (!img || typeof img !== 'string' || img.trim() === '') return null;
    return img;
  };

  const handlePlaceOrder = () => {
    if (currentUser) {
      onCheckout();
    } else {
      setShowAuthChoice(true);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-24 animate-fade-in bg-white rounded-[3rem] border border-slate-100 shadow-xl max-w-4xl mx-auto">
        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <ShoppingBag className="text-slate-200" size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">{t('empty_cart')}</h2>
        <p className="text-slate-400 mb-8 max-w-xs mx-auto font-bold uppercase text-[10px] tracking-widest leading-relaxed">
          {t('cart_empty_desc')}
        </p>
      </div>
    );
  }

  if (showAuthChoice) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in py-6">
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl text-center space-y-8">
          <button 
            onClick={() => setShowAuthChoice(false)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all mb-2"
          >
            <ChevronLeft size={16} /> {t('back_to_cart')}
          </button>

          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Authorization</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em] leading-relaxed">
              We recommend using a profile for secure card payments and order history.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={onCheckout}
              className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all flex items-center gap-6 text-left"
            >
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors">
                <UserCircle size={28} />
              </div>
              <div>
                <div className="text-base font-black text-slate-900 uppercase tracking-tight">Checkout as Guest</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Direct invoice method</div>
              </div>
              <ArrowRight className="ml-auto text-slate-200 group-hover:translate-x-1 transition-transform" size={24} />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))}
                className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/20 transition-all flex flex-col gap-3 text-left"
               >
                 <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <UserCheck size={22} />
                 </div>
                 <div>
                   <div className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Login</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Sync profile</div>
                 </div>
               </button>

               <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))}
                className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-yellow-500 hover:bg-yellow-50/20 transition-all flex flex-col gap-3 text-left"
               >
                 <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
                    <UserPlus size={22} />
                 </div>
                 <div>
                   <div className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Register</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Save details</div>
                 </div>
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)] overflow-hidden">
        {/* Left Column - Scrollable Items List */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-4 uppercase tracking-tighter shrink-0">
            <ShoppingBag className="text-emerald-500" size={28} /> {t('cart_title')}
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:border-emerald-400 transition-all group/item max-w-[95%]">
                <div className="p-5 flex flex-col sm:flex-row gap-5 items-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-2">
                    <img 
                      src={getSafeImage(item.image) || IMAGE_FALLBACK} 
                      alt={getLoc(item.name) || 'Product'} 
                      className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500" 
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-tight truncate">{getLoc(item.name)}</h3>
                      {item.parts && (
                        <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 self-center sm:self-auto">{t('bundle')}</span>
                      )}
                    </div>
                    <p className="text-[8px] text-slate-400 mb-3 font-black uppercase tracking-widest">{item.category}</p>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 transition-all active:scale-90"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center font-black text-xs text-slate-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 transition-all active:scale-90"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center sm:text-right flex flex-col items-center sm:items-end gap-2 min-w-[100px]">
                    <div className="text-xl font-black text-slate-900 tracking-tighter">
                      {formatPrice((item.price ?? 0) * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Column - Summary Block (Smaller size) */}
        <div className="lg:col-span-1 h-full flex flex-col pt-12">
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl border border-white/5 space-y-6 animate-fade-in shrink-0">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-tighter">{t('cart_summary')}</h3>
              <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <span>{t('cart_items_count')}</span>
                <span className="text-white bg-white/10 px-2.5 py-1 rounded-lg">{items.length} {t('units')}</span>
              </div>
              
              <div className="pt-4 border-t border-white/10 flex flex-col gap-1">
                <span className="font-black text-slate-500 uppercase text-[8px] tracking-[0.3em]">{t('cart_total_value')}</span>
                <div className="text-3xl font-black text-emerald-400 tracking-tighter drop-shadow-md">{formatPrice(totalPrice ?? 0)}</div>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-[1.2rem] font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('cart_checkout_btn')}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-marquee"></div>
            </button>

            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest text-center px-2 leading-relaxed opacity-60">
              * Final amounts include dynamic exchange rates and standard delivery fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

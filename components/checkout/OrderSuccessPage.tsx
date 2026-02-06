import React, { useEffect } from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

export const OrderSuccessPage: React.FC<{ onBackToCatalog: () => void }> = ({ onBackToCatalog }) => {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart(); // Очищуємо кошик після успішної оплати
    // Видаляємо ID з URL, щоб при оновленні сторінки не "висіти" на успіху вічно
    window.history.replaceState({}, '', window.location.pathname);
  }, [clearCart]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-8 shadow-inner">
        <CheckCircle2 size={48} />
      </div>
      
      <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">
        Оплату отримано!
      </h1>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] max-w-xs leading-relaxed mb-10">
        Ваше замовлення вже обробляється. Ми надіслали лист із деталями на вашу пошту.
      </p>

      <button 
        onClick={onBackToCatalog}
        className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
      >
        <ShoppingBag size={16} />
        Повернутися до покупок
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
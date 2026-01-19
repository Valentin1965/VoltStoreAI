
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Settings2, X, Box, Info } from 'lucide-react';

interface CartPageProps {
  onCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, updatePartQuantity, removeItem, removePart, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="text-center py-32 animate-fade-in bg-white rounded-[4rem] border border-slate-100 shadow-xl">
        <div className="bg-slate-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10 border border-slate-100">
          <ShoppingBag className="text-slate-200" size={60} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Terminal Empty</h2>
        <p className="text-slate-400 mb-12 max-w-sm mx-auto font-medium uppercase text-xs tracking-widest">Your configuration is currently empty. Explore the catalog.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in pb-20">
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4 uppercase tracking-tighter">
          <ShoppingBag className="text-yellow-500" size={32} /> Shopping Terminal
        </h2>
        
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-xl hover:border-yellow-400/50 transition-all group/item">
            <div className="p-8 flex gap-8 items-center">
              <div className="w-32 h-32 bg-slate-50 rounded-3xl overflow-hidden shrink-0 border border-slate-100">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-black text-slate-900 truncate text-xl uppercase tracking-tighter">{item.name}</h3>
                  {item.parts && (
                    <span className="bg-yellow-400 text-yellow-950 text-[9px] font-black uppercase px-3 py-1 rounded-full shrink-0 shadow-sm">Bundle</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mb-6 font-black uppercase tracking-[0.3em]">{item.category}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all shadow-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-black text-base text-slate-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900 tracking-tighter">₴{(item.price * item.quantity).toLocaleString()}</div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-red-500 p-3 transition-colors mt-4 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="lg:col-span-1">
        <div className="bg-white p-10 rounded-[4rem] border border-slate-100 sticky top-32 shadow-2xl">
          <h3 className="text-2xl font-black text-slate-900 mb-10 uppercase tracking-tighter">Summary</h3>
          <div className="space-y-6 mb-12">
            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <span>Items Count</span>
              <span className="text-slate-900">{items.length} units</span>
            </div>
            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <span>Delivery Status</span>
              <span className="text-green-600 font-bold">Free Shipping</span>
            </div>
            <div className="pt-8 border-t border-slate-100 flex flex-col gap-2">
              <span className="font-black text-slate-400 uppercase text-[10px] tracking-[0.3em]">Total Value</span>
              <span className="text-5xl font-black text-slate-900 tracking-tighter">₴{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-7 rounded-[2.5rem] font-black text-xl uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-4 active:scale-95 group shadow-slate-900/10"
          >
            Checkout
            <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

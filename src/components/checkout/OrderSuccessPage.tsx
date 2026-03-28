import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';

export const OrderSuccessPage: React.FC<{ onBackToCatalog: () => void }> = ({ onBackToCatalog }) => {
  const [orderSummary, setOrderSummary] = useState<any | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    supabase
      .from('orders')
      .select('order_number,total_price,status,customer_email')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setOrderSummary(data);
        // Keep view + id so SPA router still shows success after replaceState (payment return URL).
        window.history.replaceState({}, '', `/?view=success&id=${encodeURIComponent(id)}`);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-8 shadow-inner">
        <CheckCircle2 size={48} />
      </div>
      
      <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">
        Order received
      </h1>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] max-w-xs leading-relaxed mb-6">
        Your order is being processed. A confirmation has been sent from sales@glsolargroup.dk.
      </p>

      {orderSummary && (
        <div className="mb-10 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] space-y-1">
          <div>Order #{orderSummary.order_number || ''}</div>
          <div>Status: {orderSummary.status}</div>
          <div>Total: {orderSummary.total_price}</div>
          <div className="normal-case text-[9px] text-slate-400">
            Contact: <a href="mailto:sales@glsolargroup.dk" className="text-emerald-500 font-black">sales@glsolargroup.dk</a>
          </div>
        </div>
      )}

      <button 
        onClick={onBackToCatalog}
        className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
      >
        <ShoppingBag size={16} />
        Back to Shopping
        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};
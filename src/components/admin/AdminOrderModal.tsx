import React, { useState } from 'react';
import { X, Package, Download, Users, MapPin, Activity, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sendStatusChangeEmail, OrderStatus } from '../../services/emailService';
import { ORDER_STATUSES, OrderStatusEdit } from './adminTypes';

interface AdminOrderModalProps {
  order: any;
  onClose: () => void;
  onUpdated: (updated: any) => void;
}

export const AdminOrderModal: React.FC<AdminOrderModalProps> = ({ order: o, onClose, onUpdated }) => {
  const { addNotification } = useNotification();
  const { language } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';
  
  const [isSaving, setIsSaving] = useState(false);
  const [statusEdit, setStatusEdit] = useState<OrderStatusEdit>({
    status: o.order_status, // ✅ Без || 'accepted' - показує реальний статус
    shipping_date: o.shipping_date?.slice(0, 10) || '',
    arrival_date: o.arrival_date?.slice(0, 10) || '',
  });

  // ✅ Якщо немає замовлення / товарів – нічого не показуємо
  const items: any[] = Array.isArray(o.items) ? o.items : [];
  if (!items || items.length === 0) {
    return null;
  }

  const addr = [o.street, o.house_number].filter(Boolean).join(' ');
  const city = [o.postal_code, o.city, o.country].filter(Boolean).join(', ');
  const orderDate = o.created_at ? new Date(o.created_at).toLocaleDateString(localeStr) : '-';
  const orderNo = o.order_number || ('GLS-' + String(o.id || '').slice(0, 8).toUpperCase());

  const saveStatus = async () => {
    setIsSaving(true);
    try {
      const adminKey = import.meta.env.VITE_ADMIN_PASSWORD;
      const { error } = await supabase.rpc('admin_update_order_status', {
        p_key: adminKey,
        p_order_id: o.id,
        p_status: statusEdit.status,
        p_shipping_date: statusEdit.shipping_date || null,
        p_arrival_date: statusEdit.arrival_date || null,
      });

      if (error) throw error;
      
      onUpdated({ 
        ...o,
        order_status: statusEdit.status,
        shipping_date: statusEdit.shipping_date || o.shipping_date,
        arrival_date: statusEdit.arrival_date || o.arrival_date,
      });

      try {
        await sendStatusChangeEmail({
          customerName: `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name || '',
          customerEmail: o.customer_email,
          orderNo,
          newStatus: statusEdit.status as OrderStatus,
          shippingDate: statusEdit.shipping_date || undefined,
          arrivalDate: statusEdit.arrival_date || undefined,
          lang: o.lang || 'da',
        });
      } catch (e) {
        console.warn('Email notify failed', e);
      }

      addNotification('Status updated ✓', 'success');
    } catch (err: any) {
      console.error('RPC Error:', err);
      addNotification(err.message || 'Error updating status', 'error');
    } finally { 
      setIsSaving(false); 
    }
  };

  const exportWord = async () => {
    addNotification('Generating Word document...', 'info');
  };

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md text-left">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-3xl relative border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-900">Ordre #{orderNo}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{orderDate}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
              <Download size={14} /> Word
            </button>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all text-slate-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Users size={11} /> Kontakt
              </div>
              <div className="text-sm font-black text-slate-900">{o.customer_name}</div>
              <div className="text-[10px] text-slate-500 mt-1">{o.customer_email}</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <MapPin size={11} /> Adresse
              </div>
              <div className="text-[10px] text-slate-700 leading-relaxed">
                {addr}<br/>{city}
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-[13.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity size={11} /> Стан замовлення
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_STATUSES.map(s => (
                <button 
                  key={s.key} 
                  type="button"
                  onClick={() => setStatusEdit(prev => ({ ...prev, status: s.key }))}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    statusEdit.status === s.key 
                      ? `${s.color} border-current font-black` 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    statusEdit.status === s.key ? s.dot : 'bg-slate-200'
                  }`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="date" 
                value={statusEdit.shipping_date} 
                onChange={e => setStatusEdit(prev => ({ ...prev, shipping_date: e.target.value }))} 
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold" 
              />
              <input 
                type="date" 
                value={statusEdit.arrival_date} 
                onChange={e => setStatusEdit(prev => ({ ...prev, arrival_date: e.target.value }))} 
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold" 
              />
            </div>
            <button 
              onClick={saveStatus} 
              disabled={isSaving} 
              className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Gem status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

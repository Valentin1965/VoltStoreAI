import React, { useState, useCallback, memo } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import {
  ChevronLeft, Truck, CreditCard, MapPin, Loader2,
  ArrowRight, ShieldCheck, UserCircle, Building2,
  Mail, MessageSquare, Package, ChevronDown, ChevronUp, User,
  AlertCircle, Check
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { sendOrderEmails } from '../../services/emailService';

interface FormData {
  first_name: string; last_name: string; email: string; phone: string;
  company_name: string; vat_number: string;
  country: string; city: string; street: string; house_number: string; apartment: string; postal_code: string;
  delivery_same: boolean;
  delivery_country: string; delivery_city: string; delivery_street: string;
  delivery_house_number: string; delivery_apartment: string; delivery_postal_code: string; delivery_phone: string;
}

const emptyForm: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', vat_number: '',
  country: '', city: '', street: '', house_number: '', apartment: '', postal_code: '',
  delivery_same: true,
  delivery_country: '', delivery_city: '', delivery_street: '',
  delivery_house_number: '', delivery_apartment: '', delivery_postal_code: '', delivery_phone: '',
};

// ── Відокремлений мемоїзований компонент для запобігання втрати фокусу ──
const CheckoutFormSection = memo(({ data, onChange, t }: { 
  data: FormData; 
  onChange: (field: keyof FormData, value: string | boolean) => void;
  t: (key: string) => string;
}) => {
  const inputCls = "w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required value={data.first_name} onChange={e => onChange('first_name', e.target.value)}
          placeholder={t('checkout_placeholder_first_name')} className={inputCls} />
        <input required value={data.last_name} onChange={e => onChange('last_name', e.target.value)}
          placeholder={t('checkout_placeholder_last_name')} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input required type="email" value={data.email} onChange={e => onChange('email', e.target.value)}
          placeholder={t('checkout_placeholder_email')} className={inputCls} />
        <input required value={data.phone} onChange={e => onChange('phone', e.target.value)}
          placeholder={t('checkout_placeholder_phone')} className={inputCls} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input value={data.company_name} onChange={e => onChange('company_name', e.target.value)}
          placeholder={t('checkout_placeholder_company')} className={inputCls} />
        <input value={data.vat_number} onChange={e => onChange('vat_number', e.target.value)}
          placeholder={t('checkout_placeholder_vat')} className={inputCls} />
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-50">
        <div className="grid grid-cols-3 gap-3">
          <input required value={data.street} onChange={e => onChange('street', e.target.value)}
            placeholder={t('field_street_short')} className={`col-span-2 ${inputCls}`} />
          <input required value={data.house_number} onChange={e => onChange('house_number', e.target.value)}
            placeholder={t('field_house_short')} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input required value={data.postal_code} onChange={e => onChange('postal_code', e.target.value)}
            placeholder={t('field_postal_short')} className={inputCls} />
          <input required value={data.city} onChange={e => onChange('city', e.target.value)}
            placeholder={t('field_city_short')} className={inputCls} />
        </div>
      </div>
    </div>
  );
});

export const CheckoutPage: React.FC<{ onBackToCart: () => void; onOrderSuccess: () => void; setView?: (view: AppView) => void }> = ({ onBackToCart, onOrderSuccess, setView }) => {
  const { items, totalPrice, clearCart } = useCart();
  const { addNotification } = useNotification();
  const { t, formatPrice, language, getLoc } = useLanguage();
  const { currentUser } = useUser();

  const [formData, setFormData] = useState<FormData>(currentUser ? {
    ...emptyForm,
    first_name: currentUser.first_name || '',
    last_name: currentUser.last_name || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
    company_name: currentUser.company_name || '',
    vat_number: currentUser.vat_number || '',
    street: currentUser.street || '',
    house_number: currentUser.house_number || '',
    postal_code: currentUser.postal_code || '',
    city: currentUser.city || '',
  } : emptyForm);

  const [paymentMethod, setPaymentMethod] = useState<'Email Order' | 'Credit Card'>('Email Order');
  const [clientMessage, setClientMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFieldChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsProcessing(true);

    try {
      const orderData = {
        client_id: currentUser?.id || null,
        customer_name: `${formData.first_name} ${formData.last_name}`,
        customer_email: formData.email,
        customer_phone: formData.phone,
        client_type: formData.company_name ? 'business' : 'private',
        company_name: formData.company_name,
        vat_number: formData.vat_number,
        country: formData.country,
        city: formData.city,
        street: formData.street,
        house_number: formData.house_number,
        postal_code: formData.postal_code,
        delivery_same_as_billing: formData.delivery_same,
        delivery_street: formData.delivery_same ? formData.street : formData.delivery_street,
        delivery_city: formData.delivery_same ? formData.city : formData.delivery_city,
        delivery_country: formData.delivery_same ? formData.country : formData.delivery_country,
        delivery_postal_code: formData.delivery_same ? formData.postal_code : formData.delivery_postal_code,
        delivery_house_number: formData.delivery_same ? formData.house_number : formData.delivery_house_number,
        delivery_phone: formData.delivery_same ? formData.phone : formData.delivery_phone,
        total_price: totalPrice,
        currency: language === 'da' ? 'DKK' : 'EUR',
        payment_method: paymentMethod,
        items: items.map(it => ({ id: it.id, name: getLoc(it.name), price: it.price, quantity: it.quantity })),
        customer_message: clientMessage,
        status: 'pending',
        lang: language,
        department: 'Online'
      };

      const { data, error } = await supabase.from('orders').insert([orderData]).select().single();
      if (error) throw error;

      if (paymentMethod === 'Email Order') {
        await sendOrderEmails({
          orderNo: data.order_number || data.id.slice(0, 8),
          orderDate: new Date().toLocaleDateString(),
          customerName: orderData.customer_name,
          customerEmail: orderData.customer_email,
          customerPhone: orderData.customer_phone,
          clientType: orderData.client_type as any,
          billingAddress: `${formData.street} ${formData.house_number}, ${formData.postal_code} ${formData.city}`,
          deliveryAddress: formData.delivery_same ? 'Same as billing' : `${formData.delivery_street}, ${formData.delivery_city}`,
          items: orderData.items as any,
          totalPrice: totalPrice,
          currency: orderData.currency,
          lang: language
        });

        addNotification(t('order_success_msg'), 'success');
        clearCart();
        onOrderSuccess();
      } else {
        // Credit Card (Mollie) flow
        const resp = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: orderData.total_price,
            orderId: data.id,
            customerEmail: orderData.customer_email,
          }),
        });

        let payload: any = null;
        let rawBody: string | null = null;

        try {
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            payload = await resp.json();
          } else {
            rawBody = await resp.text();
            try {
              payload = rawBody ? JSON.parse(rawBody) : null;
            } catch {
              // leave payload as null, we'll handle below
            }
          }
        } catch {
          // ignore JSON parse errors, handle via resp.ok check below
        }

        if (!resp.ok || !payload?.checkoutUrl) {
          const message =
            (payload && (payload.error || payload.message)) ||
            rawBody ||
            `Unable to start card payment (status ${resp.status})`;
          throw new Error(message);
        }

        // Перенаправляємо клієнта на сторінку оплати Mollie
        window.location.href = payload.checkoutUrl;
      }
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalPrice = totalPrice;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-in text-left">
      <button onClick={onBackToCart} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all mb-8">
        <ChevronLeft size={16} /> {t('back_to_cart')}
      </button>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-10">
          <section className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-50">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg"><User size={24} /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t('checkout_billing_title')}</h2>
            </div>
            <CheckoutFormSection data={formData} onChange={handleFieldChange} t={t} />
          </section>

          <section className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-50">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><MapPin size={24} /></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
                  {t('checkout_delivery_address')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleFieldChange('delivery_same', !formData.delivery_same)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${formData.delivery_same ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                  {formData.delivery_same && <Check size={14} className="text-white" strokeWidth={4} />}
                </div>
                {t('checkout_delivery_same')}
              </button>
            </div>

            <div className={`space-y-4 transition-opacity ${formData.delivery_same ? 'opacity-50' : 'opacity-100'}`}>
              <div className="grid grid-cols-3 gap-3">
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_street}
                  onChange={e => handleFieldChange('delivery_street', e.target.value)}
                  placeholder={t('field_street_short')}
                  className="col-span-2 w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_house_number}
                  onChange={e => handleFieldChange('delivery_house_number', e.target.value)}
                  placeholder={t('field_house_short')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_postal_code}
                  onChange={e => handleFieldChange('delivery_postal_code', e.target.value)}
                  placeholder={t('field_postal_short')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_city}
                  onChange={e => handleFieldChange('delivery_city', e.target.value)}
                  placeholder={t('field_city_short')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_country}
                  onChange={e => handleFieldChange('delivery_country', e.target.value)}
                  placeholder={t('field_country')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <input
                  disabled={formData.delivery_same}
                  value={formData.delivery_phone}
                  onChange={e => handleFieldChange('delivery_phone', e.target.value)}
                  placeholder={t('checkout_placeholder_phone')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-50">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg"><CreditCard size={24} /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t('checkout_payment_title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('Email Order')}
                className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 ${
                  paymentMethod === 'Email Order' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'Email Order' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'
                  }`}
                >
                  {paymentMethod === 'Email Order' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="text-sm font-black uppercase text-slate-900">{t('checkout_email_order_title')}</div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {t('checkout_email_order_desc')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Credit Card')}
                className={`p-6 rounded-3xl border-2 transition-all text-left flex flex-col gap-3 ${
                  paymentMethod === 'Credit Card' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'Credit Card' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'
                  }`}
                >
                  {paymentMethod === 'Credit Card' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="text-sm font-black uppercase text-slate-900">{t('checkout_card_title')}</div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {t('checkout_card_desc')}
                </p>
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
              <MessageSquare size={18} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('checkout_message_section')}</span>
            </div>
            <textarea
              value={clientMessage}
              onChange={e => setClientMessage(e.target.value)}
              placeholder={t('checkout_message_placeholder')}
              className="w-full bg-slate-50 rounded-2xl p-5 text-[10px] font-bold outline-none border-2 border-slate-200 focus:border-emerald-500 transition-all min-h-[90px] resize-none"
            />
          </section>
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl sticky top-28">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
              <Package size={20} className="text-emerald-500" /> {t('checkout_summary_title')}
            </h3>
            <div className="space-y-4 mb-8 max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
              {items.length === 0 ? (
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t('empty_cart')}
                </div>
              ) : (
                items.map(it => (
                  <div key={it.id} className="flex justify-between items-center gap-4 py-2 border-b border-white/5">
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase truncate">{getLoc(it.name)}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase">{it.quantity} × {formatPrice(it.price)}</div>
                    </div>
                    <div className="text-[11px] font-black text-emerald-400">{formatPrice(it.price * it.quantity)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{t('checkout_subtotal')}</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black text-white pt-4 border-t border-white/10">
                <span>{t('checkout_total')}</span>
                <span className="text-emerald-400">{formatPrice(finalPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-1">
                <span>{t('checkout_total_incl_vat_21')}</span>
                <span className="text-emerald-400/90">{formatPrice(finalPrice * 1.21)}</span>
              </div>
            </div>
            <button type="submit" disabled={isProcessing} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl mt-8 flex items-center justify-center gap-3">
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : t('checkout_place_order_btn')}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};
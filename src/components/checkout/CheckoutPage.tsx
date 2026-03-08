import React, { useState, useCallback } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import {
  ChevronLeft, Truck, CreditCard, MapPin, Loader2,
  ArrowRight, ShieldCheck, UserCircle, Building2,
  Mail, MessageSquare, Package, ChevronDown, ChevronUp, User,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { sendOrderEmails } from '../../services/emailService';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
  setView?: (view: AppView) => void;
}

interface FormData {
  first_name: string; last_name: string; email: string; phone: string;
  company_name: string; vat_number: string;
  country: string; city: string; street: string; house_number: string; apartment: string; postal_code: string;
  delivery_same: boolean;
  delivery_country: string; delivery_city: string; delivery_street: string;
  delivery_house_number: string; delivery_apartment: string; delivery_postal_code: string; delivery_phone: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', vat_number: '',
  country: 'Denmark', city: '', street: '', house_number: '', apartment: '', postal_code: '',
  delivery_same: true,
  delivery_country: 'Denmark', delivery_city: '', delivery_street: '',
  delivery_house_number: '', delivery_apartment: '', delivery_postal_code: '', delivery_phone: '',
};

// ── Validation helpers ─────────────────────────────────────────────────────
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_PHONE = /^[+]?[\d\s\-().]{6,20}$/;
const RE_POSTAL = /^[\dA-Z\-\s]{2,10}$/i;
const RE_VAT   = /^[A-Z]{0,4}[\d\s\-]{4,20}$/i;

function validate(data: FormData, payerType: 'private' | 'business'): FormErrors {
  const err: FormErrors = {};

  if (!data.first_name.trim()) err.first_name = 'Fornavn er påkrævet';
  if (!data.email.trim())      err.email = 'Email er påkrævet';
  else if (!RE_EMAIL.test(data.email.trim())) err.email = 'Ugyldig email-adresse';

  if (data.phone.trim() && !RE_PHONE.test(data.phone.trim()))
    err.phone = 'Ugyldigt telefonnummer (f.eks. +45 12 34 56 78)';

  if (payerType === 'business') {
    if (!data.company_name.trim()) err.company_name = 'Virksomhedsnavn er påkrævet';
    if (data.vat_number.trim() && !RE_VAT.test(data.vat_number.trim()))
      err.vat_number = 'Ugyldigt CVR/VAT nummer';
  }

  // Billing address
  if (!data.city.trim())         err.city = 'By er påkrævet';
  if (!data.street.trim())       err.street = 'Gade er påkrævet';
  if (!data.house_number.trim()) err.house_number = 'Husnummer er påkrævet';
  if (!data.postal_code.trim())  err.postal_code = 'Postnummer er påkrævet';
  else if (!RE_POSTAL.test(data.postal_code.trim())) err.postal_code = 'Ugyldigt postnummer';

  // Delivery address (only if different from billing)
  if (!data.delivery_same) {
    if (!data.delivery_city.trim())         err.delivery_city = 'By er påkrævet';
    if (!data.delivery_street.trim())       err.delivery_street = 'Gade er påkrævet';
    if (!data.delivery_house_number.trim()) err.delivery_house_number = 'Husnummer er påkrævet';
    if (!data.delivery_postal_code.trim())  err.delivery_postal_code = 'Postnummer er påkrævet';
    else if (!RE_POSTAL.test(data.delivery_postal_code.trim()))
      err.delivery_postal_code = 'Ugyldigt postnummer';
    if (data.delivery_phone.trim() && !RE_PHONE.test(data.delivery_phone.trim()))
      err.delivery_phone = 'Ugyldigt telefonnummer';
  }

  return err;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { items, totalPrice, clearCart, isVatEnabled } = useCart();
  const { addNotification } = useNotification();
  const { formatPrice, t, language, currencyCode } = useLanguage();
  const { findClientByEmail, currentUser } = useUser();

  const [step, setStep] = useState(currentUser ? 0 : 1);
  const [clientMessage, setClientMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payerType, setPayerType] = useState<'private' | 'business'>('private');
  const [showProfileLoad, setShowProfileLoad] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const set = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Validate single field on blur
  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldErrors = validate(formData, payerType);
    if (fieldErrors[field]) {
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [formData, payerType]);

  const fillFromProfile = (profile: any) => {
    setFormData({ ...emptyForm,
      first_name: profile.first_name || profile.name?.split(' ')[0] || '',
      last_name:  profile.last_name  || profile.name?.split(' ').slice(1).join(' ') || '',
      email:   profile.email   || '',
      phone:   profile.phone   || '',
      city:    profile.city    || '',
      country: profile.country || 'Danmark',
      street:  profile.street  || profile.address || '',
      house_number: profile.house_number || '',
      postal_code:  profile.postal_code  || '',
      company_name: profile.company_name || '',
      vat_number:   profile.vat_number   || '',
    });
    if (profile.client_type) setPayerType(profile.client_type);
    setProfileLoaded(true);
    setErrors({});
    setTouched({});
  };

  const handleLoadProfile = async () => {
    if (!profileEmail.includes('@')) return;
    const profile = await findClientByEmail(profileEmail);
    if (profile) {
      fillFromProfile(profile);
      addNotification(`Velkommen tilbage, ${profile.name}`, 'success');
    } else {
      setFormData(prev => ({ ...prev, email: profileEmail }));
      addNotification('Ingen profil fundet', 'info');
    }
    setShowProfileLoad(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Full validation on submit
    const fieldErrors = validate(formData, payerType);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Mark all error fields as touched so they show red
      const allTouched = Object.keys(fieldErrors).reduce(
        (acc, k) => ({ ...acc, [k]: true }), {}
      );
      setTouched(prev => ({ ...prev, ...allTouched }));
      addNotification('Ret venligst fejlene i formularen', 'error');
      // Scroll to first error
      const firstErrField = document.querySelector('[data-error="true"]');
      firstErrField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsProcessing(true);
    const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;
    const fullName = `${formData.first_name} ${formData.last_name}`.trim();
    const serializedItems = items.map(item => ({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : (item.name as any)?.en || (item.name as any)?.da || '',
      price: item.price || 0, quantity: item.quantity || 1, category: item.category || '',
    }));

    try {
      // 1. Upsert client
      const { data: clientRow } = await supabase.from('clients').upsert([{
        email: formData.email, client_type: payerType,
        first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone || null,
        company_name: payerType === 'business' ? formData.company_name || null : null,
        vat_number: payerType === 'business' ? formData.vat_number || null : null,
        country: formData.country, city: formData.city, street: formData.street,
        house_number: formData.house_number, apartment: formData.apartment || null, postal_code: formData.postal_code,
        delivery_same_as_billing: formData.delivery_same,
        delivery_country: formData.delivery_same ? formData.country : formData.delivery_country,
        delivery_city: formData.delivery_same ? formData.city : formData.delivery_city,
        delivery_street: formData.delivery_same ? formData.street : formData.delivery_street,
        delivery_house_number: formData.delivery_same ? formData.house_number : formData.delivery_house_number,
        delivery_apartment: formData.delivery_same ? formData.apartment || null : formData.delivery_apartment || null,
        delivery_postal_code: formData.delivery_same ? formData.postal_code : formData.delivery_postal_code,
        delivery_phone: formData.delivery_same ? formData.phone || null : formData.delivery_phone || null,
      }], { onConflict: 'email' }).select('id').single();

      // 2. Insert order
      const { data: orderRow, error: dbError } = await supabase.from('orders').insert([{
        customer_name: fullName, customer_email: formData.email, customer_phone: formData.phone || 'N/A',
        city: formData.city, department: `${formData.street} ${formData.house_number}`.trim(),
        total_price: finalPrice, items: serializedItems, payment_method: 'Email Order',
        status: 'processing', currency: currencyCode || 'EUR',
        client_id: clientRow?.id || null, client_type: payerType,
        first_name: formData.first_name, last_name: formData.last_name,
        street: formData.street, house_number: formData.house_number,
        apartment: formData.apartment || null, postal_code: formData.postal_code, country: formData.country,
        company_name: payerType === 'business' ? formData.company_name || null : null,
        vat_number: payerType === 'business' ? formData.vat_number || null : null,
        delivery_same_as_billing: formData.delivery_same,
        delivery_country: formData.delivery_same ? formData.country : formData.delivery_country,
        delivery_city: formData.delivery_same ? formData.city : formData.delivery_city,
        delivery_street: formData.delivery_same ? formData.street : formData.delivery_street,
        delivery_house_number: formData.delivery_same ? formData.house_number : formData.delivery_house_number,
        delivery_postal_code: formData.delivery_same ? formData.postal_code : formData.delivery_postal_code,
        delivery_phone: formData.delivery_same ? formData.phone || null : formData.delivery_phone || null,
        ...(clientMessage ? { customer_message: clientMessage } : {}),
        ...(payerType === 'business' && formData.vat_number ? { metadata: { vat: formData.vat_number, company: formData.company_name } } : {}),
        lang: language || 'da',
      }]).select('id, order_number').single();

      if (dbError) { console.error('[Order]', dbError.code, dbError.message); addNotification(`DB: ${dbError.message}`, 'error'); return; }

      const orderNo = orderRow?.order_number || ('GLS-' + String(orderRow?.id || '').slice(0, 8).toUpperCase());
      const addr = [formData.street, formData.house_number].filter(Boolean).join(' ');
      const city = [formData.postal_code, formData.city, formData.country].filter(Boolean).join(', ');
      const delAddr = formData.delivery_same ? addr : [formData.delivery_street, formData.delivery_house_number].filter(Boolean).join(' ');
      const delCity = formData.delivery_same ? city : [formData.delivery_postal_code, formData.delivery_city, formData.delivery_country].filter(Boolean).join(', ');
      await sendOrderEmails({
        orderNo,
        orderDate: new Date().toLocaleDateString('da-DK'),
        customerName: fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone || '—',
        clientType: payerType,
        companyName: formData.company_name || undefined,
        vatNumber: formData.vat_number || undefined,
        billingAddress: [addr, city].filter(Boolean).join(', '),
        deliveryAddress: formData.delivery_same ? t('delivery_same_as_billing') || 'Same as billing' : [delAddr, delCity].filter(Boolean).join(', '),
        items: serializedItems,
        totalPrice: finalPrice,
        currency: currencyCode || 'EUR',
        customerMessage: clientMessage || undefined,
        lang: language || 'da',
      });

      addNotification(language === 'da' ? 'Ordre sendt!' : 'Order sent!', 'success');

      // ── Notify admin via push ─────────────────────────────────────────────
      try {
        await fetch('https://xvduslroirsujnglcnos.supabase.co/functions/v1/send-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZHVzbHJvaXJzdWpuZ2xjbm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQzMDQsImV4cCI6MjA4NDM2MDMwNH0.MpS-NS6Blgpu4o3QxoSUGhn-cs5HJhWcqMf2XxtnsMY`,
          },
          body: JSON.stringify({
            type:         'new_order',
            customerName: fullName,
            total:        finalPrice.toFixed(2),
            currency:     currencyCode || 'EUR',
          }),
        });
      } catch { /* push not critical */ }

      clearCart(); onOrderSuccess();
    } catch (err: any) { addNotification(`Error: ${err.message}`, 'error'); }
    finally { setIsProcessing(false); }
  };

  const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;
  const inp = 'input-premium';
  const lbl = 'text-[9px] font-black text-slate-400 uppercase tracking-widest px-1';

  // ── Field wrapper helper: shows error text + red border ─────────────────
  const Field = ({
    label, field, children, required: req, className = ''
  }: {
    label: string; field: keyof FormData; children: React.ReactNode; required?: boolean; className?: string;
  }) => {
    const err = touched[field] && errors[field];
    return (
      <div className={`space-y-1 ${className}`} data-error={!!err}>
        <label className={`${lbl} ${req ? 'after:content-["*"] after:text-rose-500 after:ml-0.5' : ''}`}>
          {label}
        </label>
        <div className={`${err ? 'ring-2 ring-rose-400 rounded-2xl' : ''}`}>
          {children}
        </div>
        {err && (
          <p className="flex items-center gap-1 text-[9px] font-bold text-rose-500 px-1 pt-0.5">
            <AlertCircle size={9} /> {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12 text-left">
      <div className="flex items-center justify-between mb-8 px-4 font-black uppercase text-[9px] tracking-widest text-slate-400">
        <button onClick={() => { if (step <= 1) onBackToCart(); else setStep(1); }} className="flex items-center gap-2 hover:text-slate-900 transition-all">
          <ChevronLeft size={14} /> {step <= 1 ? t('back_to_cart') : 'Tilbage'}
        </button>
        <div className="flex items-center gap-3">
          {currentUser && <><span className={step === 0 ? 'text-slate-900' : 'text-slate-300'}>00 Konto</span><div className="w-6 h-[1px] bg-slate-100" /></>}
          <span className={step === 1 ? 'text-slate-900' : 'text-slate-300'}>01 Metode</span>
          <div className="w-6 h-[1px] bg-slate-100" />
          <span className={step === 2 ? 'text-slate-900' : 'text-slate-300'}>02 Detaljer</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-3xl overflow-hidden">

        {step === 0 && currentUser && (
          <div className="p-10 space-y-8 animate-fade-in text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mx-auto"><ShieldCheck size={28} /></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Velkommen, {currentUser.name}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <button onClick={() => { fillFromProfile(currentUser); setStep(1); }}
                className="p-8 rounded-[2rem] border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck size={24} /></div>
                <div><div className="text-sm font-black text-slate-900 uppercase">Brug min profil</div><div className="text-[9px] text-slate-400 mt-1">{currentUser.email}</div></div>
              </button>
              <button onClick={() => { setProfileLoaded(false); setFormData(emptyForm); setStep(1); }}
                className="p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-400 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><User size={24} /></div>
                <div><div className="text-sm font-black text-slate-900 uppercase">Fortsæt som gæst</div></div>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-10 space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Vælg bestillingsmetode</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setStep(2)} className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-xl"><Mail size={28} /></div>
                <div><div className="text-sm font-black text-slate-900 uppercase">E-mail Bestilling</div><div className="text-[9px] text-slate-400 mt-1">Hurtigt og nemt</div></div>
              </button>
              <div className="relative p-8 rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center gap-4 text-center opacity-60 cursor-not-allowed select-none">
                <div className="absolute top-3 right-3 bg-amber-100 text-amber-600 text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full">Kommer snart</div>
                <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center shadow-inner"><CreditCard size={28} /></div>
                <div><div className="text-sm font-black text-slate-400 uppercase">Betalingssystem</div><div className="text-[9px] text-slate-300 mt-1">Kort, MobilePay</div></div>
              </div>
            </div>
            {!currentUser && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))}
                  className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 flex items-center gap-2">
                  <User size={12} /> Log ind for at bruge gemte adresser
                </button>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">E-mail Bestilling</h3>
              {profileLoaded
                ? <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase"><ShieldCheck size={12} /> Profil indlæst</div>
                : <div className="flex items-center gap-2 bg-slate-50 text-slate-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase"><User size={12} /> Gæst</div>
              }
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-7">

              {!currentUser && (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <button type="button" onClick={() => setShowProfileLoad(v => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-all text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>Eksisterende kunde? Indlæs profil</span>
                    {showProfileLoad ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showProfileLoad && (
                    <div className="p-4 flex gap-3">
                      <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="din@email.dk"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-400 transition-all" />
                      <button type="button" onClick={handleLoadProfile} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-emerald-500 transition-all"><ArrowRight size={14} /></button>
                    </div>
                  )}
                </div>
              )}

              {/* Order summary */}
              <div className="bg-slate-50 rounded-3xl p-6 space-y-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1"><Package size={14} className="text-emerald-500" /><span className="text-[9px] font-black uppercase tracking-widest">Din Bestilling</span></div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-slate-600 truncate max-w-[200px]">{item.quantity}× {typeof item.name === 'string' ? item.name : (item.name as any)[language] || (item.name as any)['en']}</span>
                    <span className="text-slate-900">{formatPrice((item.price || 0) * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-slate-400"><span>Ekskl. moms</span><span>{formatPrice(totalPrice)}</span></div>
                  <div className="flex justify-between text-[10px] font-black text-emerald-600"><span>Inkl. moms (25%)</span><span>{formatPrice(totalPrice * 1.25)}</span></div>
                </div>
              </div>

              {/* Client type */}
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kundetype</div>
                <div className="grid grid-cols-2 gap-3">
                  {(['private', 'business'] as const).map(type => (
                    <button key={type} type="button" onClick={() => setPayerType(type)}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest ${payerType === type ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                      {type === 'private' ? <UserCircle size={18} /> : <Building2 size={18} />}
                      {type === 'private' ? 'Privat' : 'Virksomhed'}
                    </button>
                  ))}
                </div>
              </div>

              {payerType === 'business' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <Field label="Virksomhedsnavn" field="company_name" required>
                    <input value={formData.company_name} onChange={e => set('company_name', e.target.value)}
                      onBlur={() => handleBlur('company_name')} className={inp} placeholder="Virksomhed A/S" />
                  </Field>
                  <Field label="VAT / CVR nummer" field="vat_number">
                    <input value={formData.vat_number} onChange={e => set('vat_number', e.target.value)}
                      onBlur={() => handleBlur('vat_number')} className={inp} placeholder="DK 00000000" />
                  </Field>
                </div>
              )}

              {/* Contact */}
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kontaktperson</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Fornavn" field="first_name" required>
                    <input value={formData.first_name} onChange={e => set('first_name', e.target.value)}
                      onBlur={() => handleBlur('first_name')} className={inp} placeholder="Fornavn" />
                  </Field>
                  <Field label="Efternavn" field="last_name">
                    <input value={formData.last_name} onChange={e => set('last_name', e.target.value)}
                      className={inp} placeholder="Efternavn" />
                  </Field>
                  <Field label="Email" field="email" required>
                    <input type="email" value={formData.email} onChange={e => set('email', e.target.value)}
                      onBlur={() => handleBlur('email')} className={inp} placeholder="din@email.dk" />
                  </Field>
                  <Field label="Telefon" field="phone">
                    <input value={formData.phone} onChange={e => set('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')} className={inp} placeholder="+45 00 00 00 00" />
                  </Field>
                </div>
              </div>

              {/* Billing address */}
              <div>
                <div className="flex items-center gap-2 mb-3"><MapPin size={14} className="text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faktureringsadresse</span></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-4 space-y-1"><label className={lbl}>Land</label>
                    <input value={formData.country} onChange={e => set('country', e.target.value)} className={inp} placeholder="Denmark" />
                  </div>
                  <Field label="By" field="city" required className="col-span-2">
                    <input value={formData.city} onChange={e => set('city', e.target.value)}
                      onBlur={() => handleBlur('city')} className={inp} placeholder="By" />
                  </Field>
                  <Field label="Postnummer" field="postal_code" required className="col-span-1">
                    <input value={formData.postal_code} onChange={e => set('postal_code', e.target.value)}
                      onBlur={() => handleBlur('postal_code')} className={inp} placeholder="8800" />
                  </Field>
                  <div className="col-span-1 space-y-1"><label className={lbl}>Lejlighed</label>
                    <input value={formData.apartment} onChange={e => set('apartment', e.target.value)} className={inp} placeholder="2. tv" />
                  </div>
                  <Field label="Gade" field="street" required className="col-span-2">
                    <input value={formData.street} onChange={e => set('street', e.target.value)}
                      onBlur={() => handleBlur('street')} className={inp} placeholder="Gadenavn" />
                  </Field>
                  <Field label="Husnummer" field="house_number" required className="col-span-2">
                    <input value={formData.house_number} onChange={e => set('house_number', e.target.value)}
                      onBlur={() => handleBlur('house_number')} className={inp} placeholder="16" />
                  </Field>
                </div>
              </div>

              {/* Delivery address */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Truck size={14} className="text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leveringsadresse</span></div>
                <label className="flex items-center gap-3 cursor-pointer mb-4 select-none" onClick={() => set('delivery_same', !formData.delivery_same)}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${formData.delivery_same ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {formData.delivery_same && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Samme som faktureringsadresse</span>
                </label>
                {!formData.delivery_same && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="col-span-2 md:col-span-4 space-y-1"><label className={lbl}>Land</label>
                      <input value={formData.delivery_country} onChange={e => set('delivery_country', e.target.value)} className={inp} placeholder="Denmark" />
                    </div>
                    <Field label="By" field="delivery_city" required className="col-span-2">
                      <input value={formData.delivery_city} onChange={e => set('delivery_city', e.target.value)}
                        onBlur={() => handleBlur('delivery_city')} className={inp} placeholder="By" />
                    </Field>
                    <Field label="Postnummer" field="delivery_postal_code" required className="col-span-1">
                      <input value={formData.delivery_postal_code} onChange={e => set('delivery_postal_code', e.target.value)}
                        onBlur={() => handleBlur('delivery_postal_code')} className={inp} placeholder="8800" />
                    </Field>
                    <div className="col-span-1 space-y-1"><label className={lbl}>Lejlighed</label>
                      <input value={formData.delivery_apartment} onChange={e => set('delivery_apartment', e.target.value)} className={inp} placeholder="2. tv" />
                    </div>
                    <Field label="Gade" field="delivery_street" required className="col-span-2">
                      <input value={formData.delivery_street} onChange={e => set('delivery_street', e.target.value)}
                        onBlur={() => handleBlur('delivery_street')} className={inp} placeholder="Gadenavn" />
                    </Field>
                    <Field label="Husnummer" field="delivery_house_number" required className="col-span-1">
                      <input value={formData.delivery_house_number} onChange={e => set('delivery_house_number', e.target.value)}
                        onBlur={() => handleBlur('delivery_house_number')} className={inp} placeholder="16" />
                    </Field>
                    <Field label="Telefon" field="delivery_phone" className="col-span-1">
                      <input value={formData.delivery_phone} onChange={e => set('delivery_phone', e.target.value)}
                        onBlur={() => handleBlur('delivery_phone')} className={inp} placeholder="+45 00 00 00" />
                    </Field>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><MessageSquare size={15} className="text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest">Besked til os</span></div>
                <textarea value={clientMessage} onChange={e => setClientMessage(e.target.value)} placeholder="Eventuelle bemærkninger..."
                  className="w-full bg-slate-50 rounded-2xl p-5 text-[10px] font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all min-h-[90px] resize-none" />
              </div>

              {/* Submit */}
              <div className="bg-slate-900 rounded-[2rem] p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total inkl. moms</div>
                  <div className="text-3xl font-black text-emerald-400 tracking-tighter">{formatPrice(finalPrice)}</div>
                </div>
                <button type="submit" disabled={isProcessing}
                  className="w-full md:w-auto px-12 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><Mail size={18} /> Send Bestilling</>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import {
  ChevronLeft, Truck, CreditCard, MapPin, Loader2,
  ArrowRight, ShieldCheck, UserCircle, Building2,
  Mail, MessageSquare, Package, ChevronDown, ChevronUp, User
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

const emptyForm: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  company_name: '', vat_number: '',
  country: 'Denmark', city: '', street: '', house_number: '', apartment: '', postal_code: '',
  delivery_same: true,
  delivery_country: 'Denmark', delivery_city: '', delivery_street: '',
  delivery_house_number: '', delivery_apartment: '', delivery_postal_code: '', delivery_phone: '',
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { items, totalPrice, clearCart, isVatEnabled } = useCart();
  const { addNotification } = useNotification();
  const { formatPrice, t, language, currencyCode } = useLanguage();
  const { findUser, currentUser } = useUser();

  const [step, setStep] = useState(currentUser ? 0 : 1);
  const [clientMessage, setClientMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payerType, setPayerType] = useState<'private' | 'business'>('private');
  const [showProfileLoad, setShowProfileLoad] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const set = (field: keyof FormData, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const fillFromProfile = (profile: any) => {
    const parts = (profile.name || '').split(' ');
    setFormData({ ...emptyForm, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '',
      email: profile.email || '', phone: profile.phone || '', city: profile.city || '', street: profile.address || '' });
    setProfileLoaded(true);
  };

  const handleLoadProfile = () => {
    if (!profileEmail.includes('@')) return;
    const profile = findUser(profileEmail);
    if (profile) { fillFromProfile(profile); addNotification(`Velkommen tilbage, ${profile.name}`, 'success'); }
    else { setFormData(prev => ({ ...prev, email: profileEmail })); addNotification('Ingen profil fundet', 'info'); }
    setShowProfileLoad(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.email || !formData.city) {
      addNotification('Udfyld venligst alle obligatoriske felter', 'error'); return;
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
      const { error: dbError } = await supabase.from('orders').insert([{
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
      }]);

      if (dbError) { console.error('[Order]', dbError.code, dbError.message); addNotification(`DB: ${dbError.message}`, 'error'); return; }

      // Send confirmation emails to company + customer
      const orderNo = String(Math.random()).slice(2, 10).toUpperCase();
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
        deliveryAddress: formData.delivery_same ? 'Samme som fakturering' : [delAddr, delCity].filter(Boolean).join(', '),
        items: serializedItems,
        totalPrice: finalPrice,
        currency: currencyCode || 'EUR',
        customerMessage: clientMessage || undefined,
      });

      addNotification(language === 'da' ? 'Ordre sendt!' : 'Order sent!', 'success');
      clearCart(); onOrderSuccess();
    } catch (err: any) { addNotification(`Error: ${err.message}`, 'error'); }
    finally { setIsProcessing(false); }
  };

  const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;
  const inp = 'input-premium';
  const lbl = 'text-[9px] font-black text-slate-400 uppercase tracking-widest px-1';

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
              <button onClick={() => setStep(3)} className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-xl"><CreditCard size={28} /></div>
                <div><div className="text-sm font-black text-slate-900 uppercase">Betalingssystem</div><div className="text-[9px] text-slate-400 mt-1">Kort, MobilePay</div></div>
              </button>
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

        {step === 3 && (
          <div className="p-12 text-center space-y-8 animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto"><Loader2 size={40} className="animate-spin" /></div>
            <h2 className="text-2xl font-black text-slate-900 uppercase">Under Udvikling</h2>
            <button onClick={() => setStep(2)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all">Fortsæt med E-mail</button>
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
                  <div className="space-y-1"><label className={lbl}>Virksomhedsnavn</label><input value={formData.company_name} onChange={e => set('company_name', e.target.value)} className={inp} placeholder="Virksomhed A/S" /></div>
                  <div className="space-y-1"><label className={lbl}>VAT / CVR nummer</label><input value={formData.vat_number} onChange={e => set('vat_number', e.target.value)} className={inp} placeholder="DK 00000000" /></div>
                </div>
              )}

              {/* Contact */}
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kontaktperson</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><label className={lbl}>Fornavn *</label><input required value={formData.first_name} onChange={e => set('first_name', e.target.value)} className={inp} placeholder="Fornavn" /></div>
                  <div className="space-y-1"><label className={lbl}>Efternavn</label><input value={formData.last_name} onChange={e => set('last_name', e.target.value)} className={inp} placeholder="Efternavn" /></div>
                  <div className="space-y-1"><label className={lbl}>Email *</label><input required type="email" value={formData.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="din@email.dk" /></div>
                  <div className="space-y-1"><label className={lbl}>Telefon</label><input value={formData.phone} onChange={e => set('phone', e.target.value)} className={inp} placeholder="+45 00 00 00 00" /></div>
                </div>
              </div>

              {/* Billing address */}
              <div>
                <div className="flex items-center gap-2 mb-3"><MapPin size={14} className="text-emerald-500" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faktureringsadresse</span></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-4 space-y-1"><label className={lbl}>Land</label><input value={formData.country} onChange={e => set('country', e.target.value)} className={inp} placeholder="Denmark" /></div>
                  <div className="col-span-2 space-y-1"><label className={lbl}>By *</label><input required value={formData.city} onChange={e => set('city', e.target.value)} className={inp} placeholder="By" /></div>
                  <div className="col-span-1 space-y-1"><label className={lbl}>Postnummer</label><input value={formData.postal_code} onChange={e => set('postal_code', e.target.value)} className={inp} placeholder="8800" /></div>
                  <div className="col-span-1 space-y-1"><label className={lbl}>Lejlighed</label><input value={formData.apartment} onChange={e => set('apartment', e.target.value)} className={inp} placeholder="2. tv" /></div>
                  <div className="col-span-2 space-y-1"><label className={lbl}>Gade</label><input value={formData.street} onChange={e => set('street', e.target.value)} className={inp} placeholder="Gadenavn" /></div>
                  <div className="col-span-2 space-y-1"><label className={lbl}>Husnummer</label><input value={formData.house_number} onChange={e => set('house_number', e.target.value)} className={inp} placeholder="16" /></div>
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
                    <div className="col-span-2 md:col-span-4 space-y-1"><label className={lbl}>Land</label><input value={formData.delivery_country} onChange={e => set('delivery_country', e.target.value)} className={inp} placeholder="Denmark" /></div>
                    <div className="col-span-2 space-y-1"><label className={lbl}>By</label><input value={formData.delivery_city} onChange={e => set('delivery_city', e.target.value)} className={inp} placeholder="By" /></div>
                    <div className="col-span-1 space-y-1"><label className={lbl}>Postnummer</label><input value={formData.delivery_postal_code} onChange={e => set('delivery_postal_code', e.target.value)} className={inp} placeholder="8800" /></div>
                    <div className="col-span-1 space-y-1"><label className={lbl}>Lejlighed</label><input value={formData.delivery_apartment} onChange={e => set('delivery_apartment', e.target.value)} className={inp} placeholder="2. tv" /></div>
                    <div className="col-span-2 space-y-1"><label className={lbl}>Gade</label><input value={formData.delivery_street} onChange={e => set('delivery_street', e.target.value)} className={inp} placeholder="Gadenavn" /></div>
                    <div className="col-span-1 space-y-1"><label className={lbl}>Husnummer</label><input value={formData.delivery_house_number} onChange={e => set('delivery_house_number', e.target.value)} className={inp} placeholder="16" /></div>
                    <div className="col-span-1 space-y-1"><label className={lbl}>Telefon</label><input value={formData.delivery_phone} onChange={e => set('delivery_phone', e.target.value)} className={inp} placeholder="+45 00 00 00" /></div>
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

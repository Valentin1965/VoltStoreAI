import React, { useState, useEffect } from 'react';
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

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
  setView?: (view: AppView) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess }) => {
  const { items, totalPrice, clearCart, isVatEnabled } = useCart();
  const { addNotification } = useNotification();
  const { formatPrice, t, language, currencyCode } = useLanguage();
  const { findUser, currentUser } = useUser();

  // Steps: 0 = profile-or-guest choice (shown when logged in), 1 = method, 2 = form, 3 = payment
  const [step, setStep] = useState(currentUser ? 0 : 1);
  const [clientMessage, setClientMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [payerType, setPayerType] = useState<'private' | 'company'>('private');
  const [showProfileLoad, setShowProfileLoad] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', city: '', department: '', companyDetails: ''
  });

  const fillFromProfile = (profile: any) => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      city: profile.city || '',
      department: profile.address || '',
      companyDetails: ''
    });
    setProfileLoaded(true);
  };

  const handleLoadProfile = () => {
    if (!profileEmail.includes('@')) return;
    const profile = findUser(profileEmail);
    if (profile) {
      setFormData({ name: profile.name || '', email: profile.email || '', phone: profile.phone || '', city: profile.city || '', department: profile.address || '', companyDetails: '' });
      setProfileLoaded(true);
      addNotification(`Velkommen tilbage, ${profile.name}`, 'success');
    } else {
      setFormData(prev => ({ ...prev, email: profileEmail }));
      addNotification('Ingen profil fundet — udfyld manuelt', 'info');
    }
    setShowProfileLoad(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.city || !formData.department) {
      addNotification('Udfyld venligst alle obligatoriske felter', 'error');
      return;
    }
    setIsProcessing(true);
    const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;
    const serializedItems = items.map(item => ({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : (item.name as any)?.en || (item.name as any)?.da || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      category: item.category || '',
      ...(item.parts ? { parts: item.parts.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: p.quantity })) } : {})
    }));
    const orderPayload: Record<string, any> = {
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone || 'N/A',
      city: formData.city,
      department: formData.department,
      total_price: finalPrice,
      items: serializedItems,
      payment_method: 'Email Order',
      status: 'processing',
      currency: currencyCode || 'EUR',
    };
    if (clientMessage) orderPayload.customer_message = clientMessage;
    if (payerType === 'company' && formData.companyDetails)
      orderPayload.metadata = { cvr: formData.companyDetails };
    try {
      const { data, error: dbError } = await supabase.from('orders').insert([orderPayload]).select('id').single();
      if (dbError) {
        console.error('[Order] error:', dbError.code, dbError.message);
        console.error('[Order] payload:', JSON.stringify(orderPayload, null, 2));
        addNotification(`DB: ${dbError.message || dbError.code}`, 'error');
        return;
      }
      console.log('[Order] Created:', data?.id);
      addNotification(language === 'da' ? 'Ordre sendt!' : 'Order sent!', 'success');
      clearCart();
      onOrderSuccess();
    } catch (err: any) {
      addNotification(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12 text-left">
      {/* Nav */}
      <div className="flex items-center justify-between mb-8 px-4 font-black uppercase text-[9px] tracking-widest text-slate-400">
        <button onClick={() => { if (step <= 1 || step === 0) onBackToCart(); else setStep(step === 2 ? 1 : 1); }} className="flex items-center gap-2 hover:text-slate-900 transition-all">
          <ChevronLeft size={14} /> {step === 0 || step === 1 ? t('back_to_cart') : 'Tilbage'}
        </button>
        <div className="flex items-center gap-3">
          {currentUser && <><span className={step === 0 ? 'text-slate-900' : 'text-slate-300'}>00 Konto</span><div className="w-6 h-[1px] bg-slate-100" /></>}
          <span className={step === 1 ? 'text-slate-900' : 'text-slate-300'}>01 Metode</span>
          <div className="w-6 h-[1px] bg-slate-100" />
          <span className={step === 2 ? 'text-slate-900' : 'text-slate-300'}>02 Detaljer</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-3xl overflow-hidden">

        {/* ── STEP 0: Profile or guest (shown when logged in) ── */}
        {step === 0 && currentUser && (
          <div className="p-10 space-y-8 animate-fade-in text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Velkommen, {currentUser.name}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hvordan vil du fortsætte?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* Use profile data */}
              <button
                onClick={() => { fillFromProfile(currentUser); setStep(1); }}
                className="group p-8 rounded-[2rem] border-2 border-emerald-100 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 transition-all flex flex-col items-center gap-4 text-center"
              >
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Brug min profil</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-relaxed">
                    {currentUser.email}
                    {currentUser.city && <><br />{currentUser.city}</>}
                  </div>
                </div>
              </button>

              {/* Continue as guest */}
              <button
                onClick={() => { setProfileLoaded(false); setFormData({ name: '', email: '', phone: '', city: '', department: '', companyDetails: '' }); setStep(1); }}
                className="group p-8 rounded-[2rem] border-2 border-slate-100 hover:border-slate-400 hover:bg-slate-50/50 transition-all flex flex-col items-center gap-4 text-center"
              >
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-slate-700 transition-colors shadow-lg">
                  <User size={24} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Fortsæt som gæst</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Udfyld formular manuelt</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Method ── */}
        {step === 1 && (
          <div className="p-10 space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Vælg bestillingsmetode</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Ingen registrering nødvendig</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setStep(2)} className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-xl"><Mail size={28} /></div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">E-mail Bestilling</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Hurtigt og nemt — ingen konto</div>
                </div>
              </button>
              <button onClick={() => setStep(3)} className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-xl"><CreditCard size={28} /></div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Betalingssystem</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kort, MobilePay, Apple Pay</div>
                </div>
              </button>
            </div>
            {!currentUser && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))}
                  className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-all flex items-center gap-2">
                  <User size={12} /> Log ind for at bruge gemte adresser
                </button>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Payment placeholder ── */}
        {step === 3 && (
          <div className="p-12 text-center space-y-8 animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
              <Loader2 size={40} className="animate-spin" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Under Udvikling</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Online betalingssystem er under opsætning. Brug venligst e-mail bestilling.
              </p>
            </div>
            <button onClick={() => setStep(2)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl">
              Fortsæt med E-mail Bestilling
            </button>
          </div>
        )}

        {/* ── STEP 2: Form ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">E-mail Bestilling</h3>
              {profileLoaded
                ? <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest"><ShieldCheck size={12} /> Profil indlæst</div>
                : <div className="flex items-center gap-2 bg-slate-50 text-slate-400 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest"><User size={12} /> Gæst</div>
              }
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-7">

              {/* Load profile (guests only) */}
              {!currentUser && (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <button type="button" onClick={() => setShowProfileLoad(v => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-all text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span>Eksisterende kunde? Indlæs profil</span>
                    {showProfileLoad ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showProfileLoad && (
                    <div className="p-4 flex gap-3">
                      <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                        placeholder="din@email.dk"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-400 transition-all" />
                      <button type="button" onClick={handleLoadProfile}
                        className="px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-emerald-500 transition-all">
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Order summary */}
              <div className="bg-slate-50 rounded-3xl p-6 space-y-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Package size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Din Bestilling</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                    <span className="text-slate-600 truncate max-w-[200px]">{item.quantity}× {typeof item.name === 'string' ? item.name : (item.name as any)[language] || (item.name as any)['en']}</span>
                    <span className="text-slate-900">{formatPrice((item.price || 0) * item.quantity)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-slate-400">
                    <span>Ekskl. moms</span><span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-emerald-600">
                    <span>Inkl. moms (25%)</span><span>{formatPrice(totalPrice * 1.25)}</span>
                  </div>
                </div>
              </div>

              {/* Payer type */}
              <div className="grid grid-cols-2 gap-3">
                {(['private', 'company'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setPayerType(type)}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest ${payerType === type ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                    {type === 'private' ? <UserCircle size={18} /> : <Building2 size={18} />}
                    {type === 'private' ? t('private_person') : t('company')}
                  </button>
                ))}
              </div>
              {payerType === 'company' && (
                <input placeholder="CVR — DK 00000000" value={formData.companyDetails}
                  onChange={e => setFormData({ ...formData, companyDetails: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-emerald-500 transition-all" />
              )}

              {/* Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('profile_name')} *</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-premium" placeholder="Fornavn Efternavn" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('profile_phone')}</label>
                  <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-premium" placeholder="+45 00 00 00 00" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-premium" placeholder="din@email.dk" />
                </div>
              </div>

              {/* Delivery */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Truck size={15} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('delivery')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input required placeholder="Postnr. & By" value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })} className="input-premium" />
                  <div className="md:col-span-2 relative">
                    <MapPin size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required placeholder="Gade og husnummer" value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-premium pl-11" />
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Besked til os</span>
                </div>
                <textarea value={clientMessage} onChange={e => setClientMessage(e.target.value)}
                  placeholder="Eventuelle bemærkninger..."
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

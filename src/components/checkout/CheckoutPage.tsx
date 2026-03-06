import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import { 
  ChevronLeft, Truck, CreditCard, CheckCircle2, 
  MapPin, Loader2, User, Search, ArrowRight, ShieldCheck, 
  UserCircle, Building2, ExternalLink, Globe, AtSign, UserPlus,
  ShieldAlert, Mail, MessageSquare, Package
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DualPrice } from '../PriceDisplay';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
  setView?: (view: AppView) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess, setView }) => {
  const { items, totalPrice, clearCart, isVatEnabled } = useCart();
  const { addNotification } = useNotification();
  const { formatPrice, t, language, currencyCode } = useLanguage();
  const { findUser, currentUser } = useUser();
  
  const [step, setStep] = useState(0); 
  const [checkoutMethod, setCheckoutMethod] = useState<'email' | 'payment' | null>(null);
  const [clientMessage, setClientMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [payerType, setPayerType] = useState<'private' | 'company'>('private');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mollie' | 'invoice'>('mollie');
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    phone: '', 
    city: '', 
    department: '', // Street and House number
    companyDetails: '' // CVR Number for Denmark
  });

  useEffect(() => {
    if (currentUser && step === 0) {
      setFoundProfile(currentUser);
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        city: currentUser.city || '',
        department: currentUser.address || '',
        companyDetails: ''
      });
      if (currentUser.cards && currentUser.cards.length > 0) {
        setSelectedCardId(currentUser.cards[0].id);
        setPaymentMethod('card');
      }
      setStep(1);
    }
  }, [currentUser, step]);

  const handleIdentify = () => {
    if (!searchQuery.trim() || !searchQuery.includes('@')) {
      addNotification(t('profile_email'), "info");
      return;
    }
    
    setIsSearchingUser(true);
    setTimeout(() => {
      const profile = findUser(searchQuery);
      if (profile) {
        setFoundProfile(profile);
        setFormData({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          city: profile.city || '',
          department: profile.address || '',
          companyDetails: ''
        });
        if (profile.cards && profile.cards.length > 0) {
            setSelectedCardId(profile.cards[0].id);
            setPaymentMethod('card');
        }
        addNotification(`Velkommen tilbage, ${profile.name}`, 'success');
      } else {
        setFoundProfile(null);
        setFormData(prev => ({ ...prev, email: searchQuery }));
      }
      setStep(1);
      setIsSearchingUser(false);
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.city || !formData.department) {
      addNotification("Udfyld venligst alle obligatoriske felter", "error");
      return;
    }

    setIsProcessing(true);

    const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;

    const orderPayload = {
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      city: formData.city,
      department: formData.department,
      total_price: finalPrice, 
      currency: 'EUR',
      items: items,
      user_id: foundProfile?.id || null,
      payment_method: 'Email Order',
      status: 'processing',
      customer_message: clientMessage,
      metadata: { 
        ...(payerType === 'company' ? { cvr: formData.companyDetails } : {}),
        vat_exempt: !isVatEnabled
      }
    };

    try {
      // Simulate sending email and saving to DB
      const { error: dbError } = await supabase
        .from('orders')
        .insert([orderPayload]);

      if (dbError) throw dbError;

      addNotification(language === 'da' ? 'Ordre sendt via email!' : 'Order sent via email!', 'success');
      clearCart();
      onOrderSuccess();
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalPrice = isVatEnabled ? totalPrice * 1.25 : totalPrice;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12 text-left">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8 px-4 font-black uppercase text-[9px] tracking-widest text-slate-400">
        <button 
          onClick={() => {
            if (step === 0) onBackToCart();
            else if (step === 1) setStep(0);
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(1);
          }} 
          className="flex items-center gap-2 hover:text-slate-900 transition-all"
        >
          <ChevronLeft size={14} /> {step === 0 ? t('back_to_cart') : 'Tilbage'}
        </button>
        <div className="flex items-center gap-4">
          <span className={step === 0 ? 'text-slate-900' : ''}>01 ID</span>
          <div className="w-8 h-[1px] bg-slate-100"></div>
          <span className={step === 1 ? 'text-slate-900' : ''}>02 Metode</span>
          <div className="w-8 h-[1px] bg-slate-100"></div>
          <span className={step >= 2 ? 'text-slate-900' : ''}>03 Detaljer</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-3xl overflow-hidden">
        
        {step === 0 && (
          <div className="p-10 space-y-8 animate-fade-in text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-emerald-400 mx-auto shadow-2xl">
                <User size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('checkout_identify')}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Log ind eller fortsæt som gæst</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div className="relative group">
                <AtSign size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="email"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleIdentify()}
                  placeholder="din@email.dk"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-14 pr-16 py-5 text-xs font-black outline-none focus:border-emerald-400 focus:bg-white transition-all"
                />
                <button onClick={handleIdentify} className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-3 rounded-xl hover:bg-emerald-500 shadow-lg transition-all active:scale-90">
                  {isSearchingUser ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="p-10 space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Vælg betalingsmetode</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hvordan ønsker du at gennemføre ordren?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => { setCheckoutMethod('email'); setStep(2); }}
                className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex flex-col items-center gap-4 text-center"
              >
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-colors shadow-xl">
                  <Mail size={28} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">E-mail Bestilling</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manuel behandling via email</div>
                </div>
              </button>

              <button 
                onClick={() => { setStep(3); }}
                className="group p-8 rounded-[2rem] border-2 border-slate-50 hover:border-blue-500 hover:bg-blue-50/30 transition-all flex flex-col items-center gap-4 text-center"
              >
                <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-xl">
                  <CreditCard size={28} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Betalingssystem</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Kort, MobilePay, Apple Pay</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-12 text-center space-y-8 animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
              <Loader2 size={40} className="animate-spin" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Under Udvikling</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                Vores online betalingssystem er i øjeblikket under vedligeholdelse. 
                Venligst benyt e-mail bestilling i mellemtiden.
              </p>
            </div>
            <button 
              onClick={() => { setCheckoutMethod('email'); setStep(2); }}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl"
            >
              Fortsæt med E-mail Bestilling
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">E-mail Bestilling</h3>
              {foundProfile && <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest"><ShieldCheck size={12}/> Verificeret profil</div>}
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Order Summary */}
              <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-900 mb-2">
                  <Package size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Din Bestilling</span>
                </div>
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                      <span className="text-slate-600 truncate max-w-[200px]">{item.quantity}x {typeof item.name === 'string' ? item.name : (item.name as any)[language] || (item.name as any)['en']}</span>
                      <span className="text-slate-900">{formatPrice((item.price || 0) * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-slate-400 font-black">Total (Ekskl. moms)</span>
                    <span className="text-slate-900 font-black">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="font-black">Total (Inkl. moms)</span>
                    <span className="font-black">{formatPrice(totalPrice * 1.25)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPayerType('private')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${payerType === 'private' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    <UserCircle size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">{t('private_person')}</span>
                  </button>
                  <button type="button" onClick={() => setPayerType('company')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${payerType === 'company' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    <Building2 size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">{t('company')}</span>
                  </button>
                </div>
                {payerType === 'company' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">CVR Number (VAT)</label>
                    <input 
                      placeholder="DK 00000000"
                      value={formData.companyDetails}
                      onChange={e => setFormData({...formData, companyDetails: e.target.value})}
                      className="w-full bg-slate-50 rounded-xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-emerald-500 transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('profile_name')}</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-premium" placeholder="Fornavn Efternavn" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('profile_phone')}</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-premium" placeholder="+45 00 00 00 00" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Truck size={18} className="text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest">{t('delivery')}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <input required placeholder="Postnr. & By" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="input-premium" />
                  </div>
                  <div className="md:col-span-2 relative">
                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required placeholder="Gade og husnummer" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="input-premium pl-12" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <MessageSquare size={18} className="text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Besked til os</span>
                </div>
                <textarea 
                  value={clientMessage}
                  onChange={e => setClientMessage(e.target.value)}
                  placeholder="Skriv eventuelle bemærkninger til din ordre her..."
                  className="w-full bg-slate-50 rounded-2xl p-6 text-[10px] font-bold outline-none border-2 border-transparent focus:border-emerald-500 transition-all min-h-[120px] resize-none"
                />
              </div>

              <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="text-center md:text-left">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Total (Ekskl. moms)</div>
                  <div className="text-3xl font-black text-emerald-400 tracking-tighter">
                    {formatPrice(totalPrice)}
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full md:w-auto px-12 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="flex items-center gap-3">
                      <Mail size={18}/>
                      Send Bestilling
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
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
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface CheckoutPageProps {
  onBackToCart: () => void;
  onOrderSuccess: () => void;
  setView?: (view: AppView) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBackToCart, onOrderSuccess, setView }) => {
  const { items, totalPrice, clearCart } = useCart();
  const { addNotification } = useNotification();
  const { formatPrice, t } = useLanguage();
  const { findUser, currentUser } = useUser();
  
  const [step, setStep] = useState(0); 
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
    department: '', 
    companyDetails: ''
  });

  // Автозаповнення при логіні
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
      if (currentUser.cards?.length > 0) {
        setSelectedCardId(currentUser.cards[0].id);
        setPaymentMethod('card');
      }
      setStep(1);
    }
  }, [currentUser, step]);

  const handleIdentify = () => {
    if (!searchQuery.trim() || !searchQuery.includes('@')) {
      addNotification("Please enter a valid email", "info");
      return;
    }
    
    setIsSearchingUser(true);
    setTimeout(() => {
      const profile = findUser(searchQuery);
      if (profile) {
        setFoundProfile(profile);
        setFormData({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          city: profile.city || '',
          department: profile.address || '',
          companyDetails: ''
        });
        if (profile.cards?.length > 0) {
            setSelectedCardId(profile.cards[0].id);
            setPaymentMethod('card');
        }
        addNotification(`Welcome back, ${profile.name}`, 'success');
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
      addNotification("Please fill in all required fields", "error");
      return;
    }

    setIsProcessing(true);

    // Дані для public.orders (відповідають вашій таблиці)
    const orderPayload = {
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      city: formData.city,
      department: formData.department,
      total_price: totalPrice,
      items: items,
      currency: 'EUR', // Можна динамічно змінювати
      user_id: foundProfile?.id || null,
      payment_method: paymentMethod === 'mollie' ? 'Mollie Online' : (paymentMethod === 'card' ? `Card (${selectedCardId})` : 'Invoice'),
      status: paymentMethod === 'mollie' ? 'pending' : 'processing'
    };

    try {
      if (paymentMethod === 'mollie') {
        const { data: newOrder, error: dbError } = await supabase
          .from('orders')
          .insert([orderPayload])
          .select()
          .single();

        if (dbError) throw dbError;

        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPrice,
            orderId: newOrder.id,
            customerEmail: formData.email,
            customerName: formData.name
          }),
        });

        const data = await response.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        } else {
          throw new Error(data.error || "Mollie initialization failed");
        }
      } else {
        const { error } = await supabase.from('orders').insert([orderPayload]);
        if (error) throw error;

        addNotification('Order placed successfully!', 'success');
        clearCart();
        onOrderSuccess();
      }
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8 px-4 font-black uppercase text-[9px] tracking-widest text-slate-400">
        <button onClick={step === 0 ? onBackToCart : () => setStep(0)} className="flex items-center gap-2 hover:text-slate-900 transition-all">
          <ChevronLeft size={14} /> {step === 0 ? t('back_to_cart') : 'Back'}
        </button>
        <div className="flex items-center gap-4">
          <span className={step === 0 ? 'text-slate-900' : ''}>01 ID</span>
          <div className="w-8 h-[1px] bg-slate-100"></div>
          <span className={step === 1 ? 'text-slate-900' : ''}>02 Shipping & Pay</span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
        
        {step === 0 && (
          <div className="p-10 space-y-8 animate-fade-in text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-emerald-400 mx-auto shadow-2xl">
                <User size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Identify</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Access your saved data or checkout as guest</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div className="relative group">
                <AtSign size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  type="email"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleIdentify()}
                  placeholder="your@email.com"
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
          <div className="animate-fade-in">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Order Details</h3>
              {foundProfile && <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest"><ShieldCheck size={12}/> Verified Profile</div>}
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPayerType('private')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${payerType === 'private' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    <UserCircle size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Private</span>
                  </button>
                  <button type="button" onClick={() => setPayerType('company')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${payerType === 'company' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    <Building2 size={20} /> <span className="text-[10px] font-black uppercase tracking-widest">Company</span>
                  </button>
                </div>
                {payerType === 'company' && (
                  <textarea 
                    placeholder="Company name & VAT number..."
                    value={formData.companyDetails}
                    onChange={e => setFormData({...formData, companyDetails: e.target.value})}
                    className="w-full bg-slate-50 rounded-2xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-slate-200 transition-all min-h-[80px]"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-slate-200" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-slate-200" placeholder="+45 00 00 00 00" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <Truck size={18} className="text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Shipping Destination</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <input required placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-50 rounded-xl p-4 text-[10px] font-bold outline-none border border-transparent focus:border-slate-200" />
                  </div>
                  <div className="md:col-span-2 relative">
                    <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input required placeholder="Address (Street, Zip)" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-50 rounded-xl pl-12 pr-4 py-4 text-[10px] font-bold outline-none border border-transparent focus:border-slate-200" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Payment Method</span>
                <div className="space-y-2">
                  <button type="button" onClick={() => setPaymentMethod('mollie')} className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'mollie' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${paymentMethod === 'mollie' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Globe size={20}/></div>
                      <div className="text-left">
                        <div className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Mollie Checkout</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Apple Pay / Cards / iDEAL</div>
                      </div>
                    </div>
                    {paymentMethod === 'mollie' && <CheckCircle2 className="text-emerald-500" size={20}/>}
                  </button>

                  {/* Збережені картки */}
                  {foundProfile?.cards?.map((card: any) => (
                    <button type="button" key={card.id} onClick={() => { setPaymentMethod('card'); setSelectedCardId(card.id); }} className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'card' && selectedCardId === card.id ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${paymentMethod === 'card' && selectedCardId === card.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}><CreditCard size={20}/></div>
                        <div className="text-left">
                          <div className="text-[11px] font-black uppercase text-slate-900 tracking-tight">{card.brand} •••• {card.last4}</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Saved Payment Method</div>
                        </div>
                      </div>
                      {paymentMethod === 'card' && selectedCardId === card.id && <CheckCircle2 className="text-emerald-500" size={20}/>}
                    </button>
                  ))}

                  <button type="button" onClick={() => setPaymentMethod('invoice')} className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'invoice' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${paymentMethod === 'invoice' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}><ShieldAlert size={20}/></div>
                      <div className="text-left">
                        <div className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Direct Invoice</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Bank Transfer / Pay Later</div>
                      </div>
                    </div>
                    {paymentMethod === 'invoice' && <CheckCircle2 className="text-emerald-500" size={20}/>}
                  </button>
                </div>
              </div>

              <div className="mt-12 bg-slate-900 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="text-center md:text-left">
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Payable Total</div>
                  <div className="text-3xl font-black text-emerald-400 tracking-tighter">{formatPrice(totalPrice)}</div>
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full md:w-auto px-12 py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : (
                    <div className="flex items-center gap-3">
                      {paymentMethod === 'mollie' ? <ExternalLink size={18}/> : <ShieldCheck size={18}/>}
                      {paymentMethod === 'mollie' ? 'Pay Now' : 'Complete Order'}
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
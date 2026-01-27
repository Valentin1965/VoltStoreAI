
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AppView } from '../../types';
import { 
  ChevronLeft, ChevronRight, Truck, CreditCard, CheckCircle2, 
  MapPin, Loader2, User, Search, ArrowRight, ShieldCheck, 
  UserCheck, Home, CreditCard as CardIcon,
  ShieldAlert, AtSign, UserPlus
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
  
  const [step, setStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [foundProfile, setFoundProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [deliveryType, setDeliveryType] = useState<'profile' | 'custom'>('profile');
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '', 
    email: '', 
    phone: '', 
    city: '', 
    department: ''
  });

  const MOCK_PROFILES = [
    {
      id: 'usr_1',
      name: 'Anders Jensen',
      email: 'anders@greenlight.dk',
      phone: '+45 31 18 58 19',
      city: 'Viborg',
      department: 'Øster Teglgårdsvej 6',
      profileAddress: 'Øster Teglgårdsvej 6, 8800 Viborg, Danmark',
      cards: [{ id: 'c1', brand: 'visa', last4: '4242' }, { id: 'c2', brand: 'mastercard', last4: '8899' }]
    },
    {
      id: 'usr_2',
      name: 'Pro Client',
      email: 'pro@voltstore.pro',
      phone: '+380 99 123 45 67',
      city: 'Kyiv',
      department: 'Main Hub #1',
      profileAddress: 'вул. Центральна 1, Київ, Україна',
      cards: [{ id: 'c3', brand: 'visa', last4: '1111' }]
    }
  ];

  const handleIdentify = () => {
    if (!searchQuery.trim()) {
      addNotification("Введіть ім'я або email", "info");
      return;
    }
    
    setIsSearchingUser(true);
    setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const profile = MOCK_PROFILES.find(p => 
        p.name.toLowerCase().includes(query) || p.email.toLowerCase() === query
      );

      if (profile) {
        setFoundProfile(profile);
        setFormData({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          city: profile.city,
          department: profile.department
        });
        setSelectedCardId(profile.cards[0]?.id || '');
        setDeliveryType('profile');
        addNotification(`Вітаємо, ${profile.name}!`, 'success');
        setStep(1); 
      } else {
        setFoundProfile(null);
        setDeliveryType('custom');
        addNotification("Профіль не знайдено. Ви можете заповнити дані вручну або зареєструватися.", "error");
        setStep(1); // Переходимо до кроку 1 як новий клієнт
      }
      setIsSearchingUser(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    if (!foundProfile && step === 2) {
      addNotification("Оплата картами доступна тільки для зареєстрованих клієнтів", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const finalAddress = deliveryType === 'profile' && foundProfile 
        ? foundProfile.profileAddress 
        : `${formData.city}, ${formData.department}`;

      const { error } = await supabase.from('orders').insert([{
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        total_price: totalPrice,
        items: items,
        shipping_address: finalAddress,
        status: 'processing'
      }]);

      if (error) throw error;
      addNotification('Замовлення успішно оформлено!', 'success');
      clearCart();
      onOrderSuccess();
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-32">
      <div className="flex items-center justify-between mb-12 px-4">
        <button 
          onClick={step === 0 ? onBackToCart : () => setStep(step - 1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all"
        >
          <ChevronLeft size={16} /> {step === 0 ? t('back_to_cart') : 'Назад'}
        </button>
        <div className="hidden sm:flex items-center gap-12">
           {[0, 1, 2].map(s => (
             <div key={s} className={`flex items-center gap-2 ${step >= s ? 'text-emerald-600' : 'text-slate-300'}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step >= s ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100'}`}>
                  {s === 0 ? <Search size={14} /> : s === 1 ? <UserCheck size={14} /> : <CardIcon size={14} />}
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest">{s === 0 ? 'Вхід' : s === 1 ? 'Дані' : 'Оплата'}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
        
        {step === 0 && (
          <div className="space-y-12 animate-fade-in">
            <div className="text-center max-w-lg mx-auto space-y-4">
               <div className="flex justify-center gap-4 mb-6">
                 <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-2xl"><User size={32} /></div>
                 <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 border border-slate-100"><AtSign size={32} /></div>
               </div>
               <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Хто ви?</h2>
               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Введіть ім'я або Email. Ми знайдемо ваші збережені дані для швидкої оплати.</p>
            </div>

            <div className="max-w-md mx-auto space-y-10">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Ваше Ім'я або Email</label>
                 <div className="relative">
                   <input 
                     type="text"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     placeholder="Anders Jensen або anders@dk..."
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-10 py-7 text-sm font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
                   />
                   <button 
                    onClick={handleIdentify} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-lg"
                   >
                     {isSearchingUser ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                   </button>
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-50 text-center space-y-6">
                 <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Вперше у нас?</div>
                 <button 
                  onClick={() => setView && setView(AppView.CABINET)}
                  className="w-full flex items-center justify-center gap-6 p-8 rounded-[2.5rem] border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-all group shadow-sm"
                 >
                    <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform"><UserPlus size={20} /></div>
                    <div className="text-left">
                      <div className="text-[11px] font-black text-emerald-900 uppercase">Створити профіль клієнта</div>
                      <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-tight">Це обов'язково для оплати картами</div>
                    </div>
                    <ChevronRight size={20} className="ml-auto text-emerald-200" />
                 </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-10 animate-fade-in">
            <div className="border-b border-slate-50 pb-8"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ваші контакти</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Повне ім'я</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-sm font-black focus:border-emerald-400 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Телефон</label>
                <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-6 text-sm font-black focus:border-emerald-400 transition-all" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[12px] hover:bg-emerald-600 transition-all shadow-xl">Далі <ArrowRight className="inline ml-2" size={18} /></button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-fade-in">
             <div className="border-b border-slate-50 pb-8"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Оплата та доставка</h3></div>
             <div className="space-y-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Truck size={16} /> Місце отримання</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {foundProfile && (
                     <button onClick={() => setDeliveryType('profile')} className={`p-8 border-2 rounded-[3rem] text-left transition-all ${deliveryType === 'profile' ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-50 bg-slate-50/50'}`}>
                       <Home className={deliveryType === 'profile' ? 'text-emerald-600' : 'text-slate-400'} size={24} />
                       <div className="text-[10px] font-black text-slate-900 uppercase mt-2">Адреса профілю</div>
                       <div className="text-[9px] text-slate-500 truncate mt-1">{foundProfile.profileAddress}</div>
                     </button>
                   )}
                   <button onClick={() => setDeliveryType('custom')} className={`p-8 border-2 rounded-[3rem] text-left transition-all ${deliveryType === 'custom' ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-50 bg-slate-50/50'}`}>
                     <MapPin className={deliveryType === 'custom' ? 'text-emerald-600' : 'text-slate-400'} size={24} />
                     <div className="text-[10px] font-black text-slate-900 uppercase mt-2">Нова адреса</div>
                   </button>
                </div>
             </div>

             <div className="space-y-6 pt-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CardIcon size={16} /> Метод оплати</h4>
                {foundProfile ? (
                  <div className="grid grid-cols-1 gap-4">
                    {foundProfile.cards.map((card: any) => (
                      <button key={card.id} onClick={() => setSelectedCardId(card.id)} className={`w-full p-8 border-2 rounded-[2.5rem] flex items-center justify-between transition-all ${selectedCardId === card.id ? 'border-emerald-500 bg-emerald-50 shadow-xl' : 'border-slate-50'}`}>
                        <div className="flex items-center gap-8"><CardIcon size={24}/><span className="text-[11px] font-black uppercase">{card.brand} •••• {card.last4}</span></div>
                        {selectedCardId === card.id && <CheckCircle2 className="text-emerald-600" size={24} />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-rose-50 border-2 border-rose-100 p-10 rounded-[3rem] flex items-center gap-8 text-rose-900 shadow-sm">
                    <ShieldAlert size={40} />
                    <div>
                      <div className="text-[11px] font-black uppercase">Потрібна авторизація</div>
                      <p className="text-[9px] font-bold uppercase tracking-tight opacity-70">Оплата картами доступна лише зареєстрованим клієнтам.</p>
                    </div>
                  </div>
                )}
             </div>

             <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-3xl">
                <div><div className="text-[10px] font-black text-slate-500 uppercase mb-2">Сума</div><div className="text-4xl font-black text-emerald-400 tracking-tighter">{formatPrice(totalPrice)}</div></div>
                <button onClick={handleSubmit} disabled={isProcessing || (!foundProfile)} className="w-full md:w-auto px-16 py-7 rounded-[2.5rem] font-black uppercase text-[13px] bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-xl disabled:opacity-50">
                  {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <><ShieldCheck size={24} className="inline mr-2" /> Сплатити</>}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

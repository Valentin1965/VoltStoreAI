
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
      addNotification("Введіть ваше ім'я або email для ідентифікації", "info");
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
        addNotification(`Вітаємо знову, ${profile.name}!`, 'success');
        setStep(1); 
      } else {
        setFoundProfile(null);
        setDeliveryType('custom');
        addNotification("Профіль не знайдено. Будь ласка, заповніть дані вручну або зареєструйтесь у Кабінеті.", "error");
        setStep(1); 
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
      addNotification("Оплата картами VoltStore доступна тільки зареєстрованим власникам профілю", "error");
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
               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${step >= s ? 'border-emerald-500 bg-emerald-50 shadow-xl' : 'border-slate-100'}`}>
                  {s === 0 ? <Search size={16} /> : s === 1 ? <UserCheck size={16} /> : <CardIcon size={16} />}
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">{s === 0 ? 'Профіль' : s === 1 ? 'Контакти' : 'Оплата'}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-[0_40px_130px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden">
        
        {step === 0 && (
          <div className="space-y-12 animate-fade-in">
            <div className="text-center max-w-lg mx-auto space-y-4">
               <div className="flex justify-center gap-4 mb-8 relative">
                 <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-emerald-400 shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10">
                    <User size={36} />
                 </div>
                 <div className="w-20 h-20 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-slate-300 border border-slate-100 absolute -right-6 bottom-2 rotate-12">
                    <AtSign size={32} />
                 </div>
               </div>
               <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Ідентифікація</h2>
               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Введіть повне ім'я або email. Система VoltStore Pro автоматично підтягне ваші дані.</p>
            </div>

            <div className="max-w-md mx-auto space-y-12">
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-8">Введіть Дані</label>
                 <div className="relative group">
                   <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                     <AtSign size={20} />
                   </div>
                   <input 
                     type="text"
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     placeholder="Anders Jensen або anders@dk..."
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] pl-20 pr-24 py-8 text-sm font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm"
                   />
                   <button 
                    onClick={handleIdentify} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-6 rounded-[1.5rem] hover:bg-emerald-500 transition-all shadow-xl active:scale-95"
                   >
                     {isSearchingUser ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
                   </button>
                 </div>
              </div>

              <div className="pt-10 border-t border-slate-50 text-center space-y-8">
                 <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Вперше у нас?</div>
                 <button 
                  onClick={() => setView && setView(AppView.CABINET)}
                  className="w-full flex items-center justify-center gap-8 p-10 rounded-[3rem] border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-all group shadow-2xl shadow-emerald-500/5 hover:shadow-emerald-500/10"
                 >
                    <div className="bg-emerald-500 text-white p-6 rounded-[2rem] shadow-xl group-hover:scale-110 transition-transform">
                      <UserPlus size={28} />
                    </div>
                    <div className="text-left">
                      <div className="text-[14px] font-black text-emerald-900 uppercase tracking-tight">Створити профіль клієнта</div>
                      <div className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1 leading-none">Оплата картами тільки для власників профілю</div>
                    </div>
                    <ChevronRight size={24} className="ml-auto text-emerald-200 group-hover:translate-x-2 transition-transform" />
                 </button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-12 animate-fade-in">
            <div className="border-b border-slate-50 pb-8 flex justify-between items-center">
               <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Ваші контакти</h3>
               {foundProfile && <span className="bg-emerald-500 text-white px-5 py-2 rounded-2xl text-[9px] font-black uppercase shadow-lg shadow-emerald-500/20">Профіль VoltStore</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-8">Повне ім'я</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-10 py-7 text-sm font-black focus:border-emerald-400 focus:bg-white transition-all outline-none" />
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-8">Телефон</label>
                <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-10 py-7 text-sm font-black focus:border-emerald-400 focus:bg-white transition-all outline-none" />
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-widest text-[14px] hover:bg-emerald-600 transition-all shadow-3xl active:scale-95">Продовжити До Оплати <ArrowRight className="inline ml-3" size={24} /></button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-12 animate-fade-in">
             <div className="border-b border-slate-50 pb-8"><h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Оплата та доставка</h3></div>
             <div className="space-y-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 px-6"><Truck size={20} className="text-emerald-500" /> Місце отримання замовлення</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {foundProfile && (
                     <button onClick={() => setDeliveryType('profile')} className={`p-10 border-2 rounded-[3.5rem] text-left transition-all group ${deliveryType === 'profile' ? 'border-emerald-500 bg-emerald-50 shadow-2xl' : 'border-slate-50 bg-slate-50/50'}`}>
                       <Home className={deliveryType === 'profile' ? 'text-emerald-600' : 'text-slate-400'} size={32} />
                       <div className="text-[12px] font-black text-slate-900 uppercase mt-4 tracking-tight">Адреса Вашого Профілю</div>
                       <div className="text-[10px] text-slate-500 font-bold uppercase truncate mt-2 opacity-70">{foundProfile.profileAddress}</div>
                     </button>
                   )}
                   <button onClick={() => setDeliveryType('custom')} className={`p-10 border-2 rounded-[3.5rem] text-left transition-all group ${deliveryType === 'custom' ? 'border-emerald-500 bg-emerald-50 shadow-2xl' : 'border-slate-50 bg-slate-50/50'}`}>
                     <MapPin className={deliveryType === 'custom' ? 'text-emerald-600' : 'text-slate-400'} size={32} />
                     <div className="text-[12px] font-black text-slate-900 uppercase mt-4 tracking-tight">Нова Точка Доставки</div>
                     <div className="text-[10px] text-slate-500 font-bold uppercase mt-2 opacity-70">Заповніть дані вручну</div>
                   </button>
                </div>
             </div>

             <div className="space-y-8 pt-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 px-6"><CardIcon size={20} className="text-emerald-500" /> Метод розрахунку</h4>
                {foundProfile ? (
                  <div className="grid grid-cols-1 gap-6">
                    {foundProfile.cards.map((card: any) => (
                      <button key={card.id} onClick={() => setSelectedCardId(card.id)} className={`w-full p-10 border-2 rounded-[3rem] flex items-center justify-between transition-all ${selectedCardId === card.id ? 'border-emerald-500 bg-emerald-50 shadow-2xl' : 'border-slate-50 hover:bg-slate-50 transition-colors'}`}>
                        <div className="flex items-center gap-10">
                          <div className={`p-5 rounded-[1.5rem] ${selectedCardId === card.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <CardIcon size={32}/>
                          </div>
                          <span className="text-[14px] font-black uppercase tracking-widest text-slate-900">{card.brand} •••• {card.last4}</span>
                        </div>
                        {selectedCardId === card.id && <CheckCircle2 className="text-emerald-600" size={32} />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-rose-50 border-2 border-rose-100 p-12 rounded-[3.5rem] flex items-center gap-10 text-rose-900 shadow-xl shadow-rose-900/5">
                    <ShieldAlert size={48} className="shrink-0" />
                    <div>
                      <div className="text-[14px] font-black uppercase tracking-tighter">Потрібна Авторизація VoltStore</div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-2 leading-relaxed">
                        Безпечна оплата картами доступна тільки ідентифікованим власникам проектів. 
                        Будь ласка, зареєструйтесь для доступу до платежів.
                      </p>
                    </div>
                  </div>
                )}
             </div>

             <div className="bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center gap-12 shadow-3xl mt-16 border border-white/5">
                <div>
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Сума до сплати</div>
                  <div className="text-5xl font-black text-emerald-400 tracking-tighter">{formatPrice(totalPrice)}</div>
                </div>
                <button onClick={handleSubmit} disabled={isProcessing || (!foundProfile)} className="w-full md:w-auto px-20 py-8 rounded-[2.5rem] font-black uppercase text-[15px] tracking-[0.2em] bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-3xl shadow-emerald-500/20 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed active:scale-95">
                  {isProcessing ? <Loader2 size={28} className="animate-spin" /> : <><ShieldCheck size={28} className="inline mr-4" /> Завершити Замовлення</>}
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

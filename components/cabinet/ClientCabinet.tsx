
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { Order } from '../../types';
import { 
  ShoppingBag, User, Package, Zap, MapPin, Mail, Phone, 
  CreditCard, ShieldCheck, Plus, Trash2, Home, Award,
  Fingerprint, Smartphone, Search, AtSign, UserPlus, ChevronRight, ArrowRight, Loader2,
  Lock, KeyRound
} from 'lucide-react';

export const ClientCabinet: React.FC = () => {
  const { t, formatPrice, language } = useLanguage();
  const { addNotification } = useNotification();
  
  // Стани для ідентифікації та навігації
  const [isIdentified, setIsIdentified] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'payments'>('profile');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Імітація бази даних
  const MOCK_PROFILES = [
    {
      id: 'usr_1',
      name: 'Anders Jensen',
      email: 'anders@greenlight.dk',
      phone: '+45 31 18 58 19',
      address: 'Øster Teglgårdsvej 6, 8800 Viborg, Danmark'
    }
  ];

  const handleLogin = () => {
    if (!searchQuery.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      const profile = MOCK_PROFILES.find(p => p.name.toLowerCase().includes(query) || p.email.toLowerCase() === query);
      if (profile) {
        setUserData(profile);
        setIsIdentified(true);
        addNotification(`Вітаємо, ${profile.name}!`, 'success');
      } else {
        addNotification("Профіль не знайдено. Будь ласка, зареєструйтесь.", "error");
        setAuthMode('register'); // Автоматично пропонуємо реєстрацію
      }
      setIsProcessing(false);
    }, 800);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsIdentified(true);
      addNotification("Профіль VoltStore успішно створено!", "success");
      setIsProcessing(false);
    }, 1200);
  };

  // ЕКРАН АВТОРИЗАЦІЇ (ВХІД / РЕЄСТРАЦІЯ)
  if (!isIdentified) {
    return (
      <div className="max-w-4xl mx-auto py-12 md:py-20 animate-fade-in px-4">
        <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-3xl space-y-12 overflow-hidden relative">
            
            {/* Перемикач режимів */}
            <div className="flex justify-center mb-4">
              <div className="bg-slate-50 p-1.5 rounded-2xl flex border border-slate-100">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Вхід
                </button>
                <button 
                  onClick={() => setAuthMode('register')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Реєстрація
                </button>
              </div>
            </div>

            {authMode === 'login' ? (
              <div className="space-y-12 animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="flex justify-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-2xl"><User size={32} /></div>
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 border border-slate-100"><AtSign size={32} /></div>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Вхід до системи</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">Введіть дані для доступу до ваших замовлень та збережених карт.</p>
                </div>
                
                <div className="max-w-md mx-auto relative">
                   <input 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-10 py-7 text-sm font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" 
                     placeholder="Ваше ім'я або Email..." 
                   />
                   <button onClick={handleLogin} className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl">
                     {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <ArrowRight size={24}/>}
                   </button>
                </div>

                <div className="pt-8 border-t border-slate-50 max-w-md mx-auto space-y-6">
                     <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Вперше у нас?</div>
                     <button 
                        onClick={() => setAuthMode('register')}
                        className="w-full flex items-center justify-center gap-6 p-8 rounded-[2.5rem] border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-all group shadow-sm"
                     >
                        <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform"><UserPlus size={20} /></div>
                        <div className="text-left">
                          <div className="text-[11px] font-black text-emerald-900 uppercase">Створити профіль VoltStore</div>
                          <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-tight">Реєстрація займає 1 хвилину</div>
                        </div>
                        <ChevronRight size={20} className="ml-auto text-emerald-200" />
                     </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-10 animate-fade-in max-w-xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                  <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 mb-6">
                    <UserPlus size={32} />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Створити профіль</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-10">Додайте платіжні карти після реєстрації для миттєвих покупок.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">ПІБ</label>
                    <input required value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black uppercase" placeholder="Іван Іванов" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Email</label>
                    <input required type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-black" placeholder="example@mail.com" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Пароль (Pro Security)</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-xs font-black" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-widest hover:bg-emerald-600 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={20} /> Зареєструватися</>}
                </button>
                
                <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  Вже маєте акаунт? <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-600 hover:underline">Увійти</button>
                </p>
              </form>
            )}
        </div>
      </div>
    );
  }

  // ГОЛОВНИЙ ЕКРАН КАБІНЕТУ
  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-32 pt-6 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl relative">
                <User size={40} />
                <div className="absolute -bottom-2 -right-2 bg-slate-900 p-2 rounded-xl border border-white/10 text-emerald-400 shadow-lg"><Fingerprint size={16} /></div>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter truncate w-full text-center">{userData.name || 'Клієнт'}</h3>
              <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest mt-2 border border-emerald-500/20">Pro Member</div>
              <button 
                onClick={() => { setIsIdentified(false); setAuthMode('login'); }} 
                className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mt-6 hover:text-rose-500 transition-colors flex items-center gap-2"
              >
                <KeyRound size={10} /> Вийти з профілю
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-[3rem] p-3 border border-slate-100 shadow-xl flex flex-col gap-2">
            {[
              { id: 'profile', label: 'Профіль та безпека', icon: User },
              { id: 'history', label: 'Історія покупок', icon: ShoppingBag },
              { id: 'payments', label: 'Методи оплати', icon: CreditCard },
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'text-emerald-400' : ''} /> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full space-y-10">
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-fade-in">
              <div className="px-4">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Профіль та безпека</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Керування персональними активами та доступом</p>
              </div>
              
              <div className="bg-white rounded-[4rem] p-10 md:p-14 border border-slate-100 shadow-xl space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Повне ім'я</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-6 text-sm font-black uppercase outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Контактний Email</label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-6 text-sm font-black outline-none opacity-60" value={userData.email} readOnly />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-4">Адреса доставки за замовчуванням</label>
                    <div className="relative">
                      <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-8 py-6 text-sm font-black uppercase outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" value={userData.address} onChange={e => setUserData({...userData, address: e.target.value})} placeholder="Місто, вул. Назва, буд. Номер" />
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-3">
                     <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl"><ShieldCheck size={20} /></div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Дані захищені VoltStore Security</span>
                  </div>
                  <button className="w-full md:w-auto bg-slate-900 text-white px-12 py-6 rounded-[2rem] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-2xl active:scale-95">Оновити профіль</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="space-y-10 animate-fade-in text-center py-20 bg-white rounded-[4rem] border border-slate-100 shadow-xl">
                <div className="bg-slate-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200"><ShoppingBag size={40} /></div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Історія пуста</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto">Ви ще не здійснювали покупок у мережі VoltStore.</p>
             </div>
          )}

          {activeTab === 'payments' && (
             <div className="space-y-10 animate-fade-in">
                <div className="px-4"><h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Методи оплати</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <button className="bg-white p-10 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all group shadow-sm">
                      <Plus size={32} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Додати нову карту</span>
                   </button>
                </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

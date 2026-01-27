
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
    if (!searchQuery.trim()) {
      addNotification("Введіть ваше ім'я або email", "info");
      return;
    }
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
        setAuthMode('register');
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

  if (!isIdentified) {
    return (
      <div className="max-w-4xl mx-auto py-12 md:py-20 animate-fade-in px-4">
        <div className="bg-white p-10 md:p-16 rounded-[4rem] border border-slate-100 shadow-[0_32px_120px_-20px_rgba(0,0,0,0.12)] space-y-12 overflow-hidden relative">
            
            <div className="flex justify-center mb-4">
              <div className="bg-slate-50 p-1.5 rounded-2xl flex border border-slate-100 shadow-inner">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Вхід
                </button>
                <button 
                  onClick={() => setAuthMode('register')}
                  className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Реєстрація
                </button>
              </div>
            </div>

            {authMode === 'login' ? (
              <div className="space-y-12 animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="flex justify-center gap-4 mb-6 relative">
                    <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-2xl relative z-10">
                      <User size={32} />
                    </div>
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 border border-slate-100 absolute -right-4 top-2 rotate-12 scale-90">
                      <AtSign size={32} />
                    </div>
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Ідентифікація</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">Система імітує пошук у базі за ім'ям та email адресою одночасно.</p>
                </div>
                
                <div className="max-w-md mx-auto relative group">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                     <AtSign size={18} />
                   </div>
                   <input 
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] pl-16 pr-24 py-7 text-sm font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" 
                     placeholder="Anders Jensen або anders@dk..." 
                   />
                   <button onClick={handleLogin} className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white p-5 rounded-2xl hover:bg-emerald-500 transition-all shadow-xl active:scale-95">
                     {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <ArrowRight size={24}/>}
                   </button>
                </div>

                <div className="pt-8 border-t border-slate-50 max-w-md mx-auto space-y-6">
                     <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">Вперше у нас?</div>
                     <button 
                        onClick={() => setAuthMode('register')}
                        className="w-full flex items-center justify-center gap-6 p-8 rounded-[2.5rem] border-2 border-emerald-100 bg-emerald-50/20 hover:bg-emerald-50 transition-all group shadow-2xl shadow-emerald-500/5"
                     >
                        <div className="bg-emerald-500 text-white p-5 rounded-3xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                          <UserPlus size={24} />
                        </div>
                        <div className="text-left">
                          <div className="text-[12px] font-black text-emerald-900 uppercase tracking-tight">Створити профіль VoltStore</div>
                          <div className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mt-1">Реєстрація займає лише 1 хвилину</div>
                        </div>
                        <ChevronRight size={24} className="ml-auto text-emerald-200 group-hover:translate-x-2 transition-transform" />
                     </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-10 animate-fade-in max-w-xl mx-auto">
                <div className="text-center space-y-4 mb-10">
                  <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-emerald-500/20 mb-8">
                    <UserPlus size={40} />
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Новий Клієнт</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed px-10">Доступ до оплати збереженими картами відкриється після реєстрації.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Повне ім'я</label>
                    <input required value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-xs font-black uppercase focus:border-emerald-400 focus:bg-white transition-all outline-none" placeholder="Іван Іванов" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Email</label>
                    <input required type="email" value={userData.email} onChange={e => setUserData({...userData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-xs font-black focus:border-emerald-400 focus:bg-white transition-all outline-none" placeholder="example@mail.com" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Пароль (Pro Security)</label>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-16 pr-6 py-5 text-xs font-black focus:border-emerald-400 focus:bg-white transition-all outline-none" />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black uppercase text-[14px] tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-3xl active:scale-95 flex items-center justify-center gap-4"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={24} /> Зареєструватися у VoltStore</>}
                </button>
                
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Вже маєте акаунт? <button type="button" onClick={() => setAuthMode('login')} className="text-emerald-600 hover:text-emerald-500 font-black decoration-emerald-600/30 underline decoration-2 underline-offset-4">Увійти</button>
                </p>
              </form>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-32 pt-6 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-3xl relative overflow-hidden group border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl relative">
                <User size={40} />
                <div className="absolute -bottom-2 -right-2 bg-slate-900 p-2 rounded-xl border border-white/10 text-emerald-400 shadow-lg"><Fingerprint size={16} /></div>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter truncate w-full text-center">{userData.name || 'Клієнт'}</h3>
              <div className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] mt-3 border border-emerald-500/20">Pro Member</div>
              <button 
                onClick={() => { setIsIdentified(false); setAuthMode('login'); }} 
                className="text-[9px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-[0.3em] mt-8 transition-colors flex items-center gap-2 group/logout"
              >
                <KeyRound size={12} className="group-hover/logout:rotate-12 transition-transform" /> Вийти з профілю
              </button>
            </div>
          </div>
          
          <nav className="bg-white rounded-[3.5rem] p-4 border border-slate-100 shadow-2xl flex flex-col gap-3">
            {[
              { id: 'profile', label: 'Профіль та безпека', icon: User },
              { id: 'history', label: 'Історія покупок', icon: ShoppingBag },
              { id: 'payments', label: 'Методи оплати', icon: CreditCard },
            ].map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={`w-full flex items-center gap-6 px-8 py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <tab.icon size={20} className={activeTab === tab.id ? 'text-emerald-400' : ''} /> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full space-y-12">
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-fade-in">
              <div className="px-6">
                <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Профіль та безпека</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Керування персональними активами та безпекою доступу</p>
              </div>
              
              <div className="bg-white rounded-[4rem] p-12 md:p-16 border border-slate-100 shadow-2xl space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-6">Повне ім'я</label>
                    <div className="relative group">
                      <User className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] pl-20 pr-8 py-7 text-sm font-black uppercase outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" value={userData.name} onChange={e => setUserData({...userData, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-6">Email адреса</label>
                    <div className="relative group">
                      <Mail className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] pl-20 pr-8 py-7 text-sm font-black outline-none opacity-60 cursor-not-allowed" value={userData.email} readOnly />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-6">Основна адреса доставки</label>
                    <div className="relative group">
                      <MapPin className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                      <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] pl-20 pr-8 py-7 text-sm font-black uppercase outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" value={userData.address} onChange={e => setUserData({...userData, address: e.target.value})} placeholder="Місто, вул. Назва, буд. Номер" />
                    </div>
                  </div>
                </div>

                <div className="pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-4 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100/50">
                     <ShieldCheck className="text-emerald-600" size={24} />
                     <span className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.1em]">Ваші дані під надійним захистом Pro Security</span>
                  </div>
                  <button className="w-full md:w-auto bg-slate-900 text-white px-16 py-7 rounded-[2.5rem] text-[12px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-3xl active:scale-95">Оновити Профіль</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="space-y-10 animate-fade-in text-center py-24 bg-white rounded-[4rem] border border-slate-100 shadow-2xl">
                <div className="bg-slate-50 w-28 h-28 rounded-[3rem] flex items-center justify-center mx-auto mb-8 text-slate-200 shadow-inner"><ShoppingBag size={48} /></div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Історія Пуста</h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed px-6">Ви ще не робили замовлень у VoltStore. Ознайомтесь з нашим каталогом для вибору енергорішень.</p>
             </div>
          )}

          {activeTab === 'payments' && (
             <div className="space-y-10 animate-fade-in">
                <div className="px-6"><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Методи оплати</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <button className="bg-white p-16 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-6 text-slate-300 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/10 transition-all group shadow-sm">
                      <Plus size={48} className="group-hover:rotate-90 transition-transform duration-500" />
                      <span className="text-[12px] font-black uppercase tracking-widest">Додати нову карту</span>
                   </button>
                </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

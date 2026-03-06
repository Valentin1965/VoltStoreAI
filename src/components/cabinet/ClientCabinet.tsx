import React, { useState, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { AppView } from '../../types';
import { 
  ShoppingBag, User, Zap, ShieldCheck, 
  AtSign, UserPlus, ArrowRight, Loader2,
  KeyRound, ChevronLeft, LogIn, Activity,
  LayoutGrid, LogOut
} from 'lucide-react';

export const ClientCabinet: React.FC = () => {
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();
  const { currentUser, login, logout, findUser, registerUser } = useUser();
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('guest');
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleLogin = useCallback(() => {
    if (!searchQuery.trim()) {
      addNotification(t('profile_email'), "info");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const profile = findUser(searchQuery);
      if (profile) {
        login(profile);
        addNotification(`Velkommen, ${profile.name}!`, 'success');
      } else {
        addNotification("Identity not recognized.", "error");
      }
      setIsProcessing(false);
    }, 1000);
  }, [searchQuery, findUser, login, addNotification, t]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      const newUser = registerUser(regData);
      login(newUser);
      addNotification(t('item_added'), "success");
      setIsProcessing(false);
    }, 1500);
  };

  if (!currentUser && authMode !== 'guest') {
    return (
      <div className="max-w-[450px] mx-auto py-20 px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8">
            <button onClick={() => setAuthMode('guest')} className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[9px] tracking-[0.2em] transition-all">
              <ChevronLeft size={14} /> {language === 'da' ? 'Annuller' : 'Cancel'}
            </button>
            
            <div className="text-center space-y-3">
               <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 {authMode === 'login' ? <KeyRound size={28} /> : <UserPlus size={28} />}
               </div>
               <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                 {authMode === 'login' ? t('cabinet_login') : t('cabinet_register')}
               </h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                 {authMode === 'login' ? 'Access your energy assets terminal' : 'Create your secure profile at Green Light'}
               </p>
            </div>

            {authMode === 'login' ? (
              <div className="space-y-4">
                <div className="relative group">
                   <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                   <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" placeholder="name@company.dk" />
                </div>
                <button onClick={handleLogin} disabled={isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <><LogIn size={18} /> {t('cabinet_initialize')}</>}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <input required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all" placeholder={t('profile_name')} />
                <input required type="email" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all" placeholder={t('profile_email')} />
                <button type="submit" disabled={isProcessing} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 mt-4">
                  {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Register User'}
                </button>
              </form>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 pt-10 px-6 text-left">
      <div className="flex flex-col lg:flex-row gap-16 items-start">
        <aside className="w-full lg:w-80 shrink-0 space-y-8">
          <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-3xl relative overflow-hidden border border-white/5">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl border border-white/10">
                <User size={40} className={currentUser ? 'text-emerald-400' : 'text-slate-500'} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-center">{currentUser ? currentUser.name : 'Guest Session'}</h3>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mt-4 border border-emerald-500/20">
                <ShieldCheck size={12} /> {currentUser ? t('cabinet_verified') : 'Limited Access'}
              </div>
              <div className="mt-12 w-full space-y-3">
                {currentUser ? (
                  <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                    <LogOut size={14} /> {t('cabinet_logout')}
                  </button>
                ) : (
                  <>
                    <button onClick={() => setAuthMode('login')} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-lg">
                      <LogIn size={14} /> {t('cabinet_login')}
                    </button>
                    <button onClick={() => setAuthMode('register')} className="w-full bg-white/5 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/10">
                      {t('cabinet_register')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <nav className="bg-white rounded-[3rem] p-4 border border-slate-100 shadow-xl flex flex-col gap-2">
            {[
              { id: 'profile', label: t('cabinet_home'), icon: Activity },
              { id: 'history', label: t('cabinet_history'), icon: ShoppingBag },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-5 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
                <tab.icon size={20} className={activeTab === tab.id ? 'text-emerald-400' : ''} /> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[500px]">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-10 shadow-inner">
                <ShieldCheck size={48} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter max-w-lg leading-[0.9]">
                {currentUser ? `${t('cabinet_verified')}: ${currentUser.name}` : t('cabinet_welcome')}
              </h2>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mt-6 max-w-sm leading-relaxed">
                {t('cabinet_desc')}
              </p>
              <div className="flex gap-4 mt-12">
                <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CATALOG }))} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center gap-4 shadow-xl">
                  {t('see_all_products')} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[4rem] border border-slate-100 shadow-2xl text-slate-900">
              <div className="bg-slate-50 p-10 rounded-[2.5rem] mb-8 border border-slate-100">
                <ShoppingBag size={60} className="text-slate-200" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t('cabinet_no_orders')}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-4 max-w-xs text-center">{t('cabinet_no_orders')}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
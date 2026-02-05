
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { Order, AppView } from '../../types';
import { 
  ShoppingBag, User, Zap, MapPin, Mail, 
  CreditCard, ShieldCheck, Plus, Award,
  Fingerprint, AtSign, UserPlus, ChevronRight, ArrowRight, Loader2,
  Lock, KeyRound, ChevronLeft, LogIn
} from 'lucide-react';

export const ClientCabinet: React.FC = () => {
  const { t, formatPrice } = useLanguage();
  const { addNotification } = useNotification();
  const { currentUser, login, logout, findUser, registerUser } = useUser();
  
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('guest');
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'payments'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const goBackToAbout = () => {
    window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.ABOUT }));
  };

  const handleLogin = () => {
    if (!searchQuery.trim()) {
      addNotification("Enter your email address", "info");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const profile = findUser(searchQuery);
      if (profile) {
        login(profile);
        addNotification(`Welcome back, ${profile.name}!`, 'success');
      } else {
        addNotification("Email not found.", "error");
      }
      setIsProcessing(false);
    }, 800);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.email) return;
    setIsProcessing(true);
    setTimeout(() => {
      const newUser = registerUser({
        name: regData.name,
        email: regData.email,
        phone: regData.phone,
        address: regData.address
      });
      login(newUser);
      addNotification("VoltStore profile created!", "success");
      setIsProcessing(false);
    }, 1200);
  };

  if (!currentUser && authMode !== 'guest') {
    return (
      <div className="max-w-[400px] mx-auto py-10 animate-fade-in px-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-3xl space-y-6">
            <button onClick={() => setAuthMode('guest')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[8px] tracking-widest transition-all">
              <ChevronLeft size={12} /> Back to Dashboard
            </button>
            
            {authMode === 'login' ? (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Sign In</h2>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Access your cloud assets</p>
                </div>
                <div className="relative group">
                   <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                   <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3.5 text-[11px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all" placeholder="example@mail.com" />
                </div>
                <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="animate-spin" size={14}/> : 'Authenticate'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Join Network</h2>
                </div>
                <input required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-[10px] font-black focus:border-emerald-400 outline-none" placeholder="Name" />
                <input required type="email" value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-[10px] font-black focus:border-emerald-400 outline-none" placeholder="Email" />
                <button type="submit" disabled={isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all">
                  {isProcessing ? <Loader2 className="animate-spin" size={14} /> : 'Create Identity'}
                </button>
              </form>
            )}
        </div>
      </div>
    );
  }

  // Dashboard for Guests or Logged In Users
  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-32 pt-6 px-4">
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-3xl relative overflow-hidden group border border-white/5">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-900 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl">
                <User size={40} className={currentUser ? 'text-emerald-400' : 'text-slate-500'} />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-center">
                {currentUser ? currentUser.name : 'Guest Session'}
              </h3>
              <div className="bg-white/5 text-slate-400 px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] mt-3 border border-white/5">
                {currentUser ? 'Verified Pro' : 'Incognito Mode'}
              </div>
              
              {currentUser ? (
                <button onClick={logout} className="text-[9px] font-black text-slate-500 hover:text-rose-500 uppercase tracking-[0.3em] mt-8 transition-colors flex items-center gap-2">
                  <KeyRound size={12} /> Log Out
                </button>
              ) : (
                <div className="mt-8 flex flex-col gap-3 w-full">
                   <button onClick={() => setAuthMode('login')} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                     <LogIn size={12} /> Sign In
                   </button>
                   <button onClick={() => setAuthMode('register')} className="w-full bg-white/10 text-white py-3 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2 border border-white/10">
                     <UserPlus size={12} /> Register
                   </button>
                </div>
              )}
            </div>
          </div>
          
          <nav className="bg-white rounded-[3.5rem] p-4 border border-slate-100 shadow-2xl flex flex-col gap-2">
            {[
              { id: 'profile', label: 'Dashboard', icon: User },
              { id: 'history', label: 'Orders', icon: ShoppingBag },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-6 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
                <tab.icon size={18} className={activeTab === tab.id ? 'text-emerald-400' : ''} /> {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full space-y-10">
          {activeTab === 'profile' && (
            <div className="space-y-10 animate-fade-in">
              <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Welcome to Terminal</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-4 max-w-xs">
                  Your secure node for managing energy assets and monitoring installation status.
                </p>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CATALOG }))}
                  className="mt-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3"
                >
                  Explore Catalog <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
             <div className="space-y-10 animate-fade-in text-center py-24 bg-white rounded-[4rem] border border-slate-100 shadow-2xl">
                <ShoppingBag size={48} className="mx-auto text-slate-100 mb-6" />
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Zero Order Records</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto">No local or cloud purchase records found in this session.</p>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};

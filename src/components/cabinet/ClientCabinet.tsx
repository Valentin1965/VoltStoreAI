import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';
import { useCart } from '../../contexts/CartContext';
import { AppView } from '../../types';
import {
  ShoppingBag, User, ShieldCheck,
  AtSign, UserPlus, ArrowRight, Loader2,
  KeyRound, ChevronLeft, LogIn, Activity,
  LogOut, Package, MapPin, Phone, Mail,
  ShoppingCart, Zap
} from 'lucide-react';
import { supabase } from '../../services/supabase';

export const ClientCabinet: React.FC = () => {
  const { t, language, formatPrice } = useLanguage();
  const { addNotification } = useNotification();
  const { currentUser, login, logout, findUser, registerUser } = useUser();
  const { items: cartItems, totalPrice, totalItems: cartCount } = useCart();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('guest');
  const [activeTab, setActiveTab] = useState<'profile' | 'cart' | 'history'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [regData, setRegData] = useState({ name: '', email: '', phone: '', address: '' });

  // Load order history from Supabase when on history tab
  useEffect(() => {
    if (activeTab === 'history' && currentUser?.email) {
      setLoadingOrders(true);
      supabase.from('orders')
        .select('id, created_at, total_price, status, currency, items')
        .eq('customer_email', currentUser.email)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          if (!error && data) setOrders(data);
          setLoadingOrders(false);
        });
    }
  }, [activeTab, currentUser]);

  const handleLogin = useCallback(() => {
    if (!searchQuery.trim()) {
      addNotification(t('profile_email'), 'info');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const profile = findUser(searchQuery);
      if (profile) {
        login(profile);
        addNotification(`Velkommen, ${profile.name}!`, 'success');
        setAuthMode('guest');
      } else {
        addNotification('Ingen profil fundet for denne email.', 'error');
      }
      setIsProcessing(false);
    }, 800);
  }, [searchQuery, findUser, login, addNotification, t]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.email) {
      addNotification('Navn og email er påkrævet', 'error');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const newUser = registerUser(regData);
      login(newUser);
      addNotification('Profil oprettet!', 'success');
      setAuthMode('guest');
      setIsProcessing(false);
    }, 1000);
  };

  const goToCheckout = () =>
    window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CHECKOUT }));

  const goToCatalog = () =>
    window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CATALOG }));

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      processing: 'bg-blue-50 text-blue-500',
      confirmed:  'bg-emerald-50 text-emerald-600',
      pending:    'bg-amber-50 text-amber-600',
      cancelled:  'bg-rose-50 text-rose-500',
      delivered:  'bg-slate-100 text-slate-500',
    };
    return map[s] || 'bg-slate-50 text-slate-400';
  };

  // ── Auth screen ──────────────────────────────────────────────────────────
  if (!currentUser && authMode !== 'guest') {
    return (
      <div className="max-w-[450px] mx-auto py-16 px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8">
          <button onClick={() => setAuthMode('guest')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[9px] tracking-widest transition-all">
            <ChevronLeft size={14} /> {language === 'da' ? 'Annuller' : 'Cancel'}
          </button>
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              {authMode === 'login' ? <KeyRound size={28} /> : <UserPlus size={28} />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              {authMode === 'login' ? t('cabinet_login') : t('cabinet_register')}
            </h2>
          </div>

          {authMode === 'login' ? (
            <div className="space-y-4">
              <div className="relative group">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all"
                  placeholder="name@company.dk" />
              </div>
              <button onClick={handleLogin} disabled={isProcessing}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> {t('cabinet_initialize')}</>}
              </button>
              <button onClick={() => setAuthMode('register')} className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-all py-2">
                Ingen profil? Opret her →
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {[
                { key: 'name', placeholder: t('profile_name'), required: true },
                { key: 'email', placeholder: 'Email *', type: 'email', required: true },
                { key: 'phone', placeholder: t('profile_phone') },
                { key: 'address', placeholder: 'Adresse' },
              ].map(f => (
                <input key={f.key} required={f.required} type={f.type || 'text'}
                  value={(regData as any)[f.key]} onChange={e => setRegData({ ...regData, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all" />
              ))}
              <button type="submit" disabled={isProcessing}
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl mt-2 flex items-center justify-center gap-3">
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /> Opret Profil</>}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Main cabinet ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 pt-10 px-6 text-left">
      <div className="flex flex-col lg:flex-row gap-10 items-start">

        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          {/* Profile card */}
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-xl">
                <User size={36} className={currentUser ? 'text-emerald-400' : 'text-slate-500'} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">{currentUser ? currentUser.name : 'Gæst'}</h3>
                {currentUser?.email && <p className="text-[10px] text-slate-400 font-bold mt-1">{currentUser.email}</p>}
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                <ShieldCheck size={11} /> {currentUser ? t('cabinet_verified') : 'Gæst session'}
              </div>

              {/* Cart summary in sidebar */}
              {cartCount > 0 && (
                <button onClick={goToCheckout}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} />
                    <span>Til kassen</span>
                  </div>
                  <span className="bg-white/20 rounded-full px-2 py-0.5">{cartCount}</span>
                </button>
              )}

              {/* Auth buttons */}
              <div className="w-full space-y-2 pt-2">
                {currentUser ? (
                  <button onClick={logout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                    <LogOut size={13} /> {t('cabinet_logout')}
                  </button>
                ) : (
                  <>
                    <button onClick={() => setAuthMode('login')}
                      className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                      <LogIn size={14} /> {t('cabinet_login')}
                    </button>
                    <button onClick={() => setAuthMode('register')}
                      className="w-full bg-white/5 text-white py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all border border-white/10">
                      {t('cabinet_register')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="bg-white rounded-[2.5rem] p-3 border border-slate-100 shadow-lg flex flex-col gap-1">
            {[
              { id: 'profile',  label: 'Profil',   icon: Activity },
              { id: 'cart',     label: `Kurv${cartCount > 0 ? ` (${cartCount})` : ''}`, icon: ShoppingCart },
              { id: 'history',  label: t('cabinet_history'), icon: ShoppingBag },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
                <tab.icon size={18} className={activeTab === tab.id ? 'text-emerald-400' : ''} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 w-full min-w-0">

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl space-y-8">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{currentUser.name}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('cabinet_verified')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: Mail,    label: 'Email',   val: currentUser.email },
                      { icon: Phone,   label: 'Telefon', val: currentUser.phone || '—' },
                      { icon: MapPin,  label: 'Adresse', val: currentUser.address || '—' },
                      { icon: Package, label: 'Ordrer',  val: orders.length ? `${orders.length} ordrer` : 'Ingen ordrer endnu' },
                    ].map(row => (
                      <div key={row.label} className="bg-slate-50 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <row.icon size={16} className="text-emerald-500" />
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{row.label}</div>
                          <div className="text-xs font-black text-slate-900 mt-0.5">{row.val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl">
                    <Zap size={14} /> {t('see_all_products')} <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <User size={48} className="text-slate-200" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t('cabinet_welcome')}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 max-w-xs mx-auto leading-relaxed">{t('cabinet_desc')}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setAuthMode('login')}
                      className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl flex items-center gap-2">
                      <LogIn size={14} /> Log ind
                    </button>
                    <button onClick={goToCatalog}
                      className="bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                      <ShoppingBag size={14} /> Se produkter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CART TAB */}
          {activeTab === 'cart' && (
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <ShoppingCart size={24} className="text-emerald-500" /> Din Kurv
              </h2>
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <ShoppingCart size={40} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurven er tom</p>
                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg">
                    <Zap size={14} /> Se produkter
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-5 gap-4">
                        <div className="flex items-center gap-4">
                          {item.images?.[0] && (
                            <img src={item.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover bg-white border border-slate-100" />
                          )}
                          <div>
                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight max-w-[180px] truncate">
                              {typeof item.name === 'string' ? item.name : (item.name as any)?.en || ''}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Antal: {item.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-900 shrink-0">
                          {formatPrice((item.price || 0) * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 rounded-[2rem] p-7 flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</div>
                      <div className="text-2xl font-black text-emerald-400">{formatPrice(totalPrice)}</div>
                    </div>
                    <button onClick={goToCheckout}
                      className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl flex items-center gap-3">
                      <ShoppingCart size={16} /> Til kassen <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <ShoppingBag size={24} className="text-emerald-500" /> {t('cabinet_history')}
              </h2>

              {!currentUser ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log ind for at se din ordrehistorik</p>
                  <button onClick={() => setAuthMode('login')}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2">
                    <LogIn size={14} /> Log ind
                  </button>
                </div>
              ) : loadingOrders ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <ShoppingBag size={40} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_no_orders')}</p>
                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2">
                    <Zap size={14} /> Start shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ordre ID</div>
                          <div className="text-xs font-black text-slate-900 font-mono">{order.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dato</div>
                          <div className="text-xs font-bold text-slate-600">{new Date(order.created_at).toLocaleDateString('da-DK')}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</div>
                          <div className="text-xs font-black text-slate-900">{formatPrice(order.total_price)}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${statusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-slate-200">
                          {order.items.slice(0, 3).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                              <span>{it.quantity}× {it.name}</span>
                              <span>{formatPrice(it.price * it.quantity)}</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-[9px] font-bold text-slate-400">+{order.items.length - 3} varer til</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

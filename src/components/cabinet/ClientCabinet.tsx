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
  ShoppingCart, Zap, Building2, Percent,
  Truck, Edit3, Check, Bell, BellOff, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export const ClientCabinet: React.FC = () => {
  const { t, language, formatPrice } = useLanguage();
  const { addNotification } = useNotification();
  const { currentUser, isLoadingUser, loginByEmail, registerClient, logout } = useUser();
  const push = usePushNotifications(currentUser?.id ?? null);
  const { items: cartItems, totalPrice, totalItems: cartCount } = useCart();

  const [authMode, setAuthMode] = useState<'idle' | 'login' | 'register'>('idle');
  const [activeTab, setActiveTab] = useState<'profile' | 'cart' | 'history'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');

  // Register form
  const [reg, setReg] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    client_type: 'private' as 'private' | 'business',
    company_name: '', vat_number: '',
    country: 'Danmark', city: '', street: '', house_number: '', postal_code: '',
  });

  // Load order history
  useEffect(() => {
    if (activeTab !== 'history' || !currentUser?.email) return;
    setLoadingOrders(true);
    supabase.rpc('get_client_orders', { p_client_id: currentUser.id })
      .then(({ data, error }) => {
        if (!error && data) setOrders(data);
        setLoadingOrders(false);
      });
  }, [activeTab, currentUser]);

  const handleLogin = useCallback(async () => {
    if (!loginEmail.trim()) { addNotification(t('cabinet_enter_email'), 'info'); return; }
    setIsProcessing(true);
    const result = await loginByEmail(loginEmail.trim());
    if (result === 'found') {
      addNotification(t('cabinet_welcome_back'), 'success');
      setAuthMode('idle');
      setLoginEmail('');
    } else {
      addNotification(t('cabinet_not_found'), 'error');
      setReg(r => ({ ...r, email: loginEmail }));
    }
    setIsProcessing(false);
  }, [loginEmail, loginByEmail, addNotification, t]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.first_name || !reg.email) { addNotification(t('cabinet_fields_required'), 'error'); return; }
    setIsProcessing(true);
    try {
      await registerClient({
        ...reg,
        email: reg.email.trim(),
      });
      addNotification(t('cabinet_profile_created'), 'success');
      setAuthMode('idle');
    } catch (err: any) {
      addNotification(err.message || t('cabinet_create_error'), 'error');
    }
    setIsProcessing(false);
  };

  const goToCheckout = () => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CHECKOUT }));
  const goToCatalog  = () => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CATALOG }));

  const statusLabel = (o: any) => {
    const s = o.order_status || o.status;
    const map: Record<string, { label: string; cls: string }> = {
      in_transit:         { label: t('status_in_transit'),          cls: 'bg-emerald-50 text-emerald-600' },
      awaiting_transport: { label: t('status_awaiting_transport'), cls: 'bg-purple-50 text-purple-600' },
      in_progress:        { label: t('status_in_progress'),          cls: 'bg-amber-50 text-amber-600' },
      accepted:           { label: t('status_accepted'),           cls: 'bg-blue-50 text-blue-600' },
      processing:         { label: t('status_processing'),          cls: 'bg-blue-50 text-blue-500' },
      confirmed:          { label: t('status_confirmed'),          cls: 'bg-emerald-50 text-emerald-600' },
      cancelled:          { label: t('status_cancelled'),         cls: 'bg-rose-50 text-rose-500' },
      delivered:          { label: t('status_delivered'),            cls: 'bg-slate-100 text-slate-500' },
    };
    return map[s] || { label: s || '—', cls: 'bg-slate-50 text-slate-400' };
  };

  if (isLoadingUser) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 size={32} className="animate-spin text-emerald-500" />
    </div>
  );

  if (!currentUser) return (
    <div className="max-w-[480px] mx-auto py-16 px-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8">
        {authMode !== 'idle' && (
          <button onClick={() => setAuthMode('idle')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[9px] tracking-widest transition-all">
            <ChevronLeft size={14} /> {t('cancel')}
          </button>
        )}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            {authMode === 'idle' ? <User size={28} /> : authMode === 'login' ? <KeyRound size={28} /> : <UserPlus size={28} />}
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
            {authMode === 'idle' ? t('cabinet_account_title') : authMode === 'login' ? t('cabinet_btn_login') : t('cabinet_btn_register')}
          </h2>
          {authMode === 'idle' && (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
              {t('cabinet_login_prompt')}
            </p>
          )}
        </div>

        {authMode === 'idle' ? (
          <div className="space-y-3">
            <button onClick={() => setAuthMode('login')}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl">
              <LogIn size={18} /> {t('cabinet_btn_login')}
            </button>
            <button onClick={() => setAuthMode('register')}
              className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-xl">
              <UserPlus size={18} /> {t('cabinet_btn_register')}
            </button>
          </div>
        ) : authMode === 'login' ? (
          <div className="space-y-4">
            <div className="relative group">
              <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                placeholder="din@email.dk" type="email" />
            </div>
            <p className="text-[9px] text-slate-400 text-center font-bold tracking-wide">
              {t('cabinet_find_profile_hint')}
            </p>
            <button onClick={handleLogin} disabled={isProcessing}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> {t('cabinet_find_profile')}</>}
            </button>
            <button onClick={() => setAuthMode('register')}
              className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-all py-2">
              {t('cabinet_new_customer')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(['private', 'business'] as const).map(ct => (
                <button key={ct} type="button" onClick={() => setReg(r => ({ ...r, client_type: ct }))}
                  className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${reg.client_type === ct ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'}`}>
                  {ct === 'private' ? `👤 ${t('cabinet_type_private')}` : `🏢 ${t('cabinet_type_business')}`}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <input 
                  required 
                  value={reg.first_name}
                  onChange={e => setReg(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder={t('cabinet_placeholder_first_name')}
                  className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" 
                />
                <input 
                  value={reg.last_name}
                  onChange={e => setReg(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder={t('cabinet_placeholder_last_name')}
                  className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" 
                />
            </div>

            <input required type="email" value={reg.email}
              onChange={e => setReg(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t('cabinet_placeholder_email')}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />

            <input value={reg.phone} onChange={e => setReg(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t('cabinet_placeholder_phone')}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />

            {reg.client_type === 'business' && (
              <div className="space-y-3">
                <input value={reg.company_name} onChange={e => setReg(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder={t('cabinet_placeholder_company')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
                <input value={reg.vat_number} onChange={e => setReg(prev => ({ ...prev, vat_number: e.target.value }))}
                  placeholder={t('cabinet_placeholder_vat')}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <input value={reg.street} onChange={e => setReg(prev => ({ ...prev, street: e.target.value }))}
                placeholder={t('field_street_short')} className="col-span-2 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
              <input value={reg.house_number} onChange={e => setReg(prev => ({ ...prev, house_number: e.target.value }))}
                placeholder={t('field_house_short')} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={reg.postal_code} onChange={e => setReg(prev => ({ ...prev, postal_code: e.target.value }))}
                placeholder={t('field_postal_short')} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
              <input value={reg.city} onChange={e => setReg(prev => ({ ...prev, city: e.target.value }))}
                placeholder={t('field_city_short')} className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all" />
            </div>

            <button type="submit" disabled={isProcessing}
              className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl mt-2 flex items-center justify-center gap-3">
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><UserPlus size={18} /> {t('cabinet_btn_register')}</>}
            </button>
            <button type="button" onClick={() => setAuthMode('login')}
              className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-all py-2">
              {t('cabinet_have_profile')}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const fullAddr = currentUser
    ? [currentUser.street, currentUser.house_number].filter(Boolean).join(' ')
    : '';
  const cityLine = currentUser
    ? [currentUser.postal_code, currentUser.city, currentUser.country].filter(Boolean).join(', ')
    : '';

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32 pt-10 px-6 text-left">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
        <aside className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center border border-white/10 shadow-xl">
                {currentUser?.client_type === 'business'
                  ? <Building2 size={36} className="text-blue-400" />
                  : <User size={36} className={currentUser ? 'text-emerald-400' : 'text-slate-500'} />}
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {currentUser ? currentUser.name : t('checkout_guest')}
                </h3>
                {currentUser?.company_name && (
                  <p className="text-[10px] text-blue-400 font-bold mt-0.5">{currentUser.company_name}</p>
                )}
                {currentUser?.email && (
                  <p className="text-[10px] text-slate-400 font-bold mt-1">{currentUser.email}</p>
                )}
                {currentUser?.discount && currentUser.discount > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                    <Percent size={10} /> {currentUser.discount}{t('cabinet_discount_suffix')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                <ShieldCheck size={11} /> {currentUser ? t('profile_verified') : t('checkout_guest')}
              </div>

              {cartCount > 0 && (
                <button onClick={goToCheckout}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2"><ShoppingCart size={16} /><span>{t('cabinet_to_checkout')}</span></div>
                  <span className="bg-white/20 rounded-full px-2 py-0.5">{cartCount}</span>
                </button>
              )}

              {currentUser && push.status !== 'unsupported' && (
                <div className="w-full rounded-3xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {t('push_title')}
                  </div>
                  {push.status === 'denied' && (
                    <p className="text-[9px] font-bold text-rose-400 leading-relaxed">
                      {t('push_blocked')}
                    </p>
                  )}
                  {!import.meta.env.VITE_VAPID_PUBLIC_KEY && (
                    <p className="text-[9px] font-bold text-amber-400">
                      {t('push_not_configured')}
                    </p>
                  )}
                  {(push.status === 'default' || push.status === 'granted') && import.meta.env.VITE_VAPID_PUBLIC_KEY && (
                    <>
                      <div className={`flex items-center gap-3 p-3 rounded-2xl border ${push.isSubscribed ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-white/5 border-white/10'}`}>
                        {push.isSubscribed
                          ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                          : <Bell size={15} className="text-slate-400 shrink-0" />
                        }
                        <p className="text-[9px] font-bold text-slate-300 leading-relaxed">
                          {push.isSubscribed
                            ? t('push_active')
                            : t('push_inactive')
                          }
                        </p>
                      </div>
                      {push.isSubscribed ? (
                        <button onClick={push.unsubscribe}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-rose-700/50 text-rose-400 hover:bg-rose-900/20 transition-all text-[9px] font-black uppercase tracking-widest">
                          <BellOff size={12} /> {t('push_disable')}
                        </button>
                      ) : (
                        <button onClick={push.subscribe}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white transition-all text-[9px] font-black uppercase tracking-widest shadow">
                          <Bell size={12} /> {t('push_enable')}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

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
                      <LogIn size={14} /> {t('cabinet_btn_login')}
                    </button>
                    <button onClick={() => setAuthMode('register')}
                      className="w-full bg-white/5 text-white py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-white/10 transition-all border border-white/10">
                      {t('cabinet_btn_register')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <nav className="bg-white rounded-[2.5rem] p-3 border border-slate-100 shadow-lg flex flex-col gap-1">
            {[
              { id: 'profile', label: t('tab_profile'),   icon: Activity },
              { id: 'cart',    label: `${t('tab_cart')}${cartCount > 0 ? ` (${cartCount})` : ''}`, icon: ShoppingCart },
              { id: 'history', label: t('tab_history'), icon: ShoppingBag },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
                <tab.icon size={18} className={activeTab === tab.id ? 'text-emerald-400' : ''} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full min-w-0">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl space-y-8">
              {currentUser ? (
                <>
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-50 flex-wrap">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-[1.5rem] flex items-center justify-center">
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{currentUser.name}</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {currentUser.client_type === 'business' ? t('profile_business_customer') : t('profile_private_customer')} {t('profile_verified_suffix')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Mail size={16} className="text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('profile_email_label')}</div>
                        <div className="text-xs font-black text-slate-900 mt-0.5">{currentUser.email}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Phone size={16} className="text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('profile_phone_label')}</div>
                        <div className="text-xs font-black text-slate-900 mt-0.5">{currentUser.phone || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {currentUser.client_type === 'business' && currentUser.company_name && (
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
                      <Building2 size={18} className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">{t('profile_company_section')}</div>
                        <div className="text-sm font-black text-slate-900">{currentUser.company_name}</div>
                        {currentUser.vat_number && (
                          <div className="text-[10px] text-slate-500 font-bold mt-0.5">CVR/VAT: {currentUser.vat_number}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {(fullAddr || cityLine) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                        <MapPin size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('profile_billing_address')}</div>
                          <div className="text-xs font-bold text-slate-700">{fullAddr || '—'}</div>
                          <div className="text-[10px] text-slate-400">{cityLine}</div>
                        </div>
                      </div>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                        <Truck size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('profile_delivery_section')}</div>
                          {currentUser.delivery_same_as_billing ? (
                            <div className="text-xs text-slate-400 italic">{t('profile_delivery_same')}</div>
                          ) : currentUser.delivery_street ? (
                            <>
                              <div className="text-xs font-bold text-slate-700">
                                {[currentUser.delivery_street, currentUser.delivery_house_number].filter(Boolean).join(' ')}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {[currentUser.delivery_postal_code, currentUser.delivery_city, currentUser.delivery_country].filter(Boolean).join(', ')}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 italic">{t('profile_delivery_not_set')}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentUser.discount && currentUser.discount > 0 ? (
                    <div className="flex items-center gap-3 p-5 bg-amber-50 rounded-2xl border border-amber-100">
                      <Percent size={20} className="text-amber-500" />
                      <div>
                        <div className="text-[8px] font-black text-amber-400 uppercase tracking-widest">{t('profile_discount_label')}</div>
                        <div className="text-2xl font-black text-amber-600">{currentUser.discount}%</div>
                      </div>
                    </div>
                  ) : null}

                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl">
                    <Zap size={14} />{t('cabinet_btn_products')} <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <User size={48} className="text-slate-200" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t('cabinet_account_title')}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3 max-w-xs mx-auto leading-relaxed">
                      {t('cabinet_login_prompt')}
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <button onClick={() => setAuthMode('login')}
                      className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl flex items-center gap-2">
                      <LogIn size={14} /> {t('cabinet_btn_login')}
                    </button>
                    <button onClick={() => setAuthMode('register')}
                      className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2">
                      <UserPlus size={14} /> {t('cabinet_btn_register')}
                    </button>
                    <button onClick={goToCatalog}
                      className="bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                      <ShoppingBag size={14} /> {t('cabinet_btn_products')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cart' && (
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <ShoppingCart size={24} className="text-emerald-500" /> {t('cabinet_cart_title')}
              </h2>
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center">
                    <ShoppingCart size={40} className="text-slate-200" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_cart_empty')}</p>
                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg">
                    <Zap size={14} /> {t('cabinet_btn_products')}
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
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('cabinet_cart_qty')}: {item.quantity}</div>
                          </div>
                        </div>
                        <div className="text-sm font-black text-slate-900 shrink-0">{formatPrice((item.price || 0) * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-900 rounded-[2rem] p-7 flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('total')}</div>
                      <div className="text-2xl font-black text-emerald-400">{formatPrice(totalPrice)}</div>
                    </div>
                    <button onClick={goToCheckout}
                      className="px-10 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all shadow-xl flex items-center gap-3">
                      <ShoppingCart size={16} /> {t('cabinet_cart_checkout')} <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <ShoppingBag size={24} className="text-emerald-500" /> {t('cabinet_history_title')}
              </h2>

              {!currentUser ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_login_for_history')}</p>
                  <button onClick={() => setAuthMode('login')}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2">
                    <LogIn size={14} /> {t('cabinet_btn_login')}
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_no_orders_yet')}</p>
                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2">
                    <Zap size={14} /> {t('cabinet_start_shopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => {
                    const st = statusLabel(order);
                    const oNo = order.order_number || ('GLS-' + order.id.slice(0, 8).toUpperCase());
                    const oItems: any[] = Array.isArray(order.items) ? order.items : [];
                    return (
                      <div key={order.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-1">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_order_label')}</div>
                            <div className="text-xs font-black text-emerald-600 font-mono">{oNo}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_date_label')}</div>
                            <div className="text-xs font-bold text-slate-600">{new Date(order.created_at).toLocaleDateString(language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB')}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('cabinet_total_label')}</div>
                            <div className="text-xs font-black text-slate-900">{formatPrice(order.total_price)}</div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${st.cls}`}>{st.label}</span>
                        </div>

                        {(order.shipping_date || order.arrival_date) && (
                          <div className="flex gap-4 flex-wrap pt-1">
                            {order.shipping_date && (
                              <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                📤 {t('cabinet_shipped_label')}: {new Date(order.shipping_date).toLocaleDateString(language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB')}
                              </div>
                            )}
                            {order.arrival_date && (
                              <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                📥 {t('cabinet_arrival_label')}: {new Date(order.arrival_date).toLocaleDateString(language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB')}
                              </div>
                            )}
                          </div>
                        )}

                        {oItems.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-slate-200">
                            {oItems.slice(0, 3).map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                <span>{it.quantity}× {it.name}</span>
                                <span>{formatPrice(it.price * it.quantity)}</span>
                              </div>
                            ))}
                            {oItems.length > 3 && (
                              <div className="text-[9px] font-bold text-slate-400">+{oItems.length - 3} {t('cabinet_more_items')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
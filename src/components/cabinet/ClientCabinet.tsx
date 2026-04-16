import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  useUser,
  MFA_ENROLL_REQUIRED_MESSAGE,
  parseMfaVerifyPendingMessage,
} from '../../contexts/UserContext';
import { useCart } from '../../contexts/CartContext';
import { AppView } from '../../types';
import {
  ShoppingBag, User, ShieldCheck,
  AtSign, UserPlus, ArrowRight, Loader2,
  KeyRound, ChevronLeft, LogIn, Activity, Mail,
  LogOut, Package, MapPin, Phone,
  ShoppingCart, Zap, Building2, Percent,
  Truck, Edit3, Check, Bell, BellOff, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { totpVerifyUserFacingMessage } from '../../utils/totpVerifyErrors';

export const ClientCabinet: React.FC = () => {
  const { t, language, formatPrice } = useLanguage();
  const { addNotification } = useNotification();
  const {
    currentUser,
    isLoadingUser,
    loginWithEmailPassword,
    completeTotpVerification,
    renewTotpChallenge,
    registerClient,
    refreshSessionProfile,
    logout,
  } = useUser();
  const push = usePushNotifications(currentUser?.id ?? null);
  const { items: cartItems, totalPrice, totalItems: cartCount } = useCart();

  const [authMode, setAuthMode] = useState<'idle' | 'login' | 'register'>('idle');
  const [activeTab, setActiveTab] = useState<'profile' | 'cart' | 'history'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [hasSbSession, setHasSbSession] = useState(false);
  const [totpOn, setTotpOn] = useState(false);
  const [loginMfa, setLoginMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [loginTotpCode, setLoginTotpCode] = useState('');
  const [totpEnroll, setTotpEnroll] = useState<{
    factorId: string;
    qrSvg: string;
    secret: string;
  } | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = useState('');

  // Register form
  const [reg, setReg] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', password_confirm: '',
    client_type: 'private' as 'private' | 'business',
    company_name: '', vat_number: '',
    country: 'Danmark', city: '', street: '', house_number: '', postal_code: '',
  });

  // Load order history
  useEffect(() => {
    if (activeTab !== 'history' || !currentUser?.email) return;
    setLoadingOrders(true);
    supabase
      .rpc('get_client_orders', { p_client_id: currentUser.id })
      .then(({ data, error }) => {
        if (!error && data) {
          const realOrders = (data as any[]).filter(o =>
            Array.isArray((o as any).items) &&
            (o as any).items.length > 0
          );
          setOrders(realOrders);
        }
        setLoadingOrders(false);
      });
  }, [activeTab, currentUser]);

  const resetLoginMfaState = useCallback(() => {
    setLoginMfa(null);
    setLoginTotpCode('');
  }, []);

  const inLoginStep2 = loginMfa !== null || totpEnroll !== null;

  const cancelPendingMfa = useCallback(async () => {
    setIsProcessing(true);
    await supabase.auth.signOut();
    resetLoginMfaState();
    setTotpEnroll(null);
    setTotpConfirmCode('');
    setIsProcessing(false);
  }, [resetLoginMfaState]);

  const goProfileLogin = useCallback(() => {
    setActiveTab('profile');
    setAuthMode('login');
    resetLoginMfaState();
    setTotpEnroll(null);
    setTotpConfirmCode('');
    setLoginPassword('');
  }, [resetLoginMfaState]);
  const goProfileRegister = useCallback(async () => {
    setActiveTab('profile');
    resetLoginMfaState();
    setTotpEnroll(null);
    setTotpConfirmCode('');
    setAuthMode('register');
    await supabase.auth.signOut();
  }, [resetLoginMfaState]);

  useEffect(() => {
    if (!currentUser) setAuthMode('idle');
  }, [currentUser]);

  const refreshTotpStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setHasSbSession(!!session);
    if (!session) {
      setTotpOn(false);
      return;
    }
    const { data } = await supabase.auth.mfa.listFactors();
    setTotpOn((data?.totp ?? []).some(f => f.status === 'verified'));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void refreshTotpStatus();
  }, [currentUser, activeTab, refreshTotpStatus]);

  const startTotpEnroll = useCallback(async () => {
    setIsProcessing(true);
    setTotpEnroll(null);
    setTotpConfirmCode('');

    const { data: factorList, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setIsProcessing(false);
      addNotification(listErr.message || t('cabinet_create_error'), 'error');
      return;
    }

    const all = factorList?.all ?? [];
    if (all.some(f => f.factor_type === 'totp' && f.status === 'verified')) {
      setIsProcessing(false);
      addNotification(t('cabinet_totp_already_active'), 'info');
      void refreshTotpStatus();
      return;
    }

    for (const f of all) {
      if (f.factor_type === 'totp' && f.status === 'unverified') {
        const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (uErr) {
          setIsProcessing(false);
          addNotification(uErr.message || t('cabinet_create_error'), 'error');
          return;
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Google Authenticator',
      issuer: 'GREEN LIGHT',
    });
    setIsProcessing(false);
    if (error || !data?.totp?.qr_code || !data.totp.secret) {
      addNotification(error?.message || t('cabinet_create_error'), 'error');
      return;
    }
    setTotpEnroll({
      factorId: data.id,
      qrSvg: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }, [addNotification, t, refreshTotpStatus]);

  const confirmTotpEnroll = useCallback(async () => {
    if (!totpEnroll) return;
    const clean = totpConfirmCode.replace(/\s/g, '');
    setIsProcessing(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpEnroll.factorId,
      code: clean,
    });
    setIsProcessing(false);
    if (error) {
      addNotification(totpVerifyUserFacingMessage(error, t), 'error');
      return;
    }
    setTotpEnroll(null);
    setTotpConfirmCode('');
    void refreshTotpStatus();
    await refreshSessionProfile();
    const finishingCabinetAuth = authMode === 'login' || authMode === 'register';
    if (finishingCabinetAuth) {
      if (authMode === 'login') {
        addNotification(t('cabinet_welcome_back'), 'success');
        setLoginEmail('');
        setLoginPassword('');
        resetLoginMfaState();
      } else {
        addNotification(t('cabinet_profile_created'), 'success');
        setReg(r => ({ ...r, password: '', password_confirm: '' }));
      }
      setAuthMode('idle');
    } else {
      addNotification(t('cabinet_totp_done'), 'success');
    }
  }, [totpEnroll, totpConfirmCode, addNotification, t, refreshTotpStatus, refreshSessionProfile, authMode, resetLoginMfaState]);

  const renewLoginMfaChallenge = useCallback(async () => {
    if (!loginMfa) return;
    setIsProcessing(true);
    const { challengeId, error } = await renewTotpChallenge(loginMfa.factorId);
    setIsProcessing(false);
    if (error || !challengeId) {
      addNotification(error?.message?.trim() ? error.message : t('cabinet_create_error'), 'error');
      return;
    }
    setLoginMfa({ factorId: loginMfa.factorId, challengeId });
    setLoginTotpCode('');
  }, [loginMfa, renewTotpChallenge, addNotification, t]);

  const handleLogin = useCallback(async () => {
    if (!loginEmail.trim()) { addNotification(t('cabinet_enter_email'), 'info'); return; }
    if (!loginPassword) { addNotification(t('cabinet_password_required'), 'info'); return; }
    setIsProcessing(true);
    resetLoginMfaState();
    setTotpEnroll(null);
    setTotpConfirmCode('');
    const result = await loginWithEmailPassword(loginEmail.trim(), loginPassword);
    if (result.status === 'found') {
      addNotification(t('cabinet_welcome_back'), 'success');
      setAuthMode('idle');
      setLoginEmail('');
      setLoginPassword('');
      resetLoginMfaState();
      void refreshTotpStatus();
    } else if (result.status === 'mfa_enroll_required') {
      addNotification(t('auth_mfa_enroll_login_hint'), 'info');
      void startTotpEnroll();
    } else if (result.status === 'mfa') {
      setLoginMfa({ factorId: result.factorId, challengeId: result.challengeId });
      addNotification(t('auth_totp_step_hint'), 'info');
    } else if (result.status === 'no_profile') {
      addNotification(t('auth_otp_no_profile'), 'error');
    } else {
      const msg =
        result.status === 'invalid' && result.errorTranslationKey
          ? t(result.errorTranslationKey)
          : result.status === 'invalid' && result.errorMessage?.trim()
            ? result.errorMessage.trim()
            : t('cabinet_invalid_credentials');
      addNotification(msg, 'error');
      setReg(r => ({ ...r, email: loginEmail.trim() }));
    }
    setIsProcessing(false);
  }, [loginEmail, loginPassword, loginWithEmailPassword, addNotification, t, refreshTotpStatus, resetLoginMfaState, startTotpEnroll]);

  const handleLoginTotp = useCallback(async () => {
    if (!loginMfa) return;
    setIsProcessing(true);
    const { error } = await completeTotpVerification(loginMfa.factorId, loginMfa.challengeId, loginTotpCode);
    setIsProcessing(false);
    if (error) {
      addNotification(totpVerifyUserFacingMessage(error, t), 'error');
      return;
    }
    addNotification(t('cabinet_welcome_back'), 'success');
    setAuthMode('idle');
    setLoginMfa(null);
    setLoginTotpCode('');
    setLoginEmail('');
    setLoginPassword('');
    resetLoginMfaState();
    void refreshTotpStatus();
  }, [loginMfa, loginTotpCode, completeTotpVerification, addNotification, t, refreshTotpStatus, resetLoginMfaState]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reg.first_name || !reg.email) { addNotification(t('cabinet_fields_required'), 'error'); return; }
    if (!reg.password || reg.password.length < 8) { addNotification(t('cabinet_password_too_short'), 'error'); return; }
    if (reg.password !== reg.password_confirm) { addNotification(t('cabinet_password_mismatch'), 'error'); return; }
    setIsProcessing(true);
    try {
      const { password, password_confirm: _pc, ...rest } = reg;
      await registerClient({
        ...rest,
        email: reg.email.trim(),
        password,
      });
      addNotification(t('cabinet_profile_created'), 'success');
      setAuthMode('idle');
      setReg(r => ({ ...r, password: '', password_confirm: '' }));
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('password_too_short') || msg.includes('P0001')) {
        addNotification(t('cabinet_password_too_short'), 'error');
      } else if (msg === '__AUTH_CLIENT_PASSWORD_MISMATCH__') {
        addNotification(t('auth_register_auth_password_mismatch'), 'error');
      } else if (msg === MFA_ENROLL_REQUIRED_MESSAGE) {
        addNotification(t('auth_mfa_enroll_register_hint'), 'info');
        void startTotpEnroll();
      } else {
        const pending = parseMfaVerifyPendingMessage(msg);
        if (pending) {
          setLoginMfa({ factorId: pending.factorId, challengeId: pending.challengeId });
          addNotification(t('auth_totp_step_hint'), 'info');
        } else if (msg.includes('duplicate') || msg.includes('23505') || msg.includes('unique')) {
          addNotification(t('cabinet_email_exists'), 'error');
        } else {
          addNotification(msg || t('cabinet_create_error'), 'error');
        }
      }
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
      delivered:          { label: t('status_delivered'),            cls: 'bg-slate-100 text-slate-600' },
    };
    return map[s] || { label: s || '—', cls: 'bg-slate-50 text-slate-400' };
  };

  if (isLoadingUser) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 size={32} className="animate-spin text-emerald-500" />
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
                    <button type="button" onClick={goProfileLogin}
                      className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                      <LogIn size={14} /> {t('cabinet_btn_login')}
                    </button>
                    <button type="button" onClick={goProfileRegister}
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

                  {hasSbSession && (
                    <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                      <div className="flex items-center gap-3">
                        <ShieldCheck size={22} className="text-emerald-600" />
                        <div>
                          <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{t('cabinet_totp_title')}</div>
                          <div className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${totpOn ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {totpOn ? t('cabinet_totp_status_on') : t('cabinet_totp_status_off')}
                          </div>
                        </div>
                      </div>
                      {!totpOn && !totpEnroll && (
                        <button type="button" onClick={startTotpEnroll} disabled={isProcessing}
                          className="w-full py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-50">
                          {t('cabinet_totp_setup')}
                        </button>
                      )}
                      {totpEnroll && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-600 font-bold">{t('cabinet_totp_scan')}</p>
                          <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-center">
                            <img
                              src={
                                totpEnroll.qrSvg.startsWith('data:')
                                  ? totpEnroll.qrSvg
                                  : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(totpEnroll.qrSvg)}`
                              }
                              alt="QR"
                              className="w-40 h-40"
                            />
                          </div>
                          <div className="rounded-xl bg-white border border-slate-200 p-3">
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('auth_totp_secret_label')}</div>
                            <code className="text-[11px] font-mono font-bold text-slate-800 break-all select-all block leading-snug">{totpEnroll.secret}</code>
                          </div>
                          <input
                            value={totpConfirmCode}
                            onChange={e => setTotpConfirmCode(e.target.value)}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder={t('cabinet_totp_confirm_placeholder')}
                            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold tracking-widest outline-none focus:border-emerald-400"
                          />
                          <p className="text-[9px] text-slate-500 font-bold leading-relaxed normal-case">{t('auth_totp_enroll_timing_hint')}</p>
                          <div className="flex gap-2">
                            <button type="button" onClick={confirmTotpEnroll} disabled={isProcessing}
                              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                              {t('cabinet_totp_confirm_btn')}
                            </button>
                            <button type="button" onClick={() => { setTotpEnroll(null); setTotpConfirmCode(''); }}
                              className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase text-slate-500">
                              {t('cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={goToCatalog}
                    className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl">
                    <Zap size={14} />{t('cabinet_btn_products')} <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="max-w-[480px] mx-auto space-y-8 py-4">
                  {authMode !== 'idle' && (
                    <button type="button" onClick={() => setAuthMode('idle')}
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
                      <p className="text-[11px] text-slate-600 font-bold max-w-md mx-auto leading-relaxed normal-case">
                        {t('cabinet_gate_intro')}
                      </p>
                    )}
                  </div>

                  {authMode === 'idle' ? (
                    <div className="space-y-3">
                      <button type="button" onClick={() => setAuthMode('login')}
                        className="w-full bg-slate-900 text-white py-5 px-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex flex-col items-center gap-2 shadow-xl">
                        <span className="flex items-center justify-center gap-3">
                          <LogIn size={18} /> {t('cabinet_btn_login')}
                        </span>
                        <span className="text-[9px] font-bold text-white/75 normal-case tracking-normal max-w-[300px] text-center leading-snug">
                          {t('cabinet_gate_login_sub')}
                        </span>
                      </button>
                      <button type="button" onClick={goProfileRegister}
                        className="w-full bg-emerald-500 text-white py-5 px-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-400 transition-all flex flex-col items-center gap-2 shadow-xl">
                        <span className="flex items-center justify-center gap-3">
                          <UserPlus size={18} /> {t('cabinet_btn_register')}
                        </span>
                        <span className="text-[9px] font-bold text-white/90 normal-case tracking-normal max-w-[300px] text-center leading-snug">
                          {t('cabinet_gate_register_sub')}
                        </span>
                      </button>
                      <button type="button" onClick={goToCatalog}
                        className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        <ShoppingBag size={14} /> {t('cabinet_btn_products')}
                      </button>
                    </div>
                  ) : authMode === 'login' ? (
                    <div className="space-y-4">
                      {inLoginStep2 ? (
                        <>
                          <p className="text-[10px] font-bold text-slate-600 text-center leading-relaxed normal-case">
                            {t('auth_mfa_step_intro')}
                          </p>
                          {totpEnroll && !loginMfa && (
                            <div className="space-y-3 pt-2">
                              <p className="text-[10px] text-slate-600 font-bold">{t('cabinet_totp_scan')}</p>
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-center">
                                <img
                                  src={
                                    totpEnroll.qrSvg.startsWith('data:')
                                      ? totpEnroll.qrSvg
                                      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(totpEnroll.qrSvg)}`
                                  }
                                  alt="QR"
                                  className="w-40 h-40"
                                />
                              </div>
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('auth_totp_secret_label')}</div>
                                <code className="text-[11px] font-mono font-bold text-slate-800 break-all select-all block leading-snug">{totpEnroll.secret}</code>
                              </div>
                              <input
                                value={totpConfirmCode}
                                onChange={e => setTotpConfirmCode(e.target.value)}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder={t('cabinet_totp_confirm_placeholder')}
                                className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold tracking-widest outline-none focus:border-emerald-400"
                              />
                              <p className="text-[9px] text-slate-500 font-bold leading-relaxed normal-case">{t('auth_totp_enroll_timing_hint')}</p>
                              <button type="button" onClick={confirmTotpEnroll} disabled={isProcessing}
                                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-2 disabled:opacity-50">
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : t('cabinet_totp_confirm_btn')}
                              </button>
                            </div>
                          )}
                          {loginMfa && (
                            <div className="space-y-3 pt-2">
                              <p className="text-[10px] font-bold text-slate-600">{t('auth_totp_step_hint')}</p>
                              <input
                                value={loginTotpCode}
                                onChange={e => setLoginTotpCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLoginTotp()}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder={t('auth_totp_code_label')}
                                className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-4 text-sm font-bold tracking-widest outline-none focus:border-emerald-500 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => { void renewLoginMfaChallenge(); }}
                                disabled={isProcessing}
                                className="w-full py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50"
                              >
                                {t('auth_totp_request_new_challenge')}
                              </button>
                              <button type="button" onClick={handleLoginTotp} disabled={isProcessing}
                                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> {t('auth_totp_verify')}</>}
                              </button>
                            </div>
                          )}
                          <button type="button" onClick={cancelPendingMfa} disabled={isProcessing}
                            className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 py-2">
                            {t('auth_totp_back')}
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="relative group">
                            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                            <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleLogin()}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                              placeholder="din@email.dk" type="email" autoComplete="username" />
                          </div>
                          <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={16} />
                            <input value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleLogin()}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                              placeholder={t('cabinet_password')} type="password" autoComplete="current-password" />
                          </div>
                          <p className="text-[9px] text-slate-400 text-center font-bold tracking-wide leading-relaxed">
                            {t('cabinet_login_password_hint')}
                          </p>
                          <p className="text-[9px] text-slate-400 text-center font-bold tracking-wide leading-relaxed">
                            {t('auth_mfa_login_footer')}
                          </p>
                          <button type="button" onClick={handleLogin} disabled={isProcessing}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><LogIn size={18} /> {t('cabinet_btn_login')}</>}
                          </button>
                        </>
                      )}

                      <button type="button" onClick={goProfileRegister}
                        className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 transition-all py-2">
                        {t('cabinet_new_customer')}
                      </button>
                    </div>
                  ) : (
                    (totpEnroll || loginMfa) ? (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-600 text-center leading-relaxed normal-case">
                          {t('auth_mfa_step_intro')}
                        </p>
                        {totpEnroll && !loginMfa && (
                          <div className="space-y-3">
                            <p className="text-[10px] text-slate-600 font-bold">{t('cabinet_totp_scan')}</p>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-center">
                              <img
                                src={
                                  totpEnroll.qrSvg.startsWith('data:')
                                    ? totpEnroll.qrSvg
                                    : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(totpEnroll.qrSvg)}`
                                }
                                alt="QR"
                                className="w-40 h-40"
                              />
                            </div>
                            <div className="rounded-2xl bg-white border border-slate-200 p-3">
                              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('auth_totp_secret_label')}</div>
                              <code className="text-[11px] font-mono font-bold text-slate-800 break-all select-all block leading-snug">{totpEnroll.secret}</code>
                            </div>
                            <input
                              value={totpConfirmCode}
                              onChange={e => setTotpConfirmCode(e.target.value)}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder={t('cabinet_totp_confirm_placeholder')}
                              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold tracking-widest outline-none focus:border-emerald-400"
                            />
                            <p className="text-[9px] text-slate-500 font-bold leading-relaxed normal-case">{t('auth_totp_enroll_timing_hint')}</p>
                            <button type="button" onClick={confirmTotpEnroll} disabled={isProcessing}
                              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 flex items-center justify-center gap-2 disabled:opacity-50">
                              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : t('cabinet_totp_confirm_btn')}
                            </button>
                          </div>
                        )}
                        {loginMfa && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-600">{t('auth_totp_step_hint')}</p>
                            <input
                              value={loginTotpCode}
                              onChange={e => setLoginTotpCode(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleLoginTotp()}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder={t('auth_totp_code_label')}
                              className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-4 text-sm font-bold tracking-widest outline-none focus:border-emerald-500 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => { void renewLoginMfaChallenge(); }}
                              disabled={isProcessing}
                              className="w-full py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50"
                            >
                              {t('auth_totp_request_new_challenge')}
                            </button>
                            <button type="button" onClick={handleLoginTotp} disabled={isProcessing}
                              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> {t('auth_totp_verify')}</>}
                            </button>
                          </div>
                        )}
                        <button type="button" onClick={cancelPendingMfa} disabled={isProcessing}
                          className="w-full text-slate-400 text-[9px] font-black uppercase tracking-widest hover:text-slate-900 py-2">
                          {t('auth_totp_back')}
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
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                        autoComplete="username" />

                      <input required type="password" value={reg.password}
                        onChange={e => setReg(prev => ({ ...prev, password: e.target.value }))}
                        placeholder={t('cabinet_password')}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                        autoComplete="new-password" minLength={8} />
                      <input required type="password" value={reg.password_confirm}
                        onChange={e => setReg(prev => ({ ...prev, password_confirm: e.target.value }))}
                        placeholder={t('cabinet_password_confirm')}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                        autoComplete="new-password" minLength={8} />
                      <p className="text-[9px] text-slate-400 font-bold tracking-wide">{t('cabinet_password_hint')}</p>

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
                  )
                )
              }
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
                  <button type="button" onClick={goProfileLogin}
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
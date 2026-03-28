import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, ShieldCheck, Mail, Smartphone, KeyRound } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import type { SiteCountry } from '../../routing/siteCountry';
import { getRememberedSiteCountry } from '../../routing/siteCountry';
import { defaultCallingCodeForSiteCountry, normalizePhoneE164 } from '../../utils/phoneE164';

type LoginMethod = 'email_otp' | 'phone_otp' | 'password';

interface CheckoutSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteCountry: SiteCountry | null;
}

export const CheckoutSignInModal: React.FC<CheckoutSignInModalProps> = ({ isOpen, onClose, siteCountry }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    loginWithEmailPassword,
    completeTotpVerification,
    requestSignInOtp,
    verifySignInOtp,
  } = useUser();

  const resolvedCountry = siteCountry ?? getRememberedSiteCountry() ?? 'dk';

  const [method, setMethod] = useState<LoginMethod>('email_otp');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);

  const resetOtp = useCallback(() => {
    setOtpSent(false);
    setOtpCode('');
    setNormalizedPhone(null);
    setErr(null);
    setMfa(null);
    setTotpCode('');
  }, []);

  const resetAll = useCallback(() => {
    resetOtp();
    setEmail('');
    setPhone('');
    setPassword('');
    setErr(null);
  }, [resetOtp]);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const goCheckout = () => {
    const c = siteCountry ?? getRememberedSiteCountry() ?? 'dk';
    navigate(`/${c}/checkout`);
    handleClose();
  };

  const switchMethod = (m: LoginMethod) => {
    setMethod(m);
    resetOtp();
    setPassword('');
    setErr(null);
  };

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(null);
    if (method === 'email_otp') {
      const em = email.trim().toLowerCase();
      if (!em.includes('@')) {
        setErr(t('auth_magic_link_invalid_email'));
        return;
      }
      setBusy(true);
      const { error } = await requestSignInOtp('email', em, resolvedCountry);
      setBusy(false);
      if (error) {
        setErr(error.message === 'invalid_email' ? t('auth_magic_link_invalid_email') : t('auth_otp_request_failed'));
        return;
      }
      setOtpSent(true);
      return;
    }

    const cc = defaultCallingCodeForSiteCountry(resolvedCountry);
    const ph = normalizePhoneE164(phone, cc);
    if (ph.replace(/\D/g, '').length < 8) {
      setErr(t('err_phone_invalid'));
      return;
    }
    setBusy(true);
    const { error, normalizedPhone: norm } = await requestSignInOtp('phone', phone, resolvedCountry);
    setBusy(false);
    if (error) {
      setErr(error.message === 'invalid_phone' ? t('err_phone_invalid') : t('auth_otp_request_failed'));
      return;
    }
    setNormalizedPhone(norm ?? ph);
    setOtpSent(true);
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.replace(/\s/g, '');
    if (!code) {
      setErr(t('auth_magic_link_code_invalid'));
      return;
    }
    setBusy(true);
    setErr(null);
    const addr =
      method === 'email_otp' ? email.trim().toLowerCase() : (normalizedPhone ?? '');
    if (method === 'phone_otp' && !addr) {
      setBusy(false);
      setErr(t('err_phone_invalid'));
      return;
    }
    const result = await verifySignInOtp(method === 'email_otp' ? 'email' : 'phone', addr, code);
    setBusy(false);
    if (result.status === 'invalid') {
      setErr(result.errorMessage || t('auth_otp_otp_invalid'));
      return;
    }
    if (result.status === 'no_profile') {
      setErr(t('auth_otp_no_profile'));
      return;
    }
    if (result.status === 'mfa') {
      setMfa({ factorId: result.factorId, challengeId: result.challengeId });
      return;
    }
    goCheckout();
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !em.includes('@')) {
      setErr(t('auth_magic_link_invalid_email'));
      return;
    }
    if (!password) {
      setErr(t('cabinet_password_required'));
      return;
    }
    setBusy(true);
    setErr(null);
    const result = await loginWithEmailPassword(em, password);
    setBusy(false);
    if (result.status === 'invalid') {
      setErr(result.errorMessage || t('cabinet_invalid_credentials'));
      return;
    }
    if (result.status === 'no_profile') {
      setErr(t('auth_otp_no_profile'));
      return;
    }
    if (result.status === 'mfa') {
      setMfa({ factorId: result.factorId, challengeId: result.challengeId });
      return;
    }
    goCheckout();
  };

  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa || !totpCode.trim()) {
      setErr(t('auth_magic_link_code_invalid'));
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await completeTotpVerification(mfa.factorId, mfa.challengeId, totpCode);
    setBusy(false);
    if (error) {
      setErr(error.message || t('auth_magic_link_code_invalid'));
      return;
    }
    goCheckout();
  };

  if (!isOpen) return null;

  const tabCls = (m: LoginMethod) =>
    `flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
      method === m ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`;

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden text-left">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">{t('auth_checkout_title')}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 leading-relaxed">{t('auth_checkout_subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!mfa && (
            <div className="flex gap-2">
              <button type="button" className={tabCls('email_otp')} onClick={() => switchMethod('email_otp')}>
                <Mail className="w-3.5 h-3.5" />
                {t('auth_otp_tab_email')}
              </button>
              <button type="button" className={tabCls('phone_otp')} onClick={() => switchMethod('phone_otp')}>
                <Smartphone className="w-3.5 h-3.5" />
                {t('auth_otp_tab_phone')}
              </button>
              <button type="button" className={tabCls('password')} onClick={() => switchMethod('password')}>
                <KeyRound className="w-3.5 h-3.5" />
                {t('auth_otp_tab_password')}
              </button>
            </div>
          )}

          {mfa ? (
            <form onSubmit={submitTotp} className="space-y-4">
              <p className="text-sm font-bold text-slate-600 leading-relaxed">{t('auth_totp_step_hint')}</p>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_totp_code_label')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value); setErr(null); }}
                  placeholder="000000"
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold tracking-widest outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t('auth_totp_verify')}
              </button>
              <button
                type="button"
                onClick={() => { setMfa(null); setTotpCode(''); setErr(null); }}
                className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
              >
                {t('auth_totp_back')}
              </button>
            </form>
          ) : method === 'password' ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_magic_link_email')}</label>
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                  placeholder="you@example.com"
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_checkout_password')}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErr(null); }}
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{t('auth_checkout_totp_note')}</p>
              {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t('auth_checkout_sign_in')}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? submitOtp : sendOtp} className="space-y-4">
              {method === 'email_otp' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_magic_link_email')}</label>
                  <input
                    type="email"
                    autoComplete="username"
                    value={email}
                    disabled={otpSent}
                    onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                    placeholder="you@example.com"
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-60"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('checkout_placeholder_phone')}</label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    disabled={otpSent}
                    onChange={(e) => { setPhone(e.target.value); setErr(null); }}
                    placeholder={t('auth_otp_phone_placeholder')}
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all disabled:opacity-60"
                  />
                  <p className="text-[9px] font-bold text-slate-400 mt-2 leading-relaxed">{t('auth_otp_phone_hint')}</p>
                </div>
              )}

              {otpSent && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_otp_code_label')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value); setErr(null); }}
                    placeholder={t('auth_otp_code_placeholder')}
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold tracking-widest outline-none focus:border-emerald-400 transition-all"
                  />
                  <p className="text-[9px] font-bold text-slate-500 mt-2">
                    {method === 'email_otp' ? t('auth_otp_sent_email') : t('auth_otp_sent_phone')}
                  </p>
                </div>
              )}

              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{t('auth_checkout_otp_totp_note')}</p>
              {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {otpSent ? t('auth_otp_verify_code') : t('auth_otp_send_code')}
              </button>
              {otpSent && (
                <button
                  type="button"
                  onClick={() => { resetOtp(); }}
                  className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
                >
                  {t('auth_otp_change_recipient')}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

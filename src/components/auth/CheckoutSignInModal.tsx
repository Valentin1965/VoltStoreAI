import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser, type EmailPasswordSignInResult } from '../../contexts/UserContext';
import { supabase } from '../../services/supabase';
import type { SiteCountry } from '../../routing/siteCountry';
import { getRememberedSiteCountry } from '../../routing/siteCountry';
import { totpVerifyUserFacingMessage } from '../../utils/totpVerifyErrors';

interface CheckoutSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteCountry: SiteCountry | null;
  prefilledEmail?: string | null;
  /** From Identification: email OTP first, then Google Authenticator. */
  startWithEmailOtp?: boolean;
}

/**
 * Checkout sign-in: email OTP (Identification path) or password, then mandatory TOTP.
 */
export const CheckoutSignInModal: React.FC<CheckoutSignInModalProps> = ({
  isOpen,
  onClose,
  siteCountry,
  prefilledEmail = null,
  startWithEmailOtp = false,
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    loginWithEmailPassword,
    requestSignInOtp,
    verifySignInOtp,
    completeTotpVerification,
    renewTotpChallenge,
    refreshSessionProfile,
  } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [totpEnroll, setTotpEnroll] = useState<{
    factorId: string;
    qrSvg: string;
    secret: string;
  } | null>(null);
  const [enrollConfirmCode, setEnrollConfirmCode] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [usePasswordInstead, setUsePasswordInstead] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmailOtpSent(false);
    setEmailOtpCode('');
    setUsePasswordInstead(false);
    setErr(null);
  }, [isOpen, startWithEmailOtp]);

  useEffect(() => {
    if (!isOpen) return;
    const em = prefilledEmail?.trim().toLowerCase();
    if (em && em.includes('@')) {
      setEmail(em);
    }
  }, [isOpen, prefilledEmail]);

  const resetAll = useCallback(() => {
    setEmail('');
    setPassword('');
    setTotpCode('');
    setErr(null);
    setMfa(null);
    setTotpEnroll(null);
    setEnrollConfirmCode('');
    setEmailOtpSent(false);
    setEmailOtpCode('');
    setUsePasswordInstead(false);
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const goCheckout = () => {
    const c = siteCountry ?? getRememberedSiteCountry() ?? 'dk';
    navigate(`/${c}/checkout`);
    handleClose();
  };

  const startTotpEnroll = useCallback(async () => {
    setErr(null);
    setTotpEnroll(null);
    setEnrollConfirmCode('');
    setBusy(true);

    const { data: factorList, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setBusy(false);
      setErr(listErr.message || t('cabinet_create_error'));
      return;
    }

    const all = factorList?.all ?? [];
    for (const f of all) {
      if (f.factor_type === 'totp' && f.status === 'unverified') {
        const { error: uErr } = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (uErr) {
          setBusy(false);
          setErr(uErr.message || t('cabinet_create_error'));
          return;
        }
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Google Authenticator',
      issuer: 'GREEN LIGHT',
    });
    setBusy(false);
    if (error || !data?.totp?.qr_code || !data.totp.secret) {
      setErr(error?.message || t('cabinet_create_error'));
      return;
    }
    setTotpEnroll({ factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret });
  }, [t]);

  const handleAuthLoginResult = (result: EmailPasswordSignInResult) => {
    if (result.status === 'invalid') {
      setErr(
        result.errorTranslationKey
          ? t(result.errorTranslationKey)
          : result.errorMessage || t('cabinet_invalid_credentials'),
      );
      return;
    }
    if (result.status === 'no_profile') {
      setErr(t('auth_otp_no_profile'));
      return;
    }
    if (result.status === 'mfa_enroll_required') {
      setErr(null);
      void startTotpEnroll();
      return;
    }
    if (result.status === 'mfa') {
      setMfa({ factorId: result.factorId, challengeId: result.challengeId });
      return;
    }
    goCheckout();
  };

  const sendEmailOtp = async () => {
    const em = email.trim().toLowerCase();
    if (!em || !em.includes('@')) {
      setErr(t('auth_magic_link_invalid_email'));
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await requestSignInOtp('email', em, siteCountry);
    setBusy(false);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid_email')) {
        setErr(t('auth_magic_link_invalid_email'));
        return;
      }
      setErr(error.message || t('auth_magic_link_error'));
      return;
    }
    setEmailOtpSent(true);
    setEmailOtpCode('');
  };

  const submitEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em || !em.includes('@')) {
      setErr(t('auth_magic_link_invalid_email'));
      return;
    }
    const clean = emailOtpCode.replace(/\s/g, '');
    if (!clean) {
      setErr(t('auth_magic_link_code_invalid'));
      return;
    }
    setBusy(true);
    setErr(null);
    const result = await verifySignInOtp('email', em, clean);
    setBusy(false);
    handleAuthLoginResult(result);
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
    handleAuthLoginResult(result);
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
      setErr(totpVerifyUserFacingMessage(error, t));
      return;
    }
    goCheckout();
  };

  const renewCheckoutMfaChallenge = async () => {
    if (!mfa) return;
    setBusy(true);
    setErr(null);
    const { challengeId, error } = await renewTotpChallenge(mfa.factorId);
    setBusy(false);
    if (error || !challengeId) {
      setErr(error?.message?.trim() ? error.message : t('cabinet_create_error'));
      return;
    }
    setMfa({ factorId: mfa.factorId, challengeId });
    setTotpCode('');
  };

  const submitEnrollConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpEnroll) return;
    const clean = enrollConfirmCode.replace(/\s/g, '');
    if (!clean) {
      setErr(t('auth_magic_link_code_invalid'));
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpEnroll.factorId,
      code: clean,
    });
    setBusy(false);
    if (error) {
      setErr(totpVerifyUserFacingMessage(error, t));
      return;
    }
    setTotpEnroll(null);
    setEnrollConfirmCode('');
    await refreshSessionProfile();
    goCheckout();
  };

  const resetAuthSteps = async () => {
    setMfa(null);
    setTotpEnroll(null);
    setTotpCode('');
    setEnrollConfirmCode('');
    setEmailOtpSent(false);
    setEmailOtpCode('');
    setErr(null);
    await supabase.auth.signOut();
  };

  const showEmailOtpFirst = startWithEmailOtp && !usePasswordInstead;

  if (!isOpen) return null;

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
          {totpEnroll ? (
            <form onSubmit={submitEnrollConfirm} className="space-y-4">
              <p className="text-sm font-bold text-slate-600 leading-relaxed">{t('auth_mfa_enroll_checkout_intro')}</p>
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
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{t('auth_totp_secret_label')}</div>
                <code className="text-xs font-mono font-bold text-slate-800 break-all select-all block leading-snug">{totpEnroll.secret}</code>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_totp_code_label')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enrollConfirmCode}
                  onChange={(e) => { setEnrollConfirmCode(e.target.value); setErr(null); }}
                  placeholder={t('cabinet_totp_confirm_placeholder')}
                  className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold tracking-widest outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{t('auth_totp_enroll_timing_hint')}</p>
              {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t('cabinet_totp_confirm_btn')}
              </button>
              <button
                type="button"
                onClick={() => { void resetAuthSteps(); }}
                className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
              >
                {t('auth_totp_back')}
              </button>
            </form>
          ) : mfa ? (
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
              <button
                type="button"
                onClick={() => { void renewCheckoutMfaChallenge(); }}
                disabled={busy}
                className="w-full py-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-xs font-black uppercase tracking-widest text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-all disabled:opacity-50"
              >
                {t('auth_totp_request_new_challenge')}
              </button>
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
                onClick={() => { void resetAuthSteps(); }}
                className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
              >
                {t('auth_totp_back')}
              </button>
            </form>
          ) : showEmailOtpFirst ? (
            !emailOtpSent ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-600 leading-relaxed">{t('checkout_identify_email_otp_intro')}</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_magic_link_email')}</label>
                  <input
                    type="email"
                    autoComplete="username"
                    readOnly={Boolean(prefilledEmail?.includes('@'))}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                    placeholder="you@example.com"
                    className={`w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all ${
                      prefilledEmail?.includes('@') ? 'bg-slate-50 text-slate-600' : ''
                    }`}
                  />
                </div>
                {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendEmailOtp()}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {t('auth_checkout_send_email_code')}
                </button>
                <button
                  type="button"
                  onClick={() => { setUsePasswordInstead(true); setErr(null); }}
                  className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
                >
                  {t('auth_checkout_use_password_instead')}
                </button>
              </div>
            ) : (
              <form onSubmit={submitEmailOtp} className="space-y-4">
                <p className="text-sm font-bold text-slate-600 leading-relaxed">{t('auth_magic_link_sent')}</p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_magic_link_code_label')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={emailOtpCode}
                    onChange={(e) => { setEmailOtpCode(e.target.value); setErr(null); }}
                    placeholder={t('auth_checkout_email_code_placeholder')}
                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold tracking-widest outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{t('auth_checkout_totp_after_email_hint')}</p>
                {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {t('auth_magic_link_verify')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendEmailOtp()}
                  className="w-full py-3 rounded-2xl border-2 border-slate-100 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300 transition-all disabled:opacity-50"
                >
                  {t('auth_checkout_resend_email_code')}
                </button>
                <button
                  type="button"
                  onClick={() => { setEmailOtpSent(false); setEmailOtpCode(''); setErr(null); }}
                  className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700"
                >
                  {t('auth_totp_back')}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth_magic_link_email')}</label>
                <input
                  type="email"
                  autoComplete="username"
                  readOnly={Boolean(prefilledEmail?.includes('@'))}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                  placeholder="you@example.com"
                  className={`w-full border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-emerald-400 transition-all ${
                    prefilledEmail?.includes('@') ? 'bg-slate-50 text-slate-600' : ''
                  }`}
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
              {prefilledEmail?.includes('@') && (
                <p className="text-[10px] font-bold text-emerald-700/90 leading-relaxed normal-case">
                  {t('checkout_security_step_body')}
                </p>
              )}
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
          )}
        </div>
      </div>
    </div>
  );
};

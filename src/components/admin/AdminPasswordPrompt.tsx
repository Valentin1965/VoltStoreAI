import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, ShieldAlert, Terminal, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { safeStorage } from '../../utils/storage';

// ── Security constants ────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 15 * 60 * 1000;   // 15 хвилин
const LOCKOUT_KEY  = 'admin_lockout_v1';
const ATTEMPTS_KEY = 'admin_attempts_v1';
const AUTH_SESSION = 'voltstore_admin_auth_v5';

interface AdminPasswordPromptProps {
  onSuccess: () => void;
}

export const AdminPasswordPrompt: React.FC<AdminPasswordPromptProps> = ({ onSuccess }) => {
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts]         = useState(0);
  const [lockedUntil, setLockedUntil]   = useState<number | null>(null);
  const [countdown, setCountdown]       = useState(0);
  const { addNotification }             = useNotification();
  const inputRef                        = useRef<HTMLInputElement>(null);
  const timerRef                        = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Restore lockout state on mount ──────────────────────────────────────────
  useEffect(() => {
    const storedLockout  = Number(safeStorage.getItem(LOCKOUT_KEY) || 0);
    const storedAttempts = Number(safeStorage.getItem(ATTEMPTS_KEY) || 0);

    if (storedLockout > Date.now()) {
      setLockedUntil(storedLockout);
      setAttempts(storedAttempts);
    } else {
      if (storedLockout) {
        safeStorage.removeItem(LOCKOUT_KEY);
        safeStorage.removeItem(ATTEMPTS_KEY);
      }
      setAttempts(storedAttempts < MAX_ATTEMPTS ? storedAttempts : 0);
    }

    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // ── Live countdown timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) { setCountdown(0); return; }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(rem);
      if (rem === 0) {
        setLockedUntil(null);
        setAttempts(0);
        safeStorage.removeItem(LOCKOUT_KEY);
        safeStorage.removeItem(ATTEMPTS_KEY);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockedUntil]);

  // ── Verify ───────────────────────────────────────────────────────────────────
  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (lockedUntil && Date.now() < lockedUntil) {
      addNotification(`Locked. Try again in ${Math.ceil((lockedUntil - Date.now()) / 60000)} min.`, 'error');
      return;
    }

    const clean      = password.trim();
    const envPass    = (import.meta.env.VITE_ADMIN_PASSWORD ?? '').trim();
    if (!clean) return;

    if (!envPass) {
      addNotification('Admin access not configured. Set VITE_ADMIN_PASSWORD in Vercel.', 'error');
      return;
    }

    if (clean === envPass) {
      safeStorage.removeItem(LOCKOUT_KEY);
      safeStorage.removeItem(ATTEMPTS_KEY);
      setAttempts(0);
      const expiry = Date.now() + 8 * 60 * 60 * 1000;
      safeStorage.setItem(AUTH_SESSION, String(expiry));
      addNotification('System Unlocked.', 'success');
      onSuccess();
    } else {
      const next = attempts + 1;
      setAttempts(next);
      safeStorage.setItem(ATTEMPTS_KEY, String(next));
      setPassword('');
      if (next >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockedUntil(until);
        safeStorage.setItem(LOCKOUT_KEY, String(until));
        addNotification('Too many attempts. Locked for 15 minutes.', 'error');
      } else {
        const left = MAX_ATTEMPTS - next;
        addNotification(
          left === 1 ? 'Wrong token. Last attempt before lockout!' : `Wrong token. ${left} attempts left.`,
          'error'
        );
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    }
  };

  const isLocked = !!(lockedUntil && Date.now() < lockedUntil);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-md bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center space-y-8 relative overflow-hidden border border-slate-100">

        {/* Ambient glow */}
        <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] transition-colors duration-500 ${isLocked ? 'bg-rose-500/15' : 'bg-emerald-500/10'}`} />

        <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'about' }))}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="relative">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl mx-auto ring-8 ring-slate-50 transition-colors duration-500 ${isLocked ? 'bg-rose-600 text-rose-200' : 'bg-slate-900 text-emerald-400'}`}>
            {isLocked ? <AlertTriangle size={32} /> : <Terminal size={32} />}
          </div>
          <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-lg border-2 border-white shadow-lg transition-colors ${isLocked ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
            <Lock size={14} />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1 relative">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
            {isLocked ? 'Access Locked' : 'Terminal Lock'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            {isLocked ? 'Too many failed attempts' : 'Administrator Key Required'}
          </p>
        </div>

        {/* ── LOCKED ── */}
        {isLocked ? (
          <div className="space-y-5 relative">
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 space-y-3">
              <div className="text-5xl font-black text-rose-600 tabular-nums">{fmt(countdown)}</div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Remaining lockout</p>
              <div className="flex justify-center gap-2 pt-1">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                ))}
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
              Contact system administrator if you need immediate access.
            </p>
          </div>
        ) : (
          /* ── NORMAL ── */
          <form onSubmit={handleVerify} className="space-y-6 relative">
            <div className="space-y-3 text-left">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-5 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldAlert size={12} className="text-emerald-500" /> Security Token
                </span>
                {/* Attempt dots */}
                {attempts > 0 && (
                  <span className="flex items-center gap-1.5">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < attempts ? 'bg-rose-500' : 'bg-slate-200'}`} />
                    ))}
                  </span>
                )}
              </label>

              <div className="relative">
                <input ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-black outline-none focus:border-emerald-500 focus:bg-white transition-all text-center tracking-[0.5em] placeholder:tracking-normal shadow-inner text-slate-900"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 p-2 rounded-lg transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Warning near lockout */}
              {attempts >= 3 && (
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5 px-1">
                  <AlertTriangle size={10} /> {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} before 15-min lockout
                </p>
              )}
            </div>

            <button type="submit" disabled={!password}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
              Unlock Interface <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-50">
          <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Authorized Personnel Only.<br />
            {MAX_ATTEMPTS} failed attempts → 15-minute lockout.
          </p>
        </div>
      </div>
    </div>
  );
};

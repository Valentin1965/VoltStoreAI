import React, { useState, useEffect, useRef } from 'react';
import { Lock, ShieldCheck, ArrowRight, ShieldAlert, Terminal, X, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { safeStorage } from '../../utils/storage';

interface AdminPasswordPromptProps {
  onSuccess: () => void;
}

export const AdminPasswordPrompt: React.FC<AdminPasswordPromptProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { addNotification } = useNotification();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const cleanPassword = password.trim();
    
    if (!cleanPassword) return;

    // PASSWORD: 19952010
    if (cleanPassword === '19952010') {
      safeStorage.setItem('voltstore_admin_auth_v5', 'true');
      addNotification("System Unlocked. Redirecting...", "success");
      onSuccess();
    } else {
      addNotification("Access Denied. Incorrect token.", "error");
      setPassword('');
      inputRef.current?.focus();
    }
  };

  const handleCancel = () => {
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'about' }));
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-2xl animate-fade-in">
      <div className="w-full max-w-md bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center space-y-8 relative overflow-hidden border border-slate-100">
        
        {/* Ambient background light */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
        
        <button 
          onClick={handleCancel}
          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
        >
          <X size={20} />
        </button>

        <div className="relative">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-2xl mx-auto ring-8 ring-slate-50">
            <Terminal size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-lg border-2 border-white shadow-lg">
            <Lock size={14} />
          </div>
        </div>

        <div className="space-y-1 relative">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Terminal Lock</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Administrator Key Required</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6 relative">
          <div className="space-y-3 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-5 flex items-center gap-2">
              <ShieldAlert size={12} className="text-emerald-500" /> Security Token
            </label>
            <div className="relative group">
              <input 
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-lg font-black outline-none focus:border-emerald-500 focus:bg-white transition-all text-center tracking-[0.5em] placeholder:tracking-normal shadow-inner text-slate-900"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 p-2 rounded-lg transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!password}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
          >
            Unlock Interface <ArrowRight size={18} />
          </button>
        </form>

        <div className="pt-6 border-t border-slate-50">
          <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.3em] leading-relaxed">
            Authorized Personnel Only.<br />Access logged to encrypted registry.
          </p>
        </div>
      </div>
    </div>
  );
};
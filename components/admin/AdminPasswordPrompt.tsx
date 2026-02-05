
import React, { useState } from 'react';
import { Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

interface AdminPasswordPromptProps {
  onSuccess: () => void;
}

export const AdminPasswordPrompt: React.FC<AdminPasswordPromptProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const { addNotification } = useNotification();

  const handleVerify = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) return;

    setIsVerifying(true);
    // Simulate verification delay
    setTimeout(() => {
      // Updated password as per user request
      if (password === '19952010') {
        localStorage.setItem('voltstore_admin_auth', 'true');
        onSuccess();
        addNotification("Terminal unlocked. Access granted.", "success");
      } else {
        addNotification("Unauthorized access attempt. Invalid credentials.", "error");
      }
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-white p-10 rounded-[3rem] border border-slate-100 shadow-3xl text-center space-y-8">
        <div className="relative inline-block">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-2xl mx-auto">
            <Lock size={32} />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-lg border-4 border-white">
            <ShieldCheck size={14} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Admin Terminal</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Secure Entry Point v4.0</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">System Key</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-emerald-500 focus:bg-white transition-all text-center tracking-[0.3em]"
              autoFocus
            />
          </div>

          <button 
            type="submit"
            disabled={isVerifying || !password}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <>Unlock Terminal <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">
          Authorized personnel only. Sessions are logged.
        </p>
      </div>
    </div>
  );
};

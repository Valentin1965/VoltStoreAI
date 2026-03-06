import React from 'react';
import { Check } from 'lucide-react';

export const Marker: React.FC<{ 
  label: string; active: boolean; onClick: () => void; color?: string; icon?: React.ReactNode;
}> = ({ label, active, onClick, color = 'emerald', icon }) => {
  const colorStyles: Record<string, string> = {
    emerald: active ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-slate-900',
    blue: active ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-slate-900',
    amber: active ? 'bg-amber-600 border-amber-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-slate-900',
    indigo: active ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-slate-900',
    slate: active ? 'bg-slate-600 border-slate-600 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900',
  };

  return (
    <button 
      type="button"
      onClick={onClick}
      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center gap-2 whitespace-nowrap ${colorStyles[color] || colorStyles.emerald}`}
    >
      {active ? <Check size={12} strokeWidth={4} /> : icon} {label}
    </button>
  );
};

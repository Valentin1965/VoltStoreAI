import React, { useState } from 'react';
import { X, TrendingUp, Save } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';

interface AdminRatesModalProps {
  onClose: () => void;
}

export const AdminRatesModal: React.FC<AdminRatesModalProps> = ({ onClose }) => {
  const { rates, updateRates, t } = useLanguage();
  const { addNotification } = useNotification();
  const [localRates, setLocalRates] = useState(rates);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col max-h-[90vh] animate-modal-in overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900"><TrendingUp size={18} /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{t('admin_rates_title')}</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
            {t('admin_rates_hint')}
          </p>
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(localRates)
              .filter(([key]) => key !== 'timestamp')
              .map(([currency, rate]) => (
                <div key={currency} className="space-y-2">
                  <label className="text-[9px] font-black text-slate-900 uppercase ml-2">{currency} {t('admin_rates_base_label')}</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">{currency}</div>
                    <input
                      type="number" step="0.0001"
                      value={rate as number}
                      onChange={e => setLocalRates({ ...localRates, [currency]: Number(e.target.value) })}
                      className="input-premium pl-16"
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
          <button onClick={onClose} className="px-8 py-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={async () => {
              try {
                await updateRates(localRates);
                addNotification(t('admin_rates_updated'), 'success');
                onClose();
              } catch (err: any) {
                addNotification(err.message, 'error');
              }
            }}
            className="btn-action !bg-amber-500 shadow-xl px-12 !rounded-2xl"
          >
            <Save size={18} className="mr-2" /> {t('admin_rates_save')}
          </button>
        </div>
      </div>
    </div>
  );
};

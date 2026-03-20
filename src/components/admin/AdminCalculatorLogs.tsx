import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Download, Loader2, RefreshCcw } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  adminFetchCalculatorRequests,
  calculatorRequestsToCsv,
  type CalculatorRequestRow,
} from '../../services/calculatorLogService';
import { saveAs } from 'file-saver';

const PREVIEW_LEN = 120;

export const AdminCalculatorLogs: React.FC = () => {
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();
  const adminKey = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;

  const [rows, setRows] = useState<CalculatorRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const localeStr =
    language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';

  const load = useCallback(async () => {
    if (!adminKey) {
      addNotification(t('admin_calc_no_admin_key'), 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await adminFetchCalculatorRequests(adminKey, 500);
      if (error) {
        addNotification(`${t('admin_calc_load_error')}: ${error}`, 'error');
        setRows([]);
        return;
      }
      setRows(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminKey, addNotification, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadCsv = () => {
    if (rows.length === 0) {
      addNotification(t('admin_calc_empty'), 'error');
      return;
    }
    const csv = calculatorRequestsToCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `gls-calculator-requests-${new Date().toISOString().slice(0, 10)}.csv`);
    addNotification(t('admin_calc_downloaded'), 'success');
  };

  const previewJson = (r: CalculatorRequestRow) => {
    try {
      const s = JSON.stringify(r.input_json ?? {}, null, 0);
      if (s.length <= PREVIEW_LEN) return s;
      return s.slice(0, PREVIEW_LEN) + '…';
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white border border-white/5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-900">
              <Calculator size={28} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">{t('admin_calc_title')}</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 max-w-xl">
                {t('admin_calc_subtitle')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              {t('admin_calc_refresh')}
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
            >
              <Download size={14} />
              {t('admin_calc_download_csv')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t('admin_calc_loading')}</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
            {t('admin_calc_empty')}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-slate-900 text-white z-10">
                <tr>
                  <th className="px-4 py-3 font-black uppercase tracking-widest w-44">{t('admin_calc_col_date')}</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest w-16">Lang</th>
                  <th className="px-4 py-3 font-black uppercase tracking-widest">{t('admin_calc_col_input')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const open = expanded === r.id;
                  const full = JSON.stringify(r.input_json ?? {}, null, 2);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString(localeStr)}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-500">{r.lang ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : r.id)}
                          className="text-left w-full font-mono text-slate-700 break-all"
                        >
                          {open ? (
                            <pre className="whitespace-pre-wrap text-[9px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-64 overflow-y-auto">
                              {full}
                            </pre>
                          ) : (
                            <span className="text-slate-500">{previewJson(r)}</span>
                          )}
                        </button>
                        {!open && (
                          <span className="block text-[8px] text-emerald-600 font-black uppercase mt-1">
                            {t('admin_calc_tap_expand')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

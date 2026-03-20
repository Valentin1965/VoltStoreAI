import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Download, Loader2, RefreshCcw, Trash2, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  adminFetchCalculatorRequests,
  adminDeleteCalculatorRequest,
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<CalculatorRequestRow | null>(null);

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

  const handleDeleteInModal = async () => {
    if (!detailRow || !adminKey) {
      addNotification(t('admin_calc_no_admin_key'), 'error');
      return;
    }
    if (!window.confirm(t('admin_delete_calc_confirm'))) return;
    setDeletingId(detailRow.id);
    try {
      const { error } = await adminDeleteCalculatorRequest(adminKey, detailRow.id);
      if (error) {
        addNotification(`${t('admin_registry_delete_fail')}: ${error}`, 'error');
        return;
      }
      addNotification(t('admin_registry_deleted'), 'success');
      setDetailRow(null);
      setRows((prev) => prev.filter((r) => r.id !== detailRow.id));
    } finally {
      setDeletingId(null);
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
                  <th className="px-4 py-3 font-black uppercase tracking-widest w-24 text-right">
                    {t('admin_col_commands')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString(localeStr)}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-500">{r.lang ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailRow(r)}
                        className="text-left w-full font-mono text-slate-700 break-all hover:text-emerald-600 transition-colors"
                      >
                        <span className="text-slate-500">{previewJson(r)}</span>
                        <span className="block text-[8px] text-emerald-600 font-black uppercase mt-1">
                          {t('admin_calc_tap_expand')}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title={t('admin_delete_calc_btn')}
                        onClick={() => setDetailRow(r)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry detail + delete */}
      {detailRow && (
        <div
          className="fixed inset-0 z-[10004] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calc-log-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setDetailRow(null)}
          />
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col max-h-[min(90vh,720px)] overflow-hidden text-left relative z-10">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
              <div>
                <h3 id="calc-log-modal-title" className="text-sm font-black uppercase tracking-tight text-slate-900">
                  {t('admin_calc_entry_detail')}
                </h3>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                  {new Date(detailRow.created_at).toLocaleString(localeStr)} · {detailRow.lang ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 transition-all"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <pre className="whitespace-pre-wrap text-[9px] leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-slate-800 max-h-[45vh] overflow-y-auto">
                {JSON.stringify(detailRow.input_json ?? {}, null, 2)}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="px-5 py-3 rounded-xl border-2 border-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:border-slate-200 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={deletingId === detailRow.id}
                onClick={() => void handleDeleteInModal()}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {deletingId === detailRow.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {t('admin_delete_calc_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

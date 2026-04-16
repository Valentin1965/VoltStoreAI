import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, isSupabaseUsingEnvCredentials } from '../../services/supabase';
import {
  Database, CheckCircle2, XCircle, AlertTriangle, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Wifi, WifiOff, Table2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { TranslationKey } from '../../utils/translations';

interface TableStatus {
  name: string;
  labelKey: TranslationKey;
  count: number | null;
  error: string | null;
  ok: boolean;
}

const TABLE_DEFS: { name: string; labelKey: TranslationKey }[] = [
  { name: 'batteries', labelKey: 'admin_db_tbl_batteries' },
  { name: 'inverters', labelKey: 'admin_db_tbl_inverters' },
  { name: 'solar_panels', labelKey: 'admin_db_tbl_solar_panels' },
  { name: 'products', labelKey: 'admin_db_tbl_products' },
  { name: 'ev_chargers', labelKey: 'admin_db_tbl_ev_chargers' },
  { name: 'heat_pumps', labelKey: 'admin_db_tbl_heat_pumps' },
  { name: 'orders', labelKey: 'admin_db_tbl_orders' },
  { name: 'mounting_systems', labelKey: 'admin_db_tbl_mounting_systems' },
];

export const DbStatus: React.FC = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [envOk, setEnvOk] = useState(isSupabaseConfigured);
  const [pingMs, setPingMs] = useState<number | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setTables([]);
    setPingMs(null);

    const t0 = Date.now();
    const results: TableStatus[] = [];

    for (const def of TABLE_DEFS) {
      try {
        const { count, error } = await supabase
          .from(def.name)
          .select('*', { count: 'exact', head: true });
        results.push({
          name: def.name,
          labelKey: def.labelKey,
          count: count ?? 0,
          error: error?.message || null,
          ok: !error,
        });
      } catch (e: any) {
        results.push({
          name: def.name,
          labelKey: def.labelKey,
          count: null,
          error: e.message,
          ok: false,
        });
      }
    }

    setPingMs(Date.now() - t0);
    setTables(results);
    setChecking(false);
  };

  useEffect(() => {
    if (open && tables.length === 0) runCheck();
  }, [open]);

  const allOk = tables.length > 0 && tables.every(trow => trow.ok);
  const anyOk = tables.some(trow => trow.ok);

  const statusIcon = checking ? (
    <Loader2 size={14} className="animate-spin text-slate-400" />
  ) : allOk ? (
    <Wifi size={14} className="text-emerald-500" />
  ) : anyOk ? (
    <AlertTriangle size={14} className="text-amber-500" />
  ) : (
    <WifiOff size={14} className="text-rose-500" />
  );

  return (
    <div className="fixed bottom-4 left-4 z-[9999] text-left">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-white/10 shadow-xl hover:bg-slate-800 transition-all"
      >
        <Database size={13} />
        {statusIcon}
        {t('admin_db_badge')}
        {open ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
              <Database size={14} /> {t('admin_db_diagnostics')}
            </div>
            <button
              onClick={runCheck}
              disabled={checking}
              className="text-slate-400 hover:text-white transition-colors"
              type="button"
            >
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_db_environment')}</div>
              <div className={`flex items-center gap-2 p-3 rounded-xl text-[9px] font-black uppercase ${envOk ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                {envOk ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                VITE_SUPABASE_URL + ANON — {envOk ? t('admin_db_configured') : t('admin_db_missing')}
              </div>

              {!envOk && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[9px] text-amber-800 font-bold leading-relaxed">
                  {t('admin_db_env_hint')}
                </div>
              )}
            </div>

            {envOk && (
              <div className="space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1"><Table2 size={11} /> {t('admin_db_tables')}</span>
                  {pingMs !== null && <span className="text-slate-300">{pingMs}ms</span>}
                </div>

                {checking && (
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold p-3">
                    <Loader2 size={11} className="animate-spin" /> {t('admin_db_checking')}
                  </div>
                )}

                {tables.map(trow => (
                  <div
                    key={trow.name}
                    className={`flex items-center justify-between p-3 rounded-xl text-[9px] font-black uppercase ${
                      trow.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {trow.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {t(trow.labelKey)}
                    </div>
                    <span>
                      {trow.ok ? `${trow.count} ${t('admin_db_rows')}` : (trow.error?.slice(0, 24) || '') + '…'}
                    </span>
                  </div>
                ))}

                {tables.length > 0 && !allOk && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[9px] text-amber-800 font-bold leading-relaxed">
                    {t('admin_db_rls_hint')}
                  </div>
                )}
              </div>
            )}

            <div className={`rounded-xl p-3 text-[9px] font-black uppercase text-center ${
              envOk && anyOk ? 'bg-emerald-500 text-white' : anyOk ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {envOk && anyOk ? t('admin_db_live_mode') : t('admin_db_demo_mode')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

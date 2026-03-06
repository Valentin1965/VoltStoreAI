import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import {
  Database, CheckCircle2, XCircle, AlertTriangle, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Wifi, WifiOff, Table2
} from 'lucide-react';

interface TableStatus {
  name: string;
  label: string;
  count: number | null;
  error: string | null;
  ok: boolean;
}

const TABLES = [
  { name: 'batteries',   label: 'Batterier' },
  { name: 'inverters',   label: 'Invertere' },
  { name: 'solar_panels',label: 'Solpaneler' },
  { name: 'products',    label: 'Products (misc)' },
  { name: 'ev_chargers', label: 'EV / Power Station' },
  { name: 'heat_pumps',  label: 'Varmepumper' },
  { name: 'orders',      label: 'Orders' },
];

export const DbStatus: React.FC = () => {
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

    for (const t of TABLES) {
      try {
        const { count, error } = await supabase
          .from(t.name)
          .select('*', { count: 'exact', head: true });
        results.push({ name: t.name, label: t.label, count: count ?? 0, error: error?.message || null, ok: !error });
      } catch (e: any) {
        results.push({ name: t.name, label: t.label, count: null, error: e.message, ok: false });
      }
    }

    setPingMs(Date.now() - t0);
    setTables(results);
    setChecking(false);
  };

  useEffect(() => {
    if (open && tables.length === 0) runCheck();
  }, [open]);

  const allOk = tables.length > 0 && tables.every(t => t.ok);
  const anyOk = tables.some(t => t.ok);

  const StatusIcon = () => {
    if (!envOk) return <WifiOff size={14} className="text-rose-500" />;
    if (checking) return <Loader2 size={14} className="animate-spin text-slate-400" />;
    if (allOk) return <Wifi size={14} className="text-emerald-500" />;
    if (anyOk) return <AlertTriangle size={14} className="text-amber-500" />;
    return <WifiOff size={14} className="text-rose-500" />;
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] text-left">
      {/* Trigger badge */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-slate-900/90 backdrop-blur text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-white/10 shadow-xl hover:bg-slate-800 transition-all"
      >
        <Database size={13} />
        <StatusIcon />
        DB Status
        {open ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-10 left-0 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest">
              <Database size={14} /> Supabase Diagnostics
            </div>
            <button
              onClick={runCheck}
              disabled={checking}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* ENV check */}
            <div className="space-y-2">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Environment</div>
              <div className={`flex items-center gap-2 p-3 rounded-xl text-[9px] font-black uppercase ${envOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {envOk ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                VITE_SUPABASE_URL — {envOk ? 'configured' : 'placeholder / missing'}
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-xl text-[9px] font-black uppercase ${envOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {envOk ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                VITE_SUPABASE_ANON_KEY — {envOk ? 'configured' : 'placeholder / missing'}
              </div>

              {!envOk && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[9px] text-amber-800 font-bold leading-relaxed">
                  Open the <code className="bg-amber-100 px-1 rounded">.env</code> file and paste your real keys from{' '}
                  <span className="underline">supabase.com → Project Settings → API</span>
                </div>
              )}
            </div>

            {/* Table checks */}
            {envOk && (
              <div className="space-y-2">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-1"><Table2 size={11} /> Tables</span>
                  {pingMs !== null && <span className="text-slate-300">{pingMs}ms</span>}
                </div>

                {checking && (
                  <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold p-3">
                    <Loader2 size={11} className="animate-spin" /> Checking tables…
                  </div>
                )}

                {tables.map(t => (
                  <div
                    key={t.name}
                    className={`flex items-center justify-between p-3 rounded-xl text-[9px] font-black uppercase ${
                      t.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {t.label}
                    </div>
                    <span>
                      {t.ok ? `${t.count} rows` : t.error?.slice(0, 24) + '…'}
                    </span>
                  </div>
                ))}

                {tables.length > 0 && !allOk && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[9px] text-amber-800 font-bold leading-relaxed">
                    Tables with errors do not exist or access is denied. Check RLS policies in Supabase.
                  </div>
                )}
              </div>
            )}

            {/* Current mode */}
            <div className={`rounded-xl p-3 text-[9px] font-black uppercase text-center ${
              envOk && anyOk ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {envOk && anyOk ? '🟢 Live DB mode' : '🟡 Demo mode (mock products)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';
import {
  TrendingUp, ShoppingCart, Users, Package,
  ArrowUpRight, ArrowDownRight, Bell, BellOff,
  Loader2, BarChart3, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { Order } from '../../types';

interface Props {
  orders: Order[];
  dbClients: any[];
  isLoadingOrders: boolean;
}

// ── Helper: days ago ──────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('da-DK', { maximumFractionDigits: decimals });
}

export const AdminDashboard: React.FC<Props> = ({ orders, dbClients, isLoadingOrders }) => {
  const { formatPrice } = useLanguage();
  const push = usePushNotifications('admin');

  // ── Derived stats ─────────────────────────────────────────────────────────
  const now   = new Date();
  const last30 = daysAgo(30);
  const last7  = daysAgo(7);
  const prev30Start = daysAgo(60);

  const ordersLast30 = useMemo(() =>
    orders.filter(o => new Date(o.created_at!) >= last30), [orders]);

  const ordersPrev30 = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.created_at!);
      return d >= prev30Start && d < last30;
    }), [orders]);

  const ordersLast7 = useMemo(() =>
    orders.filter(o => new Date(o.created_at!) >= last7), [orders]);

  const revenue30    = ordersLast30.reduce((s, o) => s + (o.total_price || 0), 0);
  const revenuePrev  = ordersPrev30.reduce((s, o) => s + (o.total_price || 0), 0);
  const revChange    = revenuePrev > 0 ? ((revenue30 - revenuePrev) / revenuePrev) * 100 : 0;

  const avgOrder30   = ordersLast30.length > 0 ? revenue30 / ordersLast30.length : 0;

  // ── Orders by status ──────────────────────────────────────────────────────
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const s = (o as any).order_status || o.status || 'unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const statusColors: Record<string, string> = {
    accepted:           'bg-blue-500',
    in_progress:        'bg-amber-500',
    awaiting_transport: 'bg-purple-500',
    in_transit:         'bg-emerald-500',
    processing:         'bg-slate-400',
    paid:               'bg-green-500',
  };
  const statusLabels: Record<string, string> = {
    accepted: 'Accepted', in_progress: 'In progress',
    awaiting_transport: 'Awaiting transport', in_transit: 'In transit',
    processing: 'Processing', paid: 'Paid',
  };

  // ── Daily revenue last 14 days ────────────────────────────────────────────
  const dailyRevenue = useMemo(() => {
    const days: { label: string; rev: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric' });
      const rev = orders
        .filter(o => (o.created_at || '').startsWith(key))
        .reduce((s, o) => s + (o.total_price || 0), 0);
      days.push({ label, rev });
    }
    return days;
  }, [orders]);

  const maxRev = Math.max(...dailyRevenue.map(d => d.rev), 1);

  // ── Top clients ───────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map: Record<string, { email: string; name: string; total: number; count: number }> = {};
    orders.forEach(o => {
      if (!o.customer_email) return;
      const k = o.customer_email;
      if (!map[k]) map[k] = { email: k, name: o.customer_name || k, total: 0, count: 0 };
      map[k].total += o.total_price || 0;
      map[k].count++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);

  // ── Business vs private split ─────────────────────────────────────────────
  const businessCount = orders.filter(o => (o as any).client_type === 'business').length;
  const businessPct   = orders.length > 0 ? Math.round((businessCount / orders.length) * 100) : 0;

  if (isLoadingOrders) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Omsætning 30d',
            value: formatPrice(revenue30),
            sub:   `${revChange >= 0 ? '+' : ''}${fmt(revChange, 1)}% vs. forrige 30d`,
            up:    revChange >= 0,
            icon:  <TrendingUp size={20} />,
            color: 'emerald',
          },
          {
            label: 'Ordrer 30d',
            value: String(ordersLast30.length),
            sub:   `${ordersLast7.length} de seneste 7 dage`,
            up:    true,
            icon:  <ShoppingCart size={20} />,
            color: 'blue',
          },
          {
            label: 'Gns. ordreværdi',
            value: formatPrice(avgOrder30),
            sub:   'Inkl. 25% moms',
            up:    true,
            icon:  <BarChart3 size={20} />,
            color: 'purple',
          },
          {
            label: 'Klienter total',
            value: String(dbClients.length),
            sub:   `${businessPct}% erhvervskunder`,
            up:    true,
            icon:  <Users size={20} />,
            color: 'amber',
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-${card.color}-500 shadow-lg`}>
              {card.icon}
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</div>
              <div className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{card.value}</div>
              <div className={`flex items-center gap-1 text-[9px] font-bold mt-1 ${card.up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {card.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Revenue chart (14 days) ──────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daglig omsætning</div>
              <div className="text-sm font-black text-slate-900">Seneste 14 dage</div>
            </div>
            <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
              {formatPrice(dailyRevenue.reduce((s, d) => s + d.rev, 0))} total
            </div>
          </div>
          <div className="flex items-end gap-1 h-36">
            {dailyRevenue.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex justify-center">
                  {d.rev > 0 && (
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg whitespace-nowrap z-10">
                      {formatPrice(d.rev)}
                    </div>
                  )}
                  <div
                    className={`w-full rounded-t-lg transition-all ${d.rev > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-100'}`}
                    style={{ height: `${(d.rev / maxRev) * 128}px`, minHeight: d.rev > 0 ? '4px' : '2px' }}
                  />
                </div>
                <div className="text-[7px] text-slate-400 font-bold text-center leading-tight" style={{ fontSize: '6.5px' }}>
                  {d.label.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order status breakdown ───────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status fordeling</div>
            <div className="text-sm font-black text-slate-900">{orders.length} ordrer total</div>
          </div>
          <div className="space-y-3">
            {byStatus.slice(0, 6).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-wide">
                    {statusLabels[status] || status}
                  </span>
                  <span className="text-[9px] font-black text-slate-900">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[status] || 'bg-slate-400'}`}
                    style={{ width: `${(count / orders.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Business vs private */}
          <div className="pt-3 border-t border-slate-50">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Kundetype</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${businessPct}%` }} />
              <div className="h-full bg-emerald-200" style={{ width: `${100 - businessPct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] font-black text-blue-600">{businessPct}% Erhverv</span>
              <span className="text-[8px] font-black text-emerald-600">{100 - businessPct}% Privat</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Top clients ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Top 5 klienter</div>
          <div className="space-y-3">
            {topClients.length === 0 ? (
              <p className="text-[10px] text-slate-300 font-bold uppercase">Ingen ordrer endnu</p>
            ) : topClients.map((c, i) => (
              <div key={c.email} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-500' : 'bg-slate-300'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-slate-900 truncate">{c.name}</div>
                  <div className="text-[8px] text-slate-400 font-bold truncate">{c.email}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-black text-emerald-600">{formatPrice(c.total)}</div>
                  <div className="text-[8px] text-slate-400 font-bold">{c.count} ordr{c.count === 1 ? 'e' : 'er'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PWA Push Notifications ───────────────────────────────────── */}
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-sm text-white space-y-5">
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Push Notifikationer</div>
            <div className="text-sm font-black mt-0.5">Ny ordre → direkte til din enhed</div>
          </div>

          {push.status === 'unsupported' && (
            <div className="bg-slate-800 rounded-2xl p-4 text-[10px] text-slate-400 font-bold">
              Push notifikationer understøttes ikke i denne browser.
            </div>
          )}

          {push.status === 'denied' && (
            <div className="bg-rose-900/50 border border-rose-700 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-wide">Adgang blokeret</p>
              <p className="text-[10px] text-slate-400 font-bold">
                Tillad notifikationer i browserindstillingerne for at fortsætte.
              </p>
            </div>
          )}

          {!import.meta.env.VITE_VAPID_PUBLIC_KEY && push.status !== 'unsupported' && (
            <div className="bg-amber-900/40 border border-amber-700 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wide">⚙ VAPID nøgle mangler</p>
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                Kør: <code className="bg-slate-800 px-1 rounded">npx web-push generate-vapid-keys</code><br />
                Tilføj <code className="bg-slate-800 px-1 rounded">VITE_VAPID_PUBLIC_KEY</code> i Vercel.
              </p>
            </div>
          )}

          {(push.status === 'default' || push.status === 'granted') && (
            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${push.isSubscribed ? 'bg-emerald-900/40 border-emerald-700' : 'bg-slate-800 border-slate-700'}`}>
                {push.isSubscribed
                  ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  : <Bell size={18} className="text-slate-400 shrink-0" />
                }
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {push.isSubscribed ? 'Aktiv på denne enhed' : 'Ikke aktiveret'}
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold mt-0.5">
                    {push.isSubscribed
                      ? 'Du modtager notifikationer for nye ordrer'
                      : 'Aktiver for at modtage push ved nye ordrer'
                    }
                  </p>
                </div>
              </div>

              {push.isSubscribed ? (
                <button onClick={push.unsubscribe}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-700 text-rose-400 hover:bg-rose-900/30 transition-all text-[9px] font-black uppercase tracking-widest">
                  <BellOff size={14} /> Deaktiver notifikationer
                </button>
              ) : (
                <button onClick={push.subscribe}
                  disabled={!import.meta.env.VITE_VAPID_PUBLIC_KEY}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none shadow-lg">
                  <Bell size={14} /> Aktiver push notifikationer
                </button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-[8px] text-slate-600 font-bold leading-relaxed">
            Push notifikationer sendes via Web Push API og kræver VAPID nøgler.<br />
            Deploy: <code>supabase functions deploy send-push</code>
          </div>
        </div>
      </div>
    </div>
  );
};

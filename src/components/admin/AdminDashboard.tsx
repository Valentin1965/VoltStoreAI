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

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export const AdminDashboard: React.FC<Props> = ({ orders, dbClients, isLoadingOrders }) => {
  const { formatPrice, t, language } = useLanguage();
  const push = usePushNotifications('admin');

  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';

  // ── Derived stats ─────────────────────────────────────────────────────────
  const now    = new Date();
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

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.order_status || 'accepted';
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
    accepted:           t('admin_status_accepted'),
    in_progress:        t('admin_status_in_progress'),
    awaiting_transport: t('admin_status_awaiting'),
    in_transit:         t('admin_status_in_transit'),
    processing:         t('status_processing'),
    paid:               t('status_confirmed'),
  };

  // ── Daily revenue last 14 days ────────────────────────────────────────────
  const dailyRevenue = useMemo(() => {
    const days: { label: string; rev: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric' });
      const rev   = orders
        .filter(o => (o.created_at || '').startsWith(key))
        .reduce((s, o) => s + (o.total_price || 0), 0);
      days.push({ label, rev });
    }
    return days;
  }, [orders, localeStr]);

  const maxRev = Math.max(...dailyRevenue.map(d => d.rev), 1);

  const topClients = useMemo(() => {
    const map: Record<string, { email: string; name: string; total: number; count: number }> = {};
    orders.forEach(o => {
      const key = o.client_email || (o as any).email || 'unknown';
      if (!map[key]) map[key] = { email: key, name: o.client_name || key, total: 0, count: 0 };
      map[key].total += o.total_price || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);

  const businessCount = orders.filter(o => (o as any).client_type === 'business').length;
  const businessPct   = orders.length > 0 ? Math.round((businessCount / orders.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t('admin_revenue_30d'),
            value: formatPrice(revenue30),
            sub:   `${revChange >= 0 ? '+' : ''}${fmt(revChange, 1)}% ${t('admin_vs_prev_30d')}`,
            up:    revChange >= 0,
            icon:  <TrendingUp size={20} />,
            color: 'emerald',
          },
          {
            label: t('admin_orders_30d'),
            value: String(ordersLast30.length),
            sub:   `${ordersLast7.length} ${t('admin_last_7d')}`,
            up:    true,
            icon:  <ShoppingCart size={20} />,
            color: 'blue',
          },
          {
            label: t('admin_avg_order'),
            value: formatPrice(avgOrder30),
            sub:   `${orders.length} ${t('admin_orders_total_suffix')}`,
            up:    true,
            icon:  <Package size={20} />,
            color: 'purple',
          },
          {
            label: t('admin_clients_total'),
            value: String(dbClients.length),
            sub:   `${businessCount} ${t('admin_business_label').toLowerCase()}`,
            up:    true,
            icon:  <Users size={20} />,
            color: 'amber',
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${card.color}-50 text-${card.color}-500`}>
              {card.icon}
            </div>
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.label}</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{card.value}</div>
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-black ${card.up ? 'text-emerald-600' : 'text-rose-500'}`}>
              {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Revenue chart (14 days) ──────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_daily_revenue')}</div>
              <div className="text-sm font-black text-slate-900">{t('admin_last_14d')}</div>
            </div>
            <div className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">
              {formatPrice(dailyRevenue.reduce((s, d) => s + d.rev, 0))} {t('admin_total_suffix')}
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
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_status_breakdown')}</div>
            <div className="text-sm font-black text-slate-900">{orders.length} {t('admin_orders_total_suffix')}</div>
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
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('admin_customer_type')}</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${businessPct}%` }} />
              <div className="h-full bg-emerald-200" style={{ width: `${100 - businessPct}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[8px] font-black text-blue-600">{businessPct}% {t('admin_business_label')}</span>
              <span className="text-[8px] font-black text-emerald-600">{100 - businessPct}% {t('admin_private_label')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Top clients ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('admin_top_clients')}</div>
          <div className="space-y-3">
            {topClients.length === 0 ? (
              <p className="text-[10px] text-slate-300 font-bold uppercase">{t('admin_no_orders_yet')}</p>
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
                  <div className="text-[8px] text-slate-400 font-bold">{c.count} {c.count === 1 ? t('admin_order_singular') : t('admin_order_plural')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PWA Push Notifications ───────────────────────────────────── */}
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-sm text-white space-y-5">
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('admin_push_title')}</div>
            <div className="text-sm font-black mt-0.5">{t('admin_push_subtitle')}</div>
          </div>

          {push.status === 'unsupported' && (
            <div className="bg-slate-800 rounded-2xl p-4 text-[10px] text-slate-400 font-bold">
              {t('admin_push_unsupported')}
            </div>
          )}

          {push.status === 'denied' && (
            <div className="bg-rose-900/50 border border-rose-700 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] font-black text-rose-300 uppercase tracking-wide">{t('admin_push_denied_title')}</p>
              <p className="text-[10px] text-slate-400 font-bold">{t('admin_push_denied_hint')}</p>
            </div>
          )}

          {!import.meta.env.VITE_VAPID_PUBLIC_KEY && push.status !== 'unsupported' && (
            <div className="bg-amber-900/40 border border-amber-700 rounded-2xl p-4 space-y-1">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wide">⚙ VAPID key missing</p>
              <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                Run: <code className="bg-slate-800 px-1 rounded">npx web-push generate-vapid-keys</code><br />
                Add <code className="bg-slate-800 px-1 rounded">VITE_VAPID_PUBLIC_KEY</code> in Vercel.
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
                    {push.isSubscribed ? t('admin_push_active') : t('admin_push_inactive')}
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold mt-0.5">
                    {push.isSubscribed ? t('admin_push_active_hint') : t('admin_push_inactive_hint')}
                  </p>
                </div>
              </div>

              {push.isSubscribed ? (
                <button onClick={push.unsubscribe}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-700 text-rose-400 hover:bg-rose-900/30 transition-all text-[9px] font-black uppercase tracking-widest">
                  <BellOff size={14} /> {t('admin_push_disable')}
                </button>
              ) : (
                <button onClick={push.subscribe}
                  disabled={!import.meta.env.VITE_VAPID_PUBLIC_KEY}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none shadow-lg">
                  <Bell size={14} /> {t('admin_push_enable')}
                </button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 text-[8px] text-slate-600 font-bold leading-relaxed">
            Deploy: <code>supabase functions deploy send-push</code>
          </div>
        </div>
      </div>
    </div>
  );
};

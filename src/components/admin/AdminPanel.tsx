import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit, Trash2, Crown, RefreshCcw, LogOut,
  Package, TrendingUp, Layers, Search,
  Activity, UserCheck, MessageSquare, Eye,
  Building2, Cpu, Loader2, ChevronLeft, ChevronRight, Calculator,
  PackagePlus,
} from 'lucide-react';
import { DualPrice } from '../PriceDisplay';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { Category, Order, ProductSpec, KitComponent } from '../../types';
import { supabase } from '../../services/supabase';
import { saveAs } from 'file-saver';
import { DbStatus } from './DbStatus';
import { categoryToTable, emptyLoc, IMAGE_FALLBACK, AdminTab, ModalTab, ORDER_STATUSES, isAdminOrderListCompletedStatus } from './adminTypes';
import { AdminOrderModal }            from './AdminOrderModal';
import { AdminClientHistoryModal, AdminInspectUserModal } from './AdminClientModal';
import { AdminProductModal }          from './AdminProductModal';
import { AdminRatesModal }            from './AdminRatesModal';
import { AdminDashboard }            from './AdminDashboard';
import { AdminCalculatorLogs }       from './AdminCalculatorLogs';
import { AdminStockDemandModal }     from './AdminStockDemandModal';
import { AdminMountingSystemsPanel } from './AdminMountingSystemsPanel';
import { AdminMessageTemplatesPanel } from './AdminMessageTemplatesPanel';

function fulfillmentStatusLabel(t: (key: string) => string, raw?: string): string {
  const s = (raw || 'accepted').trim();
  const keyMap: Record<string, string> = {
    accepted: 'admin_status_accepted',
    in_progress: 'admin_status_in_progress',
    awaiting_transport: 'admin_status_awaiting',
    in_transit: 'admin_status_in_transit',
    delivered: 'admin_status_delivered',
    cancelled: 'admin_status_cancelled',
  };
  return t(keyMap[s] || 'admin_status_accepted');
}

function fulfillmentStatusClasses(raw?: string): string {
  const s = (raw || 'accepted').trim();
  const row = ORDER_STATUSES.find((x) => x.key === s);
  const base = 'text-[8px] font-black uppercase px-2.5 py-1 rounded-full border inline-block';
  return row ? `${base} ${row.color}` : `${base} bg-slate-100 text-slate-600 border-slate-200`;
}

// ── ProductRow ──────────────────────────────────────────────────────────
const ProductRow = React.memo(({ product, onEdit, onDelete, formatPrice: _formatPrice, getLoc, t }: any) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="p-6 flex items-center gap-4 text-left">
      <img src={product.image || IMAGE_FALLBACK} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" loading="lazy" alt="" />
      <div>
        <div className="text-[11px] font-black uppercase flex items-center gap-2 text-slate-900">
          {product.ModelName || getLoc(product.name)}
          {product.is_leader && <Crown size={12} className="text-amber-500 fill-amber-500" />}
        </div>
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 flex-wrap">
          {t('admin_col_id')}: {String(product.id).slice(0, 8)} | {product.category}
          {product.BrandProd && ` | ${product.BrandProd}`}
        </div>
      </div>
    </td>
    <td className="p-6 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
        <Package size={12} className="text-slate-400" />
        <span className="text-[11px] font-black text-slate-700">{product.StockLvl || product.stock || 0}</span>
      </div>
    </td>
    <td className="p-6 text-center font-black text-xs text-slate-700">
      <DualPrice priceExVat={product.PriceEurExVat || product.price} align="center" />
    </td>
    <td className="p-6 text-center">
      <div className={`w-2 h-2 rounded-full mx-auto ${product.is_active !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
    </td>
    <td className="p-6 text-right space-x-2">
      <button onClick={() => onEdit(product)} className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit size={14} /></button>
      <button onClick={() => onDelete(product.id, product.category)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={14} /></button>
    </td>
  </tr>
));

// ── Main Component ──────────────────────────────────────────────────────
export const AdminPanel: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [isMounted, setIsMounted]         = useState(false);
  const [activeTab, setActiveTab]         = useState<AdminTab>('dashboard');
  const [modalTab, setModalTab]           = useState<ModalTab>('main');

  const { categories, products, fetchProducts } = useProducts();
  const { addNotification }      = useNotification();
  const { getLoc, t, language, formatPrice } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';

  const adminMainTabLabel = useCallback(
    (tab: AdminTab) => {
      switch (tab) {
        case 'dashboard': return t('admin_tab_dashboard');
        case 'products': return t('admin_tab_products');
        case 'orders': return t('admin_tab_orders');
        case 'kits': return t('admin_tab_kits');
        case 'mounting': return t('admin_tab_mounting');
        case 'clients': return t('admin_tab_clients');
        case 'calculator': return t('admin_tab_calculator');
        case 'messages': return t('admin_tab_messages');
        default: return String(tab);
      }
    },
    [t],
  );

  // Data
  const [orders, setOrders]                   = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [dbClients, setDbClients]             = useState<any[]>([]);

  // Orders: pagination + search + status filter
  const ORDERS_PER_PAGE = 25;
  const [ordersPage, setOrdersPage]               = useState(0);
  const [ordersSearch, setOrdersSearch]           = useState('');
  /** `active` = hide `delivered` fulfilment (see adminTypes ADMIN_ORDER_LIST_COMPLETED_KEYS); DB unchanged */
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('active');
  /** Lowercase email; empty = all clients */
  const [ordersClientEmail, setOrdersClientEmail] = useState('');

  // UI modals
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [inspectUser, setInspectUser]           = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder]       = useState<any | null>(null);
  const [selectedClient, setSelectedClient]     = useState<any | null>(null);
  const [clientHistory, setClientHistory]       = useState<any[]>([]);
  const [isLoadingClientHistory, setIsLoadingClientHistory] = useState(false);
  const [stockDemandOpen, setStockDemandOpen] = useState(false);

  // Product editing
  const [editingProduct, setEditingProduct]         = useState<any | null>(null);
  const [editLang, setEditLang]                     = useState<Language>('en');
  const [localImages, setLocalImages]               = useState<string[]>(['']);
  const [localSpecs, setLocalSpecs]                 = useState<ProductSpec[]>([{ label: '', value: '' }]);
  const [localDocs, setLocalDocs]                   = useState<any[]>([{ title: '', url: '' }]);
  const [localKitComponents, setLocalKitComponents] = useState<KitComponent[]>([]);
  const [localKitComponentsAdditional, setLocalKitComponentsAdditional] = useState<KitComponent[]>([]);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [formData, setFormData]                     = useState<any>({ category: 'Invertere', BrandProd: '', ModelName: '', PriceEurExVat: 0, StockLvl: 0, is_active: true, is_leader: false });

  // Filters
  const [adminCategoryFilter, setAdminCategoryFilter]         = useState<Category | 'All'>('All');
  const [adminManufacturerFilter, setAdminManufacturerFilter] = useState('');

  // Kit builder filters
  const [compSearch, setCompSearch]                           = useState('');
  const [compCategoryFilter, setCompCategoryFilter]           = useState<Category | 'All'>('All');
  const [compBrandFilter, setCompBrandFilter]                 = useState('');
  const [compModelFilter, setCompModelFilter]                 = useState('');
  const [compBattTypeFilter, setCompBattTypeFilter]           = useState('');
  const [compCapKwhFilter, setCompCapKwhFilter]               = useState('');
  const [compInvTypeFilter, setCompInvTypeFilter]             = useState('');
  const [compPhasesFilter, setCompPhasesFilter]               = useState('');
  const [compNumMpptsFilter, setCompNumMpptsFilter]           = useState('');
  const [compHpTypeFilter, setCompHpTypeFilter]               = useState('');
  const [compPhases1Filter, setCompPhases1Filter]             = useState('');
  const [compRefrTypeFilter, setCompRefrTypeFilter]           = useState('');
  const [compHeatCapKwFilter, setCompHeatCapKwFilter]         = useState('');
  const [compSolarPanelTypeFilter, setCompSolarPanelTypeFilter] = useState('');
  const [compRatedPwrWpFilter, setCompRatedPwrWpFilter]       = useState('');
  const [compChgPwrKwFilter, setCompChgPwrKwFilter]           = useState('');

  // ── Derive allProducts from context (no duplicate fetch) ─────────────────
  const allProducts = useMemo(() => products.map(p => ({ ...p, realId: p.id })), [products]);

  const filteredAdminProducts = useMemo(() => allProducts.filter(p => {
    if (p.category === 'Monteringssystemer') return false;
    if (adminCategoryFilter !== 'All' && p.category !== adminCategoryFilter) return false;
    if (adminManufacturerFilter && !(p.BrandProd || p.manufacturer || '').toLowerCase().includes(adminManufacturerFilter.toLowerCase())) return false;
    return true;
  }), [allProducts, adminCategoryFilter, adminManufacturerFilter]);

  // ── Orders: filter + paginate ──────────────────────────────────────────────
  const orderClientOptions = useMemo(() => {
    const byEmail = new Map<string, string>();
    const clientByEmail = new Map(
      (dbClients || []).map((c: any) => [String(c.email || '').trim().toLowerCase(), c]),
    );
    for (const o of orders) {
      const em = String((o as any).customer_email || '').trim().toLowerCase();
      if (!em || !em.includes('@')) continue;
      if (byEmail.has(em)) continue;
      const c = clientByEmail.get(em);
      const nameFromOrder = String((o as any).customer_name || '').trim();
      const nameFromClient = c ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() : '';
      const name = nameFromClient || nameFromOrder;
      byEmail.set(em, name ? `${name} — ${em}` : em);
    }
    return Array.from(byEmail.entries()).sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }));
  }, [orders, dbClients]);

  const filteredOrders = useMemo(() => {
    const q = ordersSearch.toLowerCase().trim();
    return orders.filter(o => {
      const os = String((o as any).order_status || 'accepted').trim();
      if (ordersStatusFilter === 'active') {
        if (isAdminOrderListCompletedStatus(os)) return false;
      } else if (ordersStatusFilter !== 'all' && os !== ordersStatusFilter) {
        return false;
      }
      if (ordersClientEmail) {
        const em = String((o as any).customer_email || '').trim().toLowerCase();
        if (em !== ordersClientEmail) return false;
      }
      if (!q) return true;
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        (o as any).order_number?.toLowerCase().includes(q)
      );
    });
  }, [orders, ordersSearch, ordersStatusFilter, ordersClientEmail]);

  const totalOrderPages  = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders  = filteredOrders.slice(ordersPage * ORDERS_PER_PAGE, (ordersPage + 1) * ORDERS_PER_PAGE);

  useEffect(() => {
    if (totalOrderPages < 1) {
      if (ordersPage !== 0) setOrdersPage(0);
      return;
    }
    if (ordersPage > totalOrderPages - 1) setOrdersPage(totalOrderPages - 1);
  }, [totalOrderPages, ordersPage]);

  // ── Data fetchers ─────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const adminKey = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
    if (!adminKey) {
      setIsLoadingOrders(false);
      return;
    }
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_orders', { p_key: adminKey });
      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [addNotification]);

  const fetchDbClients = useCallback(async () => {
    try {
      const adminKey = import.meta.env.VITE_ADMIN_PASSWORD;
      const { data, error } = await supabase.rpc('admin_get_clients', { p_key: adminKey });
      if (error) throw error;
      setDbClients(data || []);
    } catch (err: any) {
      // Fallback message — RLS blocks direct table access after Migration 5
      addNotification(t('admin_clients_fetch_error'), 'error');
      console.error('[Admin] fetchDbClients RPC error:', err.message);
    }
  }, [addNotification, t]);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (!isMounted) return;
    if (activeTab === 'dashboard' || activeTab === 'orders') fetchOrders();
    if (activeTab === 'clients' || activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'messages') {
      void fetchDbClients();
    }
  }, [activeTab, isMounted, fetchOrders, fetchDbClients]);

  // ── New orders badge (polling, no WebSocket) ─────────────────────────
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const lastSeenOrderIdRef = useRef<string | number | null>(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    if (!isMounted) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const adminKey = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
        if (!adminKey) return;
        const { data, error } = await supabase.rpc('admin_get_orders', { p_key: adminKey });
        if (error) throw error;
        if (cancelled) return;

        const list = Array.isArray(data) ? (data as any[]) : [];
        if (list.length > 0) {
          const topId = list[0]?.id ?? null;
          const lastSeen = lastSeenOrderIdRef.current;
          if (lastSeen != null && activeTabRef.current !== 'orders') {
            const idx = list.findIndex(o => o?.id === lastSeen);
            const delta = idx === -1 ? list.length : idx;
            if (delta > 0) setNewOrdersCount(c => c + delta);
          }
          lastSeenOrderIdRef.current = topId;
        }

        setOrders(list as any);
      } catch {
        // Silent: polling is best-effort; avoid noisy console/errors for end users
      }
    };

    // Prime immediately, then poll
    tick();
    const id = window.setInterval(tick, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isMounted]);

  /** Keep open order modal in sync when orders[] is refetched (tab switch, polling). */
  useEffect(() => {
    setSelectedOrder((prev) => {
      if (!prev?.id) return prev;
      const fresh = orders.find((o) => String(o.id) === String(prev.id));
      if (!fresh) return prev;
      const s = (x: unknown) => (x == null ? '' : String(x));
      const fo = fresh as Record<string, unknown>;
      if (
        s(fo.order_status) === s(prev.order_status) &&
        s(fo.shipping_date) === s(prev.shipping_date) &&
        s(fo.arrival_date) === s(prev.arrival_date)
      ) {
        return prev;
      }
      return fresh;
    });
  }, [orders]);

  // ── CSV export ────────────────────────────────────────────────────────
  const exportOrdersCSV = useCallback(() => {
    const BOM = '\uFEFF';   // UTF-8 BOM — Excel reads Danish chars correctly
    const sep = ';';
    const headers = [
      'Ordre#', 'Dato', 'Navn', 'Email', 'Telefon',
      'Type', 'Virksomhed', 'CVR',
      'Land', 'By', 'Postnummer', 'Gade', 'Husnummer',
      'Total', 'Valuta', 'Betalingsstatus', 'Ordrestatus',
    ];
    const rows = filteredOrders.map(o => [
      (o as any).order_number || o.id,
      o.created_at ? new Date(o.created_at).toLocaleDateString(localeStr) : '',
      o.customer_name || '',
      o.customer_email || '',
      o.customer_phone || '',
      (o as any).client_type === 'business' ? 'Erhverv' : 'Privat',
      (o as any).company_name || '',
      (o as any).vat_number || '',
      (o as any).country || '',
      (o as any).city || o.city || '',
      (o as any).postal_code || '',
      (o as any).street || '',
      (o as any).house_number || '',
      String(o.total_price || 0),
      (o as any).currency || 'EUR',
      o.status || '',
      (o as any).order_status || '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));

    const csv = BOM + [headers.map(h => `"${h}"`), ...rows].map(r => r.join(sep)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `GLS-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    addNotification(t('admin_export_csv_toast').replace('{n}', String(filteredOrders.length)), 'success');
  }, [filteredOrders, addNotification, localeStr, t]);

  const openClientHistory = useCallback(async (client: any) => {
    setSelectedClient(client);
    setIsLoadingClientHistory(true);
    // Filter from already-loaded orders — no direct table query needed after RLS
    const clientOrders = orders
      .filter(o => o.customer_email === client.email)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setClientHistory(clientOrders);
    setIsLoadingClientHistory(false);
  }, [orders]);

  // ── Modal open helpers ────────────────────────────────────────────────
  const resetKitFilters = () => {
    setCompCategoryFilter('All'); setCompBrandFilter(''); setCompModelFilter('');
    setCompSearch(''); setCompBattTypeFilter(''); setCompCapKwhFilter('');
    setCompInvTypeFilter(''); setCompPhasesFilter(''); setCompNumMpptsFilter('');
    setCompHpTypeFilter(''); setCompPhases1Filter(''); setCompRefrTypeFilter('');
    setCompHeatCapKwFilter(''); setCompSolarPanelTypeFilter('');
    setCompRatedPwrWpFilter(''); setCompChgPwrKwFilter('');
  };

  const handleOpenModal = (product?: any, forcedCategory?: Category) => {
    setModalTab('main');
    resetKitFilters();
    if (product) {
      setEditingProduct(product);
      const parsedField = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : fallback; } catch { return fallback; }
      };
      setFormData({
        ...product,
        name: typeof product.name === 'string' ? { da: product.name, en: product.name, no: product.name, se: product.name } : { ...emptyLoc(), ...(product.name || {}) },
        description: typeof product.description === 'string' ? { da: product.description, en: product.description, no: product.description, se: product.description } : { ...emptyLoc(), ...(product.description || {}) },
      });
      setLocalImages(product.images?.length > 0 ? product.images : [product.image || '']);
      setLocalSpecs(parsedField(product.specs, [{ label: '', value: '' }]));
      setLocalDocs(parsedField(product.docs, [{ title: '', url: '' }]));
      // Split kit components into base (is_base !== false) and additional (is_base === false)
      const allKitComps: KitComponent[] = Array.isArray(product.kitComponents) ? product.kitComponents : [];
      setLocalKitComponents(allKitComps.filter((c: any) => c.is_base !== false));
      setLocalKitComponentsAdditional(allKitComps.filter((c: any) => c.is_base === false));
    } else {
      setEditingProduct(null);
      setFormData({ category: forcedCategory || 'Invertere', is_active: true, is_leader: false, StockLvl: 10, BrandProd: '', ModelName: '', PriceEurExVat: 0, name: emptyLoc(), description: emptyLoc(), power_kw: 0, phases: 3 });
      setLocalImages(['']);
      setLocalSpecs([{ label: '', value: '' }]);
      setLocalDocs([{ title: '', url: '' }]);
      setLocalKitComponents([]);
      setLocalKitComponentsAdditional([]);
      if (forcedCategory === 'Sæt') setModalTab('kit_builder');
    }
    setSelectedImageFiles([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number, category: string) => {
    if (!window.confirm(t('admin_confirm_delete_product'))) return;
    const table  = categoryToTable[category] || 'products';
    const realId = typeof id === 'string' && id.includes('-') ? id.split('-')[1] : id;
    try {
      const { error } = await supabase.from(table).delete().eq('id', realId);
      if (error) throw error;
      addNotification(t('removed'), 'success');
      fetchProducts();
    } catch (err: any) { addNotification(err.message, 'error'); }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-8 text-left min-h-screen pb-20 px-8 max-w-[1600px] mx-auto notranslate" translate="no">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center shadow-lg">
            <Cpu size={32} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">Terminal <span className="text-emerald-500">v5.0</span></h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">{t('admin_header_subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full min-w-0 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
          <div
            className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden max-w-full min-w-0 rounded-[2rem] bg-white/5 p-2 [scrollbar-width:thin] touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {(['dashboard', 'products', 'orders', 'kits', 'mounting', 'clients', 'messages', 'calculator'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab); if (tab === 'orders') setNewOrdersCount(0); }}
                className={`relative shrink-0 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
              >
                {tab === 'calculator' ? (
                  <span className="inline-flex items-center gap-1.5"><Calculator size={12} /> {t('admin_tab_calculator')}</span>
                ) : tab === 'messages' ? (
                  <span className="inline-flex items-center gap-1.5"><MessageSquare size={12} /> {t('admin_tab_messages')}</span>
                ) : (
                  adminMainTabLabel(tab)
                )}
                {tab === 'orders' && newOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                    {newOrdersCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="w-[1px] h-8 bg-white/10 mx-1 hidden sm:block" />
          <button onClick={() => setIsRatesModalOpen(true)} className="px-6 py-3 bg-white/10 text-amber-400 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-amber-500/30">
            <TrendingUp size={14} className="inline mr-2" /> {t('admin_btn_rates')}
          </button>
          <button onClick={() => handleOpenModal(undefined, 'Sæt')} className="px-6 py-3 bg-white/10 text-emerald-400 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/30">
            <Layers size={14} className="inline mr-2" /> {t('admin_btn_new_kit')}
          </button>
          <button onClick={() => handleOpenModal()} className="btn-action !bg-emerald-500 !py-3 !px-6 !text-[9px] !rounded-2xl ml-2">
            <Plus size={14} /> {t('admin_btn_new_asset')}
          </button>
          <button onClick={onLogout} className="p-3 text-rose-400 hover:bg-rose-50 rounded-2xl transition-all"><LogOut size={18} /></button>
          </div>
        </div>
      </div>

      <DbStatus />

      {/* ── Dashboard ─────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <AdminDashboard
          orders={orders}
          dbClients={dbClients}
          isLoadingOrders={isLoadingOrders}
        />
      )}

      {activeTab === 'calculator' && <AdminCalculatorLogs />}

      {activeTab === 'messages' && (
        <div className="px-4 md:px-8 pb-20">
          <AdminMessageTemplatesPanel />
        </div>
      )}

      {activeTab === 'mounting' && (
        <div className="px-4 md:px-8 pb-20">
          <AdminMountingSystemsPanel />
        </div>
      )}

      {/* ── Registry table ───────────────────────────────────────────── */}
      <div style={{ display: activeTab === 'dashboard' || activeTab === 'calculator' || activeTab === 'mounting' || activeTab === 'messages' ? 'none' : undefined }}>
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> {adminMainTabLabel(activeTab)} {t('admin_registry_suffix')}
          </h3>
          {(activeTab === 'products' || activeTab === 'kits') && (
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder={t('admin_filter_brand')} value={adminManufacturerFilter}
                  onChange={e => setAdminManufacturerFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all" />
              </div>
              {activeTab === 'products' && (
                <select value={adminCategoryFilter} onChange={e => setAdminCategoryFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer">
                  <option value="All">{t('admin_all_categories')}</option>
                  {categories.filter(c => c !== 'All' && c !== 'Sæt' && c !== 'Monteringssystemer').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-52">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder={t('admin_search_orders')} value={ordersSearch}
                  onChange={e => { setOrdersSearch(e.target.value); setOrdersPage(0); }}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all" />
              </div>
              <select value={ordersStatusFilter}
                onChange={e => { setOrdersStatusFilter(e.target.value); setOrdersPage(0); }}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer">
                <option value="active">{t('admin_orders_filter_open')}</option>
                <option value="all">{t('admin_status_all')}</option>
                <option value="accepted">{t('admin_status_accepted')}</option>
                <option value="in_progress">{t('admin_status_in_progress')}</option>
                <option value="awaiting_transport">{t('admin_status_awaiting')}</option>
                <option value="in_transit">{t('admin_status_in_transit')}</option>
                <option value="delivered">{t('admin_status_delivered')}</option>
                <option value="cancelled">{t('admin_status_cancelled')}</option>
              </select>
              <select
                value={ordersClientEmail}
                onChange={(e) => { setOrdersClientEmail(e.target.value); setOrdersPage(0); }}
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold outline-none focus:border-emerald-500 transition-all cursor-pointer min-w-[10rem] max-w-[min(100%,20rem)] truncate"
                title={t('admin_orders_filter_client')}
              >
                <option value="">{t('admin_orders_all_clients')}</option>
                {orderClientOptions.map(([email, label]) => (
                  <option key={email} value={email}>{label}</option>
                ))}
              </select>
              <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                <RefreshCcw size={12} /> {t('admin_btn_refresh')}
              </button>
              <button onClick={exportOrdersCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                <TrendingUp size={12} /> {t('admin_btn_csv')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetchProducts();
                  setStockDemandOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
              >
                <PackagePlus size={12} /> {t('admin_orders_reorder_btn')}
              </button>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {filteredOrders.length} / {orders.length}
              </span>
            </div>
          )}
        </div>

        {/* ── Other tabs table ─────────────────────────────────────── */}
          <div className="overflow-x-auto">
            {activeTab === 'clients' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-6">{t('admin_col_client')}</th>
                    <th className="p-6 text-center">{t('admin_col_type')}</th>
                    <th className="p-6 text-center">{t('admin_col_city')}</th>
                    <th className="p-6 text-center">{t('admin_col_phone')}</th>
                    <th className="p-6 text-center">{t('admin_col_created')}</th>
                    <th className="p-6 text-right">{t('admin_col_history')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dbClients.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-[10px] text-slate-300 font-bold uppercase tracking-widest">{t('admin_no_clients')}</td></tr>}
                  {dbClients.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openClientHistory(c)}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.client_type === 'business' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'}`}>
                            {c.client_type === 'business' ? <Building2 size={18} /> : <UserCheck size={18} />}
                          </div>
                          <div>
                            <div className="text-[11px] font-black uppercase text-slate-900">{c.first_name} {c.last_name}</div>
                            {c.company_name && <div className="text-[9px] font-bold text-blue-600">{c.company_name}{c.vat_number ? <span className="text-slate-400 font-normal ml-1">· {c.vat_number}</span> : ''}</div>}
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${c.client_type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{c.client_type === 'business' ? t('admin_business_label') : t('admin_private_label')}</span>
                      </td>
                      <td className="p-6 text-center"><div className="text-[10px] font-bold text-slate-700">{c.city || '—'}</div><div className="text-[8px] text-slate-400">{c.country || ''}</div></td>
                      <td className="p-6 text-center text-[10px] font-bold text-slate-500">{c.phone || '—'}</td>
                      <td className="p-6 text-center text-[9px] text-slate-400 font-bold">{c.created_at ? new Date(c.created_at).toLocaleDateString(localeStr) : '—'}</td>
                      <td className="p-6 text-right">
                        <button onClick={e => { e.stopPropagation(); openClientHistory(c); }}
                          className="flex items-center gap-1.5 ml-auto px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                          <Package size={12} /> {t('admin_client_history_btn')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-6">{t('admin_col_asset')}</th>
                    <th className="p-6 text-center">{t('admin_col_stock')}</th>
                    <th className="p-6 text-center">{t('admin_col_base_price')}</th>
                    <th className="p-6 text-center">{t('admin_col_status')}</th>
                    <th className="p-6 text-right">{t('admin_col_commands')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeTab === 'orders' && (
                    isLoadingOrders ? (
                      <tr><td colSpan={5} className="p-10 text-center"><Loader2 size={24} className="animate-spin inline text-emerald-500" /></td></tr>
                    ) : paginatedOrders.length === 0 ? (
                      <tr><td colSpan={5} className="p-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {filteredOrders.length === 0
                          ? (orders.length === 0 ? t('admin_no_orders_yet') : t('admin_orders_empty_filtered'))
                          : t('admin_orders_empty_filtered')}
                      </td></tr>
                    ) : paginatedOrders.map(order => (
                      <tr key={order.id} onClick={() => setSelectedOrder(order)}
                        className="hover:bg-emerald-50/40 transition-colors text-left cursor-pointer">
                        <td className="p-6">
                          <div className="font-black text-[11px] uppercase text-slate-900">{order.customer_name}</div>
                          <div className="text-[9px] text-slate-400 font-bold">{order.customer_email}</div>
                          {(order as any).order_number && (
                            <div className="text-[8px] font-black text-emerald-600 mt-0.5">#{(order as any).order_number}</div>
                          )}
                          {order.customer_message && (
                            <div className="mt-1 text-[9px] text-slate-400 font-medium normal-case flex items-start gap-1">
                              <MessageSquare size={10} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-1 italic">"{order.customer_message}"</span>
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-center">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${(order as any).client_type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {(order as any).client_type === 'business' ? t('admin_business_label') : t('admin_private_label')}
                          </span>
                        </td>
                        <td className="p-6 text-center font-black text-xs text-slate-700">{formatPrice(order.total_price)}</td>
                        <td className="p-6 text-center">
                          <span className={fulfillmentStatusClasses((order as any).order_status)}>
                            {fulfillmentStatusLabel(t, (order as any).order_status)}
                          </span>
                          {order.status && String(order.status).toLowerCase() !== 'paid' && (
                            <div className="mt-1 text-[7px] font-bold text-slate-400 uppercase tracking-tight">
                              {order.status}
                            </div>
                          )}
                        </td>
                        <td className="p-6 text-right">
                          <button onClick={e => { e.stopPropagation(); setSelectedOrder(order); }} className="p-2 hover:bg-emerald-100 rounded-xl transition-all text-emerald-600"><Eye size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                  {(activeTab === 'products' || activeTab === 'kits') &&
                    (activeTab === 'products'
                      ? filteredAdminProducts
                      : filteredAdminProducts.filter(p => p.category === 'Sæt')
                    ).map(p => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        onEdit={handleOpenModal}
                        onDelete={handleDelete}
                        formatPrice={formatPrice}
                        getLoc={getLoc}
                        t={t}
                      />
                    ))}
                </tbody>
              </table>
            )}
          {/* ── Orders pagination bar ──────────────────────────────── */}
          {activeTab === 'orders' && !isLoadingOrders && totalOrderPages > 1 && (
            <div className="flex items-center justify-between px-8 py-4 border-t border-slate-50 bg-slate-50/30">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {t('admin_page_label')} {ordersPage + 1} {t('admin_of_short')} {totalOrderPages} &nbsp;·&nbsp; {filteredOrders.length} {t('admin_orders_word')}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setOrdersPage(p => Math.max(0, p - 1))}
                  disabled={ordersPage === 0}
                  className="p-2 rounded-xl hover:bg-white border border-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-all">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalOrderPages) }).map((_, i) => {
                  const half  = Math.floor(Math.min(5, totalOrderPages) / 2);
                  const start = Math.max(0, Math.min(ordersPage - half, totalOrderPages - Math.min(5, totalOrderPages)));
                  const page  = start + i;
                  return (
                    <button key={page} onClick={() => setOrdersPage(page)}
                      className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${page === ordersPage ? 'bg-slate-900 text-white' : 'hover:bg-white border border-slate-200 text-slate-500'}`}>
                      {page + 1}
                    </button>
                  );
                })}
                <button onClick={() => setOrdersPage(p => Math.min(totalOrderPages - 1, p + 1))}
                  disabled={ordersPage >= totalOrderPages - 1}
                  className="p-2 rounded-xl hover:bg-white border border-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-all">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {selectedOrder && (
        <AdminOrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={updated => {
            setSelectedOrder(updated);
            setOrders(prev =>
              prev.map(row =>
                String(row.id) === String((updated as Order).id) ? { ...row, ...(updated as object) } : row,
              ),
            );
            void fetchOrders();
          }}
          onDeleted={id => {
            setSelectedOrder(null);
            setOrders(prev => prev.filter((row: any) => String(row.id) !== String(id)));
            void fetchOrders();
          }}
        />
      )}

      {stockDemandOpen && (
        <AdminStockDemandModal
          orders={orders}
          products={allProducts}
          onClose={() => setStockDemandOpen(false)}
        />
      )}

      {selectedClient && (
        <AdminClientHistoryModal
          client={selectedClient}
          history={clientHistory}
          isLoading={isLoadingClientHistory}
          allClients={dbClients}
          onSwitchClient={openClientHistory}
          onClose={() => { setSelectedClient(null); setClientHistory([]); }}
          onClientDeleted={(id) => {
            setDbClients((prev) => prev.filter((c: any) => String(c.id) !== String(id)));
            setSelectedClient(null);
            setClientHistory([]);
            setInspectUser((u) => (u && String(u.id) === String(id) ? null : u));
          }}
        />
      )}

      {inspectUser && (
        <AdminInspectUserModal
          client={inspectUser}
          onClose={() => setInspectUser(null)}
          onDiscountSaved={(id, discount) => {
            setInspectUser((prev: any) => ({ ...prev, discount }));
            setDbClients(prev => prev.map((c: any) => c.id === id ? { ...c, discount } : c));
          }}
          onClientDeleted={(id) => {
            setDbClients((prev) => prev.filter((c: any) => String(c.id) !== String(id)));
            setInspectUser(null);
            setSelectedClient((c) => (c && String(c.id) === String(id) ? null : c));
            setClientHistory([]);
          }}
        />
      )}

      {isModalOpen && (
        <AdminProductModal
          editingProduct={editingProduct}
          formData={formData} setFormData={setFormData}
          modalTab={modalTab} setModalTab={setModalTab}
          localImages={localImages} setLocalImages={setLocalImages}
          localSpecs={localSpecs} setLocalSpecs={setLocalSpecs}
          localDocs={localDocs} setLocalDocs={setLocalDocs}
          localKitComponents={localKitComponents} setLocalKitComponents={setLocalKitComponents}
          localKitComponentsAdditional={localKitComponentsAdditional} setLocalKitComponentsAdditional={setLocalKitComponentsAdditional}
          selectedImageFiles={selectedImageFiles}
          setSelectedImageFiles={setSelectedImageFiles}
          allProducts={allProducts}
          editLang={editLang}
          setEditLang={setEditLang}
          compSearch={compSearch}
          setCompSearch={setCompSearch}
          compCategoryFilter={compCategoryFilter}
          setCompCategoryFilter={setCompCategoryFilter}
          compBrandFilter={compBrandFilter}
          setCompBrandFilter={setCompBrandFilter}
          compModelFilter={compModelFilter}
          setCompModelFilter={setCompModelFilter}
          compBattTypeFilter={compBattTypeFilter}
          setCompBattTypeFilter={setCompBattTypeFilter}
          compCapKwhFilter={compCapKwhFilter}
          setCompCapKwhFilter={setCompCapKwhFilter}
          compInvTypeFilter={compInvTypeFilter}
          setCompInvTypeFilter={setCompInvTypeFilter}
          compPhasesFilter={compPhasesFilter}
          setCompPhasesFilter={setCompPhasesFilter}
          compNumMpptsFilter={compNumMpptsFilter}
          setCompNumMpptsFilter={setCompNumMpptsFilter}
          compHpTypeFilter={compHpTypeFilter}
          setCompHpTypeFilter={setCompHpTypeFilter}
          compPhases1Filter={compPhases1Filter}
          setCompPhases1Filter={setCompPhases1Filter}
          compRefrTypeFilter={compRefrTypeFilter}
          setCompRefrTypeFilter={setCompRefrTypeFilter}
          compHeatCapKwFilter={compHeatCapKwFilter}
          setCompHeatCapKwFilter={setCompHeatCapKwFilter}
          compSolarPanelTypeFilter={compSolarPanelTypeFilter}
          setCompSolarPanelTypeFilter={setCompSolarPanelTypeFilter}
          compRatedPwrWpFilter={compRatedPwrWpFilter}
          setCompRatedPwrWpFilter={setCompRatedPwrWpFilter}
          compChgPwrKwFilter={compChgPwrKwFilter}
          setCompChgPwrKwFilter={setCompChgPwrKwFilter}
          onClose={() => setIsModalOpen(false)}
          onSaved={async () => {
            await fetchProducts();
            setIsModalOpen(false);
          }}
        />
      )}

      {isRatesModalOpen && (
        <AdminRatesModal onClose={() => setIsRatesModalOpen(false)} />
      )}
    </div>
  );
};

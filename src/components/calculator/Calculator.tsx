import React, { useState, useMemo } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProducts } from '../../contexts/ProductsContext';
import { 
  RotateCcw, Check, ShieldCheck, 
  Activity, Cpu, Zap, Settings2, Target, Wallet, Sparkles,
  Loader2, ArrowRight, Layers, CheckCircle2, Database, AlertCircle,
  Trash2, Plus, X, Search, ChevronDown, ChevronUp, Package
} from 'lucide-react';
import { Product } from '../../types';
import { DualPrice } from '../PriceDisplay';
import { DocExportButton } from '../DocExportButton';
import { IMAGE_FALLBACK } from '../../utils/constants';

interface CalculatorProps { initialStep?: 1 | 3; }

interface KitComponent {
  product: Product | null;
  name: string;
  quantity: number;
  price: number;
  type: 'Inverter' | 'Battery' | 'Panel' | 'Accessories';
}

interface CalculatedKit {
  title: string;
  description: string;
  totalPrice: number;
  components: KitComponent[];
  benefits: string[];
}

const useLocalizedName = () => {
  const { language } = useLanguage();
  return (p: Product): string => {
    if (!p.name) return 'Unnamed';
    if (typeof p.name === 'string') return p.name;
    return (p.name as any)[language] || (p.name as any).en || (p.name as any).da || 'Unnamed';
  };
};

export const Calculator: React.FC<CalculatorProps> = ({ initialStep = 1 }) => {
  const [step, setStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState(false);

  const [consumption, setConsumption] = useState<string>('300');
  const [phase, setPhase] = useState<'1' | '3'>('1');
  const [goal, setGoal] = useState<'savings' | 'backup' | 'independence'>('savings');
  const [budget, setBudget] = useState<'eco' | 'standard' | 'premium'>('standard');

  const [result, setResult] = useState<CalculatedKit | null>(null);

  // Editable components (user can remove/add/change quantity)
  const [editComps, setEditComps] = useState<KitComponent[]>([]);

  // Catalog picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('All');

  const { addNotification } = useNotification();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const { products, isLoading: dbLoading } = useProducts();
  const locName = useLocalizedName();

  const inverters = useMemo(() => products.filter(p => p.category === 'Invertere'    && p.is_active !== false), [products]);
  const batteries = useMemo(() => products.filter(p => p.category === 'Batterier'    && p.is_active !== false), [products]);
  const panels    = useMemo(() => products.filter(p => p.category === 'Solpaneler'   && p.is_active !== false), [products]);
  const dbReady   = inverters.length > 0 || batteries.length > 0 || panels.length > 0;

  const catalogCategories = useMemo(() =>
    ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))],
    [products]);

  const pickerProducts = useMemo(() => {
    return products.filter(p => {
      if (p.is_active === false) return false;
      if (pickerCategory !== 'All' && p.category !== pickerCategory) return false;
      const q = pickerSearch.toLowerCase();
      if (!q) return true;
      const name = locName(p).toLowerCase();
      return name.includes(q) || (p.category || '').toLowerCase().includes(q);
    });
  }, [products, pickerCategory, pickerSearch, locName]);

  const derivedTotal = useMemo(
    () => editComps.reduce((s, c) => s + c.price * c.quantity, 0),
    [editComps]);

  const pickInverter = (powerKw: number, is3Phase: boolean): Product | null => {
    const cands = inverters.filter(p => {
      const ph = p.Phases || p.inverter_type || '';
      return !(is3Phase && !ph.toLowerCase().includes('3'));
    });
    return cands.sort((a, b) => {
      const aP = a.MaxPvInVoltV || a.price / 250;
      const bP = b.MaxPvInVoltV || b.price / 250;
      return Math.abs(aP - powerKw * 1000) - Math.abs(bP - powerKw * 1000);
    })[0] || null;
  };

  const pickBattery = (capKwh: number): Product | null =>
    batteries.sort((a, b) => Math.abs((a.CapKwh || 5) - capKwh) - Math.abs((b.CapKwh || 5) - capKwh))[0] || null;

  const pickPanel = (): Product | null => {
    if (budget === 'premium') return panels.find(p => (p.RatedPwrWp || 0) >= 500) || panels[0] || null;
    if (budget === 'eco')     return panels.sort((a, b) => a.price - b.price)[0] || null;
    return panels[Math.floor(panels.length / 2)] || null;
  };

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const monthlyKwh = parseInt(consumption);
      const is3Phase   = phase === '3';
      let inverterPower = Math.max(is3Phase ? 5 : 3, Math.ceil((monthlyKwh / 30 / 4) * 1.5));
      if (is3Phase && inverterPower < 5) inverterPower = 5;
      let batteryCap = goal === 'savings' ? 5 : goal === 'backup' ? 10 : 20;
      if (monthlyKwh > 800) batteryCap *= 1.5;
      const panelCount  = Math.ceil((inverterPower * 1.2) / 0.45);
      const multiplier  = budget === 'eco' ? 1 : budget === 'standard' ? 1.4 : 2.1;

      const ri = dbReady ? pickInverter(inverterPower, is3Phase) : null;
      const rb = dbReady ? pickBattery(batteryCap)               : null;
      const rp = dbReady ? pickPanel()                           : null;

      const invName   = ri ? locName(ri) : `Hybrid Inverter ${inverterPower}kW`;
      const batName   = rb ? locName(rb) : `LiFePO4 Battery ${batteryCap}kWh`;
      const panName   = rp ? locName(rp) : `Bifacial N-Type Panel 450W`;
      const invPrice  = ri?.price || Math.round(inverterPower * 250 * multiplier);
      const batPrice  = rb?.price || Math.round(batteryCap * 350 * multiplier);
      const panPrice  = rp?.price || 110;
      const extraPrice = Math.round(400 * multiplier);
      const brand     = budget === 'eco' ? 'Eco' : budget === 'standard' ? 'Standard' : 'Premium';

      const components: KitComponent[] = [
        { product: ri,   name: String(invName), quantity: 1,          price: invPrice,   type: 'Inverter'     },
        { product: rb,   name: String(batName), quantity: 1,          price: batPrice,   type: 'Battery'      },
        { product: rp,   name: String(panName), quantity: panelCount, price: panPrice,   type: 'Panel'        },
        { product: null, name: 'Mounting Kit & Smart Monitor', quantity: 1, price: extraPrice, type: 'Accessories' },
      ];

      const kit: CalculatedKit = {
        title: `Green Light ${brand} ${inverterPower}kW Pro-Kit`,
        description: `${phase}-phase solar configuration optimized for ${goal}. Designed for ${monthlyKwh}kWh/month.`,
        totalPrice: Math.round(components.reduce((s, c) => s + c.price * c.quantity, 0)),
        components,
        benefits: [
          `${goal.toUpperCase()} Optimization`,
          `${phase}-Phase Balanced Load`,
          `Smart App Monitoring Included`,
          `Expandable Modular Design`
        ]
      };

      setResult(kit);
      setEditComps(components);
      setStep(3);
      setLoading(false);
      addNotification(t('item_added'), 'success');
    }, 1000);
  };

  // ── Kit editor helpers ─────────────────────────────────────────────────────
  const removeComp = (i: number) =>
    setEditComps(prev => prev.filter((_, idx) => idx !== i));

  const changeQty = (i: number, delta: number) =>
    setEditComps(prev => prev.map((c, idx) =>
      idx === i ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));

  const addFromCatalog = (p: Product) => {
    setEditComps(prev => {
      const existing = prev.findIndex(c => c.product?.id === p.id);
      if (existing >= 0) {
        return prev.map((c, i) => i === existing ? { ...c, quantity: c.quantity + 1 } : c);
      }
      const type: KitComponent['type'] =
        p.category === 'Invertere'  ? 'Inverter' :
        p.category === 'Batterier'  ? 'Battery'  :
        p.category === 'Solpaneler' ? 'Panel'    : 'Accessories';
      return [...prev, { product: p, name: locName(p), quantity: 1, price: p.price, type }];
    });
    setPickerOpen(false);
    setPickerSearch('');
  };

  const handleAddToCart = () => {
    if (!result) return;
    const kitProduct: Product = {
      id: `KIT-CALC-${Date.now()}`,
      name: { da: result.title, en: result.title },
      description: { da: result.description, en: result.description },
      price: derivedTotal,
      category: 'Sæt',
      image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
      features: result.benefits,
      is_active: true,
      stock: 1
    };
    addItem(kitProduct, editComps.map(c => ({
      id: c.product?.id || `part-${Math.random().toString(36).substr(2, 9)}`,
      name: c.name, price: c.price, quantity: c.quantity
    })));
    addNotification(t('item_added'), 'success');
  };

  const reset = () => { setStep(1); setResult(null); setEditComps([]); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-10 px-4 text-left">

      {/* DB badge */}
      <div className="flex justify-end mb-4">
        {dbLoading ? (
          <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full">
            <Loader2 size={11} className="animate-spin" /> Loading catalogue…
          </span>
        ) : dbReady ? (
          <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <Database size={11} /> Live catalogue — {products.length} products
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
            <AlertCircle size={11} /> Demo mode — connect DB for real products
          </span>
        )}
      </div>

      {/* Step 1: Form */}
      {step === 1 && (
        <div className="animate-fade-in space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              <Sparkles size={14} /> {t('nav_architect')}
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none" dangerouslySetInnerHTML={{ __html: t('calc_title') }} />
          </div>

          <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Consumption */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Activity size={14} className="text-emerald-500" /> {t('calc_consumption')}
              </label>
              <div className="relative">
                <input type="range" min="50" max="2000" step="50" value={consumption}
                  onChange={(e) => setConsumption(e.target.value)}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                <div className="flex justify-between mt-2 text-[10px] font-black text-slate-900 uppercase">
                  <span>50 kWh</span>
                  <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{consumption} kWh</span>
                  <span>2000 kWh</span>
                </div>
              </div>
            </div>

            {/* Phase */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Zap size={14} className="text-emerald-500" /> {t('calc_phase')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['1','3'] as const).map(p => (
                  <button key={p} onClick={() => setPhase(p)}
                    className={`p-4 rounded-2xl border-2 transition-all font-bold text-xs ${phase === p ? 'border-emerald-500 bg-emerald-50 shadow-md text-emerald-700' : 'border-slate-50 text-slate-400'}`}>
                    {t(`calc_phase_${p}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Goal */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Target size={14} className="text-emerald-500" /> {t('calc_goal')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['savings','backup','independence'].map(g => (
                  <button key={g} onClick={() => setGoal(g as any)}
                    className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${goal === g ? 'border-emerald-500 bg-emerald-50 shadow-sm text-emerald-700' : 'border-slate-50 text-slate-400'}`}>
                    {t('calc_' + g)}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <Wallet size={14} className="text-emerald-500" /> {t('calc_budget')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['eco','standard','premium'].map(b => (
                  <button key={b} onClick={() => setBudget(b as any)}
                    className={`p-4 rounded-xl border-2 transition-all text-left text-[10px] font-black uppercase ${budget === b ? 'border-emerald-500 bg-emerald-50 shadow-sm text-emerald-700' : 'border-slate-50 text-slate-400'}`}>
                    {t('calc_' + b)}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <button onClick={handleGenerate} disabled={loading}
                className="w-full bg-slate-900 text-white hover:bg-emerald-600 py-6 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl flex items-center justify-center gap-4 group active:scale-95 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" /> : <><Cpu size={20} /> {t('calc_generate')} <ArrowRight size={20} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result + Kit Editor */}
      {step === 3 && result && (
        <div className="animate-fade-in space-y-10 pb-20">
          <button onClick={reset} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all">
            <RotateCcw size={16} /> {t('calc_recalculate')}
          </button>

          <div className="bg-white rounded-[4rem] border border-slate-100 shadow-3xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 p-10 md:p-16 text-white">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">{result.title}</h1>
              <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed mt-4">{result.description}</p>
            </div>

            <div className="p-10 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
              {/* Components list — editable */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Kit Components — {editComps.length} items
                  </span>
                </div>

                {editComps.map((c, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group/comp">
                    {/* Image */}
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.product?.image
                        ? <img src={c.product.image} alt={c.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                        : <Package size={20} className="text-slate-300" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-900 uppercase truncate">{c.name}</span>
                        {c.product && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Live from catalogue" />}
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{c.type}</span>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-0.5 shrink-0">
                      <button onClick={() => changeQty(i, -1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 rounded-lg transition-colors">
                        <ChevronDown size={12} />
                      </button>
                      <span className="w-6 text-center text-[10px] font-black text-slate-900">{c.quantity}</span>
                      <button onClick={() => changeQty(i, 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-emerald-600 rounded-lg transition-colors">
                        <ChevronUp size={12} />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      <DualPrice priceExVat={c.price * c.quantity} align="right" />
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeComp(i)}
                      className="p-1.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0 opacity-0 group-hover/comp:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                {/* Add component button */}
                <button onClick={() => setPickerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all text-[10px] font-black uppercase tracking-widest">
                  <Plus size={16} /> Add Component from Catalogue
                </button>

                {/* Legend */}
                <div className="flex items-center gap-3 pt-1 text-[8px] text-slate-400 font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Live product
                  <span className="w-2 h-2 rounded-full bg-slate-200 inline-block ml-3" /> Estimated
                </div>
              </div>

              {/* Summary panel */}
              <div className="lg:col-span-1">
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 sticky top-32 space-y-8 text-center">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase">{t('calc_investment')}</h4>
                    <DualPrice priceExVat={derivedTotal} align="center" className="text-3xl" />
                    {derivedTotal !== result.totalPrice && (
                      <p className="text-[8px] text-slate-400 font-bold uppercase">
                        Original: <span className="line-through">{result.totalPrice.toLocaleString('da-DK')} €</span>
                      </p>
                    )}
                  </div>
                  <button onClick={handleAddToCart}
                    className="w-full bg-emerald-500 text-white hover:bg-emerald-600 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
                    <Layers size={18} /> {t('calc_add_kit')}
                  </button>
                  <DocExportButton
                    mode="kit"
                    kit={{
                      title: result.title,
                      description: result.description,
                      totalPrice: derivedTotal,
                      components: editComps.map(c => ({ name: c.name, quantity: c.quantity, price: c.price, type: c.type })),
                      benefits: result.benefits,
                      params: { consumption, phase, goal, budget },
                    }}
                    className="w-full flex justify-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}
          onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Add Component</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Choose from catalogue</p>
              </div>
              <button onClick={() => setPickerOpen(false)}
                className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-4 border-b border-slate-50">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-[11px] font-bold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-400"
                  autoFocus
                />
              </div>
              <select
                value={pickerCategory}
                onChange={e => setPickerCategory(e.target.value)}
                className="px-3 py-2.5 text-[11px] font-bold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-emerald-400 text-slate-700 shrink-0">
                {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Product list */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {pickerProducts.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-8">No products found</p>
              ) : pickerProducts.map(p => (
                <button key={p.id} onClick={() => addFromCatalog(p)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group/pick">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center overflow-hidden">
                    {p.image
                      ? <img src={p.image} alt={locName(p)} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                      : <Package size={18} className="text-slate-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-slate-900 uppercase truncate">{locName(p)}</div>
                    <div className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">{p.category}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <DualPrice priceExVat={p.price} align="right" />
                  </div>
                  <div className="shrink-0 w-8 h-8 bg-emerald-50 group-hover/pick:bg-emerald-500 rounded-xl flex items-center justify-center transition-colors">
                    <Plus size={14} className="text-emerald-500 group-hover/pick:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

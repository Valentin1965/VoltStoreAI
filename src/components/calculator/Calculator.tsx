import React, { useEffect, useMemo, useState } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { DualPrice } from '../PriceDisplay';
import { Product } from '../../types';
import { Calculator as CalculatorIcon, Zap, Battery, Sun, RefreshCw, Printer, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type CalculatorResult = {
  id: string;
  createdAt: string;
  monthlyKwh: number;
  hourlyKwh: number;
  dailyKwh: number;
  recommendedInverterPower: number;
  recommendedBatteryCapacity: number;
  recommendedSolarPanels: number;
  estimatedCost: number;
  notes: string;
};

type RecommendedItem = { product: Product; quantity: number };

const STORAGE_KEY = 'gls_calculator_results_v1';

const getCalculatorResults = (): CalculatorResult[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCalculatorResult = (res: CalculatorResult) => {
  const prev = getCalculatorResults();
  const next = [res, ...prev.filter(r => r.id !== res.id)].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const deleteCalculatorResult = (id: string) => {
  const prev = getCalculatorResults();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev.filter(r => r.id !== id)));
};

const specValue = (p: Product, key: string): string => {
  const specs = (p as any).specs;
  if (!Array.isArray(specs)) return '';
  const found = specs.find((s: any) => String(s?.label || '').toLowerCase() === key.toLowerCase());
  return String(found?.value ?? '');
};

const parsePower = (str: string): number => {
  if (!str) return 0;
  const lower = str.toLowerCase();
  const value = parseFloat(lower);
  if (!Number.isFinite(value)) return 0;
  if (lower.includes('kw')) return value;
  if (lower.includes('w')) return value / 1000;
  return value;
};

const parseCapacity = (str: string): number => {
  if (!str) return 0;
  const value = parseFloat(str);
  return Number.isFinite(value) ? value : 0;
};

const getInverterKw = (p: Product): number => {
  const direct = Number((p as any).NomPwrKw ?? (p as any).RatedPwrKw ?? (p as any).NomOutputKw);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const keys = ['MaxSPwr_kVA', 'NomPwrKw', 'RatedPwrKw', 'Output Power', 'NomOutputKw'];
  for (const k of keys) {
    const raw = specValue(p, k);
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v > 0) return k.toLowerCase().includes('kva') ? v * 0.95 : v;
  }
  return parsePower(specValue(p, 'Output Power'));
};

const getBatteryKwh = (p: Product): number => {
  const direct = Number((p as any).CapKwh ?? (p as any).CapacityKwh ?? (p as any).BattCapKwh);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const keys = ['CapKwh', 'Capacity', 'CapacityKwh', 'BattCapKwh'];
  for (const k of keys) {
    const raw = specValue(p, k);
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return parseCapacity(specValue(p, 'Capacity'));
};

const COMPANY_NAME = 'GREEN LIGHT Scandinavia Group';
const COMPANY_CONTACT = 'Katmosevej 16, Viborg 8800, Denmark';
const COMPANY_TEL = '+45 61 48 52 19';
const COMPANY_EMAIL = 'info@glsolargroup.dk';
const COMPANY_WEB = 'www.greenlight.dk';

const downloadTheoreticalPdf = (res: CalculatorResult, backupHours: number) => {
  // Use HTML -> canvas -> PDF so Ukrainian text renders correctly (no embedded Cyrillic fonts needed).
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const peakLoad = res.hourlyKwh * 3;
  const invMinRounded = Math.max(0.3, Math.ceil(res.recommendedInverterPower * 10) / 10).toFixed(1);
  const batMaxRounded = (Math.ceil(res.recommendedBatteryCapacity * 1.2 * 10) / 10).toFixed(1);
  const solarRecommended = Math.max(res.recommendedSolarPanels, Math.ceil(res.recommendedSolarPanels * 1.3));

  const esc = (s: any) =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('\n', '<br/>');

  const makePage = (pageNum: number, totalPages: number, bodyHtml: string) => `
    <div class="page">
      <div class="topbar">
        <div>
          <div class="brand">GREEN LIGHT</div>
          <div class="subtitle">Theoretical System Requirements</div>
        </div>
        <div class="company">
          <div><b>${esc(COMPANY_NAME)}</b></div>
          <div>Contact: ${esc(COMPANY_CONTACT)}</div>
          <div class="date">${esc(dateStr)}</div>
        </div>
      </div>
      ${bodyHtml}
      <div class="footer">
        <div>${esc(COMPANY_NAME)} — Professional Solar Equipment</div>
        <div>Page ${pageNum} / ${totalPages}</div>
      </div>
    </div>
  `;

  const css = `
    <style>
      .wrap { position: fixed; left: -99999px; top: 0; width: 794px; }
      .page { width: 794px; height: 1123px; box-sizing: border-box; padding: 56px 56px 52px 56px;
              font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; background: #ffffff; position: relative; }
      .topbar { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; padding: 18px 18px; border-radius: 18px; background: #10b981; color: #ffffff; }
      .brand { font-weight: 1000; font-size: 30px; letter-spacing: -0.03em; color: #ffffff; }
      .subtitle { margin-top: 4px; font-weight: 900; font-size: 15px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(255,255,255,0.92); }
      .company { text-align:right; font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.95); line-height: 1.45; }
      .date { margin-top: 6px; color: rgba(255,255,255,0.85); font-weight: 900; }
      .section { margin-top: 16px; }
      .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 8px; color: #111827; }
      .kv .row { display:flex; justify-content:space-between; gap: 12px; font-size: 12px; padding: 2px 0; }
      .kv .k { color:#334155; font-weight: 800; }
      .kv .v { color:#0f172a; font-weight: 900; }
      .cards { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
      .card .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color:#334155; }
      .card .big { margin-top: 8px; font-size: 28px; font-weight: 900; }
      .card .muted { margin-top: 8px; font-size: 11px; color:#475569; font-weight: 700; white-space: pre-line; }
      .box { border: 1px dashed #cbd5e1; border-radius: 14px; padding: 10px 12px; background:#f8fafc; font-size: 11px; color:#475569; font-weight: 700; line-height: 1.5; }
      .method { font-size: 11px; color:#0f172a; font-weight: 800; line-height: 1.55; }
      .method code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace; font-size: 11px; }
      .rec { border: 1px solid #f59e0b55; background:#fffbeb; border-radius: 14px; padding: 12px; }
      .rec h3 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color:#92400e; margin:0; }
      .rec .item { margin-top: 10px; font-size: 11px; color:#7c2d12; font-weight: 700; line-height: 1.5; }
      .next { border: 1px solid #bbf7d0; background:#f0fdf4; border-radius: 14px; padding: 12px; }
      .next h3 { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color:#166534; margin:0; }
      .checklist { margin-top: 10px; font-size: 11px; color:#14532d; font-weight: 700; line-height: 1.65; }
      .contact { margin-top: 10px; font-size: 11px; color:#14532d; font-weight: 800; line-height: 1.65; }
      .footer { position: absolute; left: 56px; right: 56px; bottom: 18px; display:flex; justify-content:space-between; color:#64748b; font-size: 10px; font-weight: 800; }
    </style>
  `;

  const page1Body = `
    <div class="section">
      <div class="section-title">Input Parameters</div>
      <div class="kv">
        <div class="row"><div class="k">Monthly consumption</div><div class="v">${res.monthlyKwh} kWh/month</div></div>
        <div class="row"><div class="k">Daily consumption</div><div class="v">${res.dailyKwh.toFixed(2)} kWh/day</div></div>
        <div class="row"><div class="k">Average hourly load</div><div class="v">${res.hourlyKwh.toFixed(3)} kW</div></div>
        <div class="row"><div class="k">Peak load (x3 factor)</div><div class="v">${peakLoad.toFixed(3)} kW</div></div>
        <div class="row"><div class="k">Backup duration</div><div class="v">${backupHours} hours</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recommended Component Parameters</div>
      <div class="cards">
        <div class="card">
          <div class="label">Inverter Power</div>
          <div class="big">${res.recommendedInverterPower.toFixed(2)} kW</div>
          <div class="muted">Peak load: ${peakLoad.toFixed(3)} kW
+10% headroom applied
Min required: ${res.recommendedInverterPower.toFixed(2)} kW</div>
        </div>
        <div class="card">
          <div class="label">Battery Capacity</div>
          <div class="big">${res.recommendedBatteryCapacity.toFixed(2)} kWh</div>
          <div class="muted">Daily use: ${res.dailyKwh.toFixed(2)} kWh x ${backupHours}h
80% DoD + 10% headroom
Min required: ${res.recommendedBatteryCapacity.toFixed(2)} kWh</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Calculation Method</div>
      <div class="method">
        <div><b>Inverter:</b> <code>peak_load = avg_hourly x 3</code> -> <code>min_capacity = peak_load x 1.10</code> (+10% headroom)</div>
        <div><b>Battery:</b> <code>need = daily_kWh x backup_hours / 24h / 0.80</code> -> <code>min = need x 1.10</code></div>
        <div style="margin-top:8px;"><b>Solar:</b> ~${res.recommendedSolarPanels} x 450W panels estimated (not auto-selected - add manually)</div>
        <div style="margin-top:6px;" class="box"><b>Basis:</b> 30-day month · 3x peak factor · 80% battery DoD · +10% component headroom</div>
      </div>
    </div>

    <div class="section rec">
      <h3>Practical Recommendations</h3>
      <div class="item"><b>Inverter:</b> Select a model rated at least <b>${invMinRounded} kW</b> (theoretical minimum: ${res.recommendedInverterPower.toFixed(2)} kW). Choose the nearest standard model above that value to handle start-up surges and allow future load growth.</div>
      <div class="item"><b>Battery:</b> Recommended capacity: <b>${res.recommendedBatteryCapacity.toFixed(2)}-${batMaxRounded} kWh</b> (theoretical: ${res.recommendedBatteryCapacity.toFixed(2)} kWh). The extra buffer compensates inverter efficiency loss (~90-95%) and cable resistance (2-5%). Consider LiFePO4 chemistry for longer cycle life.</div>
      <div class="item"><b>Solar Panels (Poland / Netherlands):</b> A 450W panel generates ~1.2-1.8 kWh/day depending on season. For reliable battery charging recommend <b>${solarRecommended}</b> panels (+30% for winter/cloudy days). Total array: ~<b>${solarRecommended * 450} W</b>. Optimal tilt: 30-40° south-facing.</div>
    </div>
  `;

  const page2Body = `
    <div class="section rec" style="border-color:#94a3b8; background:#f8fafc;">
      <h3 style="color:#0f172a;">Additional Considerations</h3>
      <div class="item" style="color:#334155;">
        <div><b>Cable losses:</b> 2-5% (use properly sized cross-section cables).</div>
        <div><b>Protection:</b> install MCB, RCD, and surge protection (SPD).</div>
        <div><b>Assumptions:</b> all values assume single-phase system. Consult a certified installer for final design.</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Note</div>
      <div class="box">
        This is a theoretical recommendation. Actual requirements depend on local conditions, shading, cable losses, and usage patterns. Consult a certified installer.
      </div>
    </div>

    <div class="section">
      <div class="section-title">Customer Notes</div>
      <div class="box">${esc(res.notes || '—')}</div>
    </div>

    <div class="section next">
      <h3>✅ NEXT STEPS</h3>
      <div class="checklist">
        □ 1. Confirm technical requirements<br/>
        □ 2. Choose specific equipment models<br/>
        □ 3. Receive final quotation<br/>
        □ 4. Sign contract<br/>
        □ 5. Schedule installation
      </div>
      <div class="contact">
        📞 CONTACT US:<br/>
        📧 Email: ${esc(COMPANY_EMAIL)}<br/>
        📱 Tel: ${esc(COMPANY_TEL)}<br/>
        🌐 Web: ${esc(COMPANY_WEB)}
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.className = 'wrap';
  container.innerHTML = `${css}${makePage(1, 2, page1Body)}${makePage(2, 2, page2Body)}`;
  document.body.appendChild(container);

  const render = async (el: HTMLElement) => {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    return canvas;
  };

  (async () => {
    try {
      const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await render(pages[i]);
        const imgData = canvas.toDataURL('image/png');
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
        if (i < pages.length - 1) doc.addPage();
      }
      const filename = `GREEN-LIGHT-Requirements-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } finally {
      document.body.removeChild(container);
    }
  })();
};

export const Calculator: React.FC = () => {
  const { products } = useProducts();
  const { getLoc, t } = useLanguage();
  const { addItem } = useCart();
  const { addNotification } = useNotification();

  const [monthlyKwh, setMonthlyKwh] = useState<string>('');
  const [backupHours, setBackupHours] = useState<string>('8');
  const [notes, setNotes] = useState<string>('');
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [savedResults, setSavedResults] = useState<CalculatorResult[]>([]);
  const [recommendedKit, setRecommendedKit] = useState<RecommendedItem[]>([]);

  useEffect(() => {
    setSavedResults(getCalculatorResults());
  }, []);

  const activeCatalog = useMemo(() => (products || []).filter(p => p.is_active !== false), [products]);

  const calculateNeeds = () => {
    const monthly = parseFloat(monthlyKwh) || 0;
    const backup = parseFloat(backupHours) || 8;
    if (monthly <= 0) return;

    const dailyKwh = monthly / 30;
    const hourlyKwh = monthly / (30 * 24);
    const peakLoad = hourlyKwh * 3;
    const MARGIN = 1.1;

    const neededInverterKw = peakLoad;
    const neededBatteryKwh = (dailyKwh * backup) / 24 / 0.8;
    const minInverterKw = neededInverterKw * MARGIN;
    const minBatteryKwh = neededBatteryKwh * MARGIN;

    const dailySolarNeeded = dailyKwh * 1.2;
    const panelOutput = 0.45 * 4.5;
    const recommendedSolarPanels = Math.ceil(dailySolarNeeded / panelOutput);

    const recommendedInverterPower = parseFloat(minInverterKw.toFixed(2));
    const recommendedBatteryCapacity = parseFloat(minBatteryKwh.toFixed(2));

    const kitItems: RecommendedItem[] = [];

    const invWithSpec = activeCatalog
      .filter(p => p.category === 'Invertere' && p.price > 0 && getInverterKw(p) > 0)
      .sort((a, b) => a.price - b.price);
    const invCatalog =
      invWithSpec.length > 0
        ? invWithSpec
        : activeCatalog
            .filter(p => p.category === 'Invertere' && p.price > 0)
            .sort((a, b) => a.price - b.price);
    const bestInverter = invCatalog.find(inv => getInverterKw(inv) >= minInverterKw) ?? invCatalog[0];
    if (bestInverter) kitItems.push({ product: bestInverter, quantity: 1 });

    const batCatalog = activeCatalog
      .filter(p => p.category === 'Batterier' && p.price > 0 && getBatteryKwh(p) > 0)
      .sort((a, b) => a.price - b.price);
    if (batCatalog.length > 0) {
      const battery = batCatalog[0];
      const capKwh = getBatteryKwh(battery);
      const qty = Math.max(1, Math.ceil(minBatteryKwh / (capKwh || 1)));
      kitItems.push({ product: battery, quantity: qty });
    }

    setRecommendedKit(kitItems);
    const realCost = kitItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    setResult({
      id: `calc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      monthlyKwh: monthly,
      hourlyKwh: parseFloat(hourlyKwh.toFixed(3)),
      dailyKwh: parseFloat(dailyKwh.toFixed(2)),
      recommendedInverterPower,
      recommendedBatteryCapacity,
      recommendedSolarPanels,
      estimatedCost: realCost,
      notes,
    });
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setRecommendedKit(prev =>
      prev
        .map(item =>
          item.product.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter(item => item.quantity > 0),
    );
  };

  const handleRemoveItem = (productId: string) => {
    setRecommendedKit(prev => prev.filter(item => item.product.id !== productId));
  };

  const kitTotal = useMemo(
    () => recommendedKit.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [recommendedKit],
  );

  const handleAddKitToCart = () => {
    if (recommendedKit.length === 0) return;
    const kitProduct: Product = {
      id: `KIT-CALC-${Date.now()}`,
      name: {
        en: `Custom Kit (${new Date().toLocaleDateString()})`,
        da: `Custom Kit (${new Date().toLocaleDateString()})`,
        no: `Custom Kit (${new Date().toLocaleDateString()})`,
        se: `Custom Kit (${new Date().toLocaleDateString()})`,
      } as any,
      description: { en: notes || '', da: notes || '', no: notes || '', se: notes || '' } as any,
      price: kitTotal,
      category: 'Sæt' as any,
      image: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=800&auto=format&fit=crop',
      is_active: true,
      stock: 1,
    } as any;

    addItem(
      kitProduct,
      recommendedKit.map(i => ({
        id: i.product.id,
        name: getLoc(i.product.name),
        price: i.product.price,
        quantity: i.quantity,
      })),
    );
    addNotification(t('item_added'), 'success');
  };

  const handleSave = () => {
    if (!result) return;
    const updated: CalculatorResult = { ...result, estimatedCost: kitTotal, notes };
    saveCalculatorResult(updated);
    setSavedResults(getCalculatorResults());
  };

  const handleDeleteSaved = (id: string) => {
    if (!window.confirm('Delete this calculation?')) return;
    deleteCalculatorResult(id);
    setSavedResults(getCalculatorResults());
  };

  const handleLoadResult = (saved: CalculatorResult) => {
    setMonthlyKwh(String(saved.monthlyKwh));
    setNotes(saved.notes || '');
    setResult(saved);
  };

  const handleReset = () => {
    setMonthlyKwh('');
    setBackupHours('8');
    setNotes('');
    setResult(null);
    setRecommendedKit([]);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 text-left">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-900">
          <CalculatorIcon className="h-8 w-8" />
          Energy Calculator
        </h1>
        <p className="text-slate-500 mt-1 font-mono text-sm">Calculate required components based on your energy consumption</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 h-fit bg-white border border-slate-100 rounded-[2rem] shadow-xl">
          <div className="p-6 border-b border-slate-100">
            <div className="text-sm font-black uppercase tracking-wide text-slate-900">Input Parameters</div>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Monthly Consumption (kWh)</label>
              <input
                label="Monthly Consumption (kWh)"
                type="number"
                min={0}
                step={1}
                value={monthlyKwh}
                onChange={e => setMonthlyKwh(e.target.value)}
                placeholder="e.g. 500"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Backup Hours Required</label>
              <input
                type="number"
                min={1}
                max={48}
                value={backupHours}
                onChange={e => setBackupHours(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900 resize-y"
                placeholder="Project notes..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={calculateNeeds}
                className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Calculate
              </button>
              <button onClick={handleReset} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-slate-900">
                <Zap className="h-4 w-4 text-amber-500" />
                Section 1 — Theoretical Requirements
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest"
                    onClick={handleSave}
                  >
                    Save
                  </button>
                  <button
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    onClick={() => downloadTheoreticalPdf(result, parseFloat(backupHours) || 8)}
                  >
                    <Printer className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
            <div className="p-6">
              {result ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border-l-4 border-l-amber-500 bg-amber-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-mono uppercase font-bold">Inverter Power</span>
                      </div>
                      <div className="text-3xl font-black font-mono text-amber-600">
                        {result.recommendedInverterPower}
                        <span className="text-base text-slate-500 ml-1">kW</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 space-y-0.5 font-mono">
                        <div>Avg hourly load: {result.hourlyKwh} kW</div>
                        <div>Peak load (×3): {(result.hourlyKwh * 3).toFixed(3)} kW</div>
                        <div>+10% headroom: {result.recommendedInverterPower} kW min</div>
                      </div>
                    </div>

                    <div className="border-l-4 border-l-amber-500 bg-amber-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <Battery className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-mono uppercase font-bold">Battery Capacity</span>
                      </div>
                      <div className="text-3xl font-black font-mono text-amber-600">
                        {result.recommendedBatteryCapacity}
                        <span className="text-base text-slate-500 ml-1">kWh</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2 space-y-0.5 font-mono">
                        <div>Daily consumption: {result.dailyKwh} kWh</div>
                        <div>Backup: {parseFloat(backupHours) || 8}h at 80% DoD</div>
                        <div>+10% headroom: {result.recommendedBatteryCapacity} kWh min</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl flex items-start gap-3">
                    <Sun className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-slate-500 font-mono">
                      <span className="font-black text-slate-700">Solar panels:</span> theoretical estimate ~{result.recommendedSolarPanels} × 450W panels needed. Solar panels are{' '}
                      <span className="font-black">not auto-selected</span>.
                    </div>
                  </div>

                  {/* Calculation Method (explained with real numbers) */}
                  {(() => {
                    const avgKw = result.hourlyKwh;
                    const peakKw = avgKw * 3;
                    const invReserveKw = peakKw * 0.1;
                    const invMinKw = peakKw * 1.1;
                    const invRecommendedKw = Math.max(0.3, Math.ceil(invMinKw * 10) / 10);

                    const dailyKwh = result.dailyKwh;
                    const bh = parseFloat(backupHours) || 8;
                    const reserveFactor = bh / 24;
                    const neededEnergyKwh = dailyKwh * reserveFactor;
                    const afterDodKwh = neededEnergyKwh / 0.8;
                    const batMinKwh = afterDodKwh * 1.1;
                    const batRecommendedKwh = Math.max(0.3, Math.ceil(batMinKwh * 10) / 10);

                    return (
                      <div className="border border-slate-200 bg-white rounded-xl p-4">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-900">
                          {t('calc_how_we_calculate_title')}
                        </div>

                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                              {t('calc_how_we_calculate_inverter_title')}
                            </div>
                            <div className="mt-2 font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                              {`Average load: ${avgKw.toFixed(3)} kW
x Peak factor: 3
= Peak load: ${peakKw.toFixed(3)} kW
+ 10% reserve: ${invReserveKw.toFixed(3)} kW
─────────────────────────
MINIMUM: ${invMinKw.toFixed(2)} kW
RECOMMENDED: ${invRecommendedKw.toFixed(1)} kW (motor start surges)`}
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                              {t('calc_how_we_calculate_battery_title')}
                            </div>
                            <div className="mt-2 font-mono text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                              {`Daily consumption: ${dailyKwh.toFixed(2)} kWh
x Backup time: ${bh.toFixed(0)}/24 = ${reserveFactor.toFixed(2)}
= Energy needed: ${neededEnergyKwh.toFixed(2)} kWh
/ Depth of discharge (80%): 0.80
x 10% reserve: 1.10
─────────────────────────
MINIMUM: ${batMinKwh.toFixed(2)} kWh
RECOMMENDED: ${batRecommendedKwh.toFixed(1)} kWh (real-world losses)`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Practical recommendations */}
                  <div className="border border-amber-200 bg-amber-50 p-4 rounded-xl space-y-3">
                    <div className="text-xs font-black uppercase tracking-widest text-amber-800">
                      Practical Recommendations
                    </div>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-black">Inverter:</span>{' '}
                      Select a model rated at least{' '}
                      <span className="font-black font-mono">
                        {Math.max(0.3, Math.ceil(result.recommendedInverterPower * 10) / 10).toFixed(1)} kW
                      </span>{' '}
                      (theoretical minimum: <span className="font-mono">{result.recommendedInverterPower} kW</span>). Choose the nearest standard model above that value
                      to handle start-up surges and allow future load growth.
                    </div>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-black">Battery:</span>{' '}
                      Recommended capacity{' '}
                      <span className="font-black font-mono">
                        {result.recommendedBatteryCapacity}–{(Math.ceil(result.recommendedBatteryCapacity * 1.2 * 10) / 10).toFixed(1)} kWh
                      </span>{' '}
                      to compensate real-world losses (inverter efficiency ~90–95% and cable resistance 2–5%). Consider LiFePO4 chemistry for longer cycle life.
                    </div>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-black">Solar panels (Poland / Netherlands):</span>{' '}
                      A 450W panel generates ~1.2–1.8 kWh/day depending on season. For reliable battery charging recommend{' '}
                      <span className="font-black font-mono">
                        {Math.max(result.recommendedSolarPanels, Math.ceil(result.recommendedSolarPanels * 1.3))}
                      </span>{' '}
                      panels (+30% for winter/cloudy days). Total array: ~
                      <span className="font-black font-mono">
                        {Math.max(result.recommendedSolarPanels, Math.ceil(result.recommendedSolarPanels * 1.3)) * 450} W
                      </span>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <CalculatorIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-mono text-sm uppercase">Enter your monthly consumption to calculate</p>
                </div>
              )}
            </div>
          </div>

          {savedResults.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="text-sm font-black uppercase tracking-wide text-slate-900">Saved Calculations</div>
              </div>
              <div className="divide-y divide-slate-100">
                {savedResults.map(saved => (
                  <div key={saved.id} className="p-6 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500">{new Date(saved.createdAt).toLocaleDateString()}</div>
                      <div className="font-black text-slate-900">{saved.monthlyKwh} kWh/month</div>
                      <div className="text-xs text-slate-500 font-mono truncate">{saved.notes || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => handleLoadResult(saved)}
                      >
                        Load
                      </button>
                      <button
                        className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 flex items-center justify-center"
                        onClick={() => handleDeleteSaved(saved.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useEffect, useMemo, useState } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
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
  const peakLoad = res.hourlyKwh * 3 * 1.1;
  const invMinRounded = Math.max(0.3, Math.ceil(res.recommendedInverterPower * 10) / 10).toFixed(1);
  const batMaxRounded = (Math.ceil(res.recommendedBatteryCapacity * 1.2 * 10) / 10).toFixed(1);

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
      .subttl { margin-top: 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color:#92400e; }
      .tblwrap { margin-top: 8px; border: 1px solid #f59e0b55; border-radius: 12px; overflow:hidden; background:#ffffff; }
      table.tbl { width:100%; border-collapse: collapse; font-size: 10px; }
      table.tbl thead th { background:#fffbeb; color:#7c2d12; text-align:left; padding: 8px 10px; font-weight: 900; border-bottom:1px solid #fde68a; }
      table.tbl tbody td { padding: 8px 10px; border-bottom:1px solid #fef3c7; color:#0f172a; font-weight: 700; }
      table.tbl tbody tr:last-child td { border-bottom:none; }
      .note { margin-top: 8px; font-size: 10px; color:#7c2d12; font-weight: 800; line-height: 1.5; }
      .list { margin-top: 8px; font-size: 11px; color:#7c2d12; font-weight: 700; line-height: 1.55; }
      .list div { margin-top: 4px; }
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
        <div class="row"><div class="k">Peak load (x3, +10%)</div><div class="v">${peakLoad.toFixed(3)} kW</div></div>
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
80% DoD, cold factor 1.25 + reserve 10%
Min required: ${res.recommendedBatteryCapacity.toFixed(2)} kWh</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Calculation Method</div>
      <div class="method">
        <div><b>Inverter:</b> <code>peak_load = avg_hourly x 3 x 1.10</code> (Scandinavia reserve)</div>
        <div><b>Battery:</b> <code>need = daily_kWh x backup_hours / 24 / 0.80 x 1.25</code> (cold factor) -> <code>min = need x 1.10</code> (reserve)</div>
        <div style="margin-top:8px;"><b>Solar:</b> Denmark average: 450W panel ~= 0.9-1.5 kWh/day. We size conservatively.</div>
        <div style="margin-top:6px;" class="box"><b>Basis:</b> 30-day month · peak factor 3 · inverter reserve +10% · battery DoD 80% · cold factor 1.25 · reserve +10%</div>
      </div>
    </div>
  `;

  const page2Body = `
    <div class="section rec">
      <h3>Practical Recommendations</h3>
      <div class="item"><b>Inverter:</b> Select a model rated at least <b>${invMinRounded} kW</b> (theoretical minimum: ${res.recommendedInverterPower.toFixed(2)} kW). Choose the nearest standard model above that value to handle start-up surges and allow future load growth.</div>
      <div class="item"><b>Battery:</b> Recommended capacity: <b>${res.recommendedBatteryCapacity.toFixed(2)}-${batMaxRounded} kWh</b> (theoretical: ${res.recommendedBatteryCapacity.toFixed(2)} kWh). The extra buffer compensates inverter efficiency loss (~90-95%) and cable resistance (2-5%). Consider LiFePO4 chemistry for longer cycle life.</div>
      <div class="item"><b>Solar panels (Scandinavia):</b> A 450W panel typically produces ~0.9-1.5 kWh/day (annual average). Winter output can be ~20-30% of summer. Use a reliability multiplier: x1.5 (2-panel baseline) or x2.0 (3-panel baseline).</div>

      <div class="subttl">Average yield on 1x 450W panel (annual balance)</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Region</th>
              <th>Summer (kWh/day)</th>
              <th>Winter (kWh/day)</th>
              <th>Annual average</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Poland / Netherlands</b></td>
              <td>2.5-3.5</td>
              <td>0.4-0.8</td>
              <td>1.2-1.8</td>
            </tr>
            <tr>
              <td><b>Denmark / South Sweden</b></td>
              <td>2.0-3.0</td>
              <td>0.2-0.5</td>
              <td>0.9-1.5</td>
            </tr>
            <tr>
              <td><b>Norway / Finland</b></td>
              <td>1.8-2.8</td>
              <td>0.1-0.3</td>
              <td>0.6-1.2</td>
            </tr>
            <tr>
              <td><b>North Norway / Iceland</b></td>
              <td>1.5-2.5</td>
              <td>0.0-0.2</td>
              <td>0.4-0.9</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="note"><b>Important:</b> in winter, generation can be 5-10x lower than in summer. In northern regions, polar-night periods are possible.</div>

      <div class="subttl">Why you often need more battery capacity</div>
      <div class="list">
        <div>Cold climate brings long periods of cloudy weather (3-7 days in a row).</div>
        <div>Snow cover on panels reduces generation.</div>
        <div>Batteries lose usable capacity in cold (~10-20% at -10C).</div>
      </div>
    </div>
  `;

  const page3Body = `
    <div class="section rec">
      <h3>Equipment & installation checks</h3>
      <div class="subttl">Inverter correction (cold climate requirements)</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Standard</th>
              <th>For Scandinavia</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Operating temperature</b></td>
              <td>-10C to +45C</td>
              <td>-25C to +50C</td>
            </tr>
            <tr>
              <td><b>Efficiency at low temperatures</b></td>
              <td>~95%</td>
              <td>Check specification</td>
            </tr>
            <tr>
              <td><b>Moisture protection</b></td>
              <td>IP65</td>
              <td>IP65+ (snow, rain, condensate)</td>
            </tr>
            <tr>
              <td><b>Certification</b></td>
              <td>CE</td>
              <td>CE + local standards (e.g. Svensk Elstandard)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="subttl">Tilt & orientation optimization (by latitude)</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Location</th>
              <th>Latitude</th>
              <th>Optimal tilt</th>
              <th>Orientation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Copenhagen (Denmark)</b></td>
              <td>55.7N</td>
              <td>35-45</td>
              <td>South / SW</td>
            </tr>
            <tr>
              <td><b>Stockholm (Sweden)</b></td>
              <td>59.3N</td>
              <td>40-50</td>
              <td>South</td>
            </tr>
            <tr>
              <td><b>Oslo (Norway)</b></td>
              <td>59.9N</td>
              <td>40-50</td>
              <td>South / SE</td>
            </tr>
            <tr>
              <td><b>Helsinki (Finland)</b></td>
              <td>60.2N</td>
              <td>45-55</td>
              <td>South</td>
            </tr>
            <tr>
              <td><b>Tromso (Norway)</b></td>
              <td>69.6N</td>
              <td>55-65</td>
              <td>South (max winter generation)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="note"><b>Tip:</b> for maximum annual yield, tilt ~= local latitude. For winter-focused generation, increase tilt by +10-15 degrees.</div>
    </div>

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
  container.innerHTML = `${css}${makePage(1, 3, page1Body)}${makePage(2, 3, page2Body)}${makePage(3, 3, page3Body)}`;
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
  const { getLoc: _getLoc, t } = useLanguage();
  const { addItem: _addItem } = useCart();
  const { addNotification: _addNotification } = useNotification();

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
    // Scandinavia correction:
    // - Inverter peak: avg_hourly * 3 * 1.10
    // - Battery: (daily_kWh * backup_hours / 24 / 0.80) * 1.25, then * 1.10 reserve
    const peakLoad = hourlyKwh * 3 * 1.1;
    const INV_MARGIN = 1.0; // already included in peakLoad for Scandinavia template
    const BAT_COLD_FACTOR = 1.25;
    const BAT_RESERVE = 1.1;

    const neededInverterKw = peakLoad;
    const neededBatteryKwh = ((dailyKwh * backup) / 24 / 0.8) * BAT_COLD_FACTOR;
    const minInverterKw = neededInverterKw * INV_MARGIN;
    const minBatteryKwh = neededBatteryKwh * BAT_RESERVE;

    // Panels (Scandinavia correction):
    // 450W panel ~= 0.9–1.5 kWh/day annual average in Denmark.
    // Use conservative 1.0 kWh/day for sizing.
    const dailySolarNeeded = dailyKwh * 1.2;
    const panelOutputKwhPerDay = 1.0;
    const recommendedSolarPanels = Math.max(1, Math.ceil(dailySolarNeeded / panelOutputKwhPerDay));

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

  const kitTotal = useMemo(
    () => recommendedKit.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [recommendedKit],
  );

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
                  {/* Input parameters (shown in results) */}
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                      {t('calc_input_parameters_title')}
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-black">{t('calc_monthly_consumption')}</span>
                        <span className="text-slate-900 font-black font-mono">{result.monthlyKwh} kWh/month</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-black">{t('calc_backup_duration')}</span>
                        <span className="text-slate-900 font-black font-mono">{parseFloat(backupHours) || 8} h</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-black">{t('calc_daily_consumption')}</span>
                        <span className="text-slate-900 font-black font-mono">{result.dailyKwh.toFixed(2)} kWh/day</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500 font-black">{t('calc_avg_hourly_load')}</span>
                        <span className="text-slate-900 font-black font-mono">{result.hourlyKwh.toFixed(3)} kW</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:col-span-2">
                        <span className="text-slate-500 font-black">{t('calc_peak_load')}</span>
                      <span className="text-slate-900 font-black font-mono">{(result.hourlyKwh * 3 * 1.1).toFixed(3)} kW</span>
                      </div>
                    </div>
                  </div>

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
                        <div>Peak load (×3 × 1.10): {(result.hourlyKwh * 3 * 1.1).toFixed(3)} kW</div>
                        <div>Minimum inverter: {result.recommendedInverterPower} kW</div>
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
                        <div>Cold factor: ×1.25</div>
                        <div>Reserve: ×1.10</div>
                        <div>Minimum battery: {result.recommendedBatteryCapacity} kWh</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl flex items-start gap-3">
                    <Sun className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-slate-500 font-mono">
                      <span className="font-black text-slate-700">Solar panels (Denmark):</span> 450W panel typically produces ~0.9–1.5 kWh/day (annual average). Baseline size ~{result.recommendedSolarPanels} × 450W. Winter output can be ~20–30% of summer.
                    </div>
                  </div>

                  {/* Calculation Method (explained with real numbers) */}
                  {(() => {
                    const avgKw = result.hourlyKwh;
                    const peakKw = avgKw * 3 * 1.1; // Scandinavia reserve included
                    const invReserveKw = peakKw - avgKw * 3;
                    const invMinKw = peakKw;
                    const invRecommendedKw = Math.max(0.3, Math.ceil(invMinKw * 10) / 10);

                    const dailyKwh = result.dailyKwh;
                    const bh = parseFloat(backupHours) || 8;
                    const reserveFactor = bh / 24;
                    const neededEnergyKwh = dailyKwh * reserveFactor;
                    const afterDodKwh = neededEnergyKwh / 0.8;
                    const afterColdKwh = afterDodKwh * 1.25;
                    const batMinKwh = afterColdKwh * 1.1;
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
x Scandinavia reserve: 1.10
= Peak load: ${peakKw.toFixed(3)} kW
(reserve part: ${invReserveKw.toFixed(3)} kW)
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
x Cold factor: 1.25
x Reserve: 1.10
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
                      <span className="font-black">Solar panels (Scandinavia):</span>{' '}
                      Base generation (Denmark) for a 450W panel is ~0.9–1.5 kWh/day (annual average). Winter output can be ~20–30% of summer. For reliability, consider a multiplier:{' '}
                      <span className="font-black font-mono">x1.5</span> (2-panel baseline) or <span className="font-black font-mono">x2.0</span> (3-panel baseline). Total array (baseline):{' '}
                      <span className="font-black font-mono">{result.recommendedSolarPanels * 450} W</span>.
                    </div>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-black">Mounting:</span> tilt ≈ latitude ±5° (or +10–15° for winter focus), orientation south (SE/SW ±30° acceptable), and keep panels at least ~30 cm above roof for snow sliding.
                    </div>
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-black">Equipment:</span> inverter rated to -25°C and IP65+, LiFePO4 battery with BMS + thermal protection, and frost-resistant cables with ~20% cross-section headroom.
                    </div>

                    {/* Average yield table (450W panel) */}
                    <div className="pt-2">
                      <div className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                        Average yield per 450W panel (annual balance)
                      </div>
                      <div className="mt-2 overflow-x-auto rounded-xl border border-amber-200 bg-white">
                        <table className="min-w-[720px] w-full text-xs">
                          <thead className="bg-amber-50 border-b border-amber-200">
                            <tr className="text-amber-900">
                              <th className="text-left px-3 py-2 font-black">Region</th>
                              <th className="text-left px-3 py-2 font-black">Summer (kWh/day)</th>
                              <th className="text-left px-3 py-2 font-black">Winter (kWh/day)</th>
                              <th className="text-left px-3 py-2 font-black">Annual average</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Poland / Netherlands</td>
                              <td className="px-3 py-2 font-mono text-slate-700">2.5–3.5</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.4–0.8</td>
                              <td className="px-3 py-2 font-mono text-slate-700">1.2–1.8</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Denmark / South Sweden</td>
                              <td className="px-3 py-2 font-mono text-slate-700">2.0–3.0</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.2–0.5</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.9–1.5</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Norway / Finland</td>
                              <td className="px-3 py-2 font-mono text-slate-700">1.8–2.8</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.1–0.3</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.6–1.2</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">North Norway / Iceland</td>
                              <td className="px-3 py-2 font-mono text-slate-700">1.5–2.5</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.0–0.2</td>
                              <td className="px-3 py-2 font-mono text-slate-700">0.4–0.9</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 text-[11px] text-amber-900 leading-relaxed">
                        <span className="font-black">Important:</span> in winter, generation can be 5–10× lower than in summer. In northern regions, polar-night periods are possible.
                      </div>
                    </div>

                    {/* Why more capacity */}
                    <div className="pt-2">
                      <div className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                        Why you often need more capacity
                      </div>
                      <ul className="mt-2 text-xs text-amber-900 leading-relaxed space-y-1">
                        <li>❄️ Long periods of cloudy weather (3–7 days in a row)</li>
                        <li>🌨️ Snow cover on panels reduces generation</li>
                        <li>🔋 Batteries lose usable capacity in cold (~10–20% at -10°C)</li>
                      </ul>
                    </div>

                    {/* Inverter correction */}
                    <div className="pt-2">
                      <div className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                        Inverter correction (cold climate requirements)
                      </div>
                      <div className="mt-2 overflow-x-auto rounded-xl border border-amber-200 bg-white">
                        <table className="min-w-[760px] w-full text-xs">
                          <thead className="bg-amber-50 border-b border-amber-200">
                            <tr className="text-amber-900">
                              <th className="text-left px-3 py-2 font-black">Parameter</th>
                              <th className="text-left px-3 py-2 font-black">Standard</th>
                              <th className="text-left px-3 py-2 font-black">For Scandinavia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Operating temperature</td>
                              <td className="px-3 py-2 font-mono text-slate-700">-10°C to +45°C</td>
                              <td className="px-3 py-2 font-mono text-slate-700">-25°C to +50°C</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Efficiency at low temperatures</td>
                              <td className="px-3 py-2 font-mono text-slate-700">~95%</td>
                              <td className="px-3 py-2 text-slate-700">Check specification</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Moisture protection</td>
                              <td className="px-3 py-2 font-mono text-slate-700">IP65</td>
                              <td className="px-3 py-2 text-slate-700">IP65+ (snow, rain, condensate)</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Certification</td>
                              <td className="px-3 py-2 font-mono text-slate-700">CE</td>
                              <td className="px-3 py-2 text-slate-700">CE + local standards (e.g. Svensk Elstandard)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tilt & orientation */}
                    <div className="pt-2">
                      <div className="text-[11px] font-black uppercase tracking-widest text-amber-900">
                        Tilt & orientation optimization (by latitude)
                      </div>
                      <div className="mt-2 overflow-x-auto rounded-xl border border-amber-200 bg-white">
                        <table className="min-w-[840px] w-full text-xs">
                          <thead className="bg-amber-50 border-b border-amber-200">
                            <tr className="text-amber-900">
                              <th className="text-left px-3 py-2 font-black">Location</th>
                              <th className="text-left px-3 py-2 font-black">Latitude</th>
                              <th className="text-left px-3 py-2 font-black">Optimal tilt</th>
                              <th className="text-left px-3 py-2 font-black">Orientation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100">
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Copenhagen (Denmark)</td>
                              <td className="px-3 py-2 font-mono text-slate-700">55.7°N</td>
                              <td className="px-3 py-2 font-mono text-slate-700">35–45°</td>
                              <td className="px-3 py-2 text-slate-700">South / SW</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Stockholm (Sweden)</td>
                              <td className="px-3 py-2 font-mono text-slate-700">59.3°N</td>
                              <td className="px-3 py-2 font-mono text-slate-700">40–50°</td>
                              <td className="px-3 py-2 text-slate-700">South</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Oslo (Norway)</td>
                              <td className="px-3 py-2 font-mono text-slate-700">59.9°N</td>
                              <td className="px-3 py-2 font-mono text-slate-700">40–50°</td>
                              <td className="px-3 py-2 text-slate-700">South / SE</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Helsinki (Finland)</td>
                              <td className="px-3 py-2 font-mono text-slate-700">60.2°N</td>
                              <td className="px-3 py-2 font-mono text-slate-700">45–55°</td>
                              <td className="px-3 py-2 text-slate-700">South</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-black text-slate-900">Tromsø (Norway)</td>
                              <td className="px-3 py-2 font-mono text-slate-700">69.6°N</td>
                              <td className="px-3 py-2 font-mono text-slate-700">55–65°</td>
                              <td className="px-3 py-2 text-slate-700">South (max winter generation)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 text-[11px] text-amber-900 leading-relaxed">
                        <span className="font-black">Tip:</span> for maximum annual yield, tilt ≈ local latitude. For winter-focused generation, increase tilt by +10–15°.
                      </div>
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


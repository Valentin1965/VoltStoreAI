import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product } from '../../types';
import { logCalculatorRequestToServer } from '../../services/calculatorLogService';
import {
  Calculator as CalculatorIcon,
  Zap,
  Battery,
  Sun,
  RefreshCw,
  Printer,
  Trash2,
  MapPin,
  X,
  Settings,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { getGlsPdfBrandMarkSvg, GLS_PDF_TOPBAR_BRAND_CSS } from './calculatorPdfHeader';

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

// ─── SafeChart — Recharts needs numeric px size; %/100% parent often yields width/height -1 ───
function SafeChart({ height, children }: { height: number; children: React.ReactElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rw = el.getBoundingClientRect().width;
      setW((prev) => {
        const nw = Math.max(1, Math.round(rw));
        return prev === nw ? prev : nw;
      });
    };
    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="min-w-0 w-full shrink-0"
      style={{ height, minHeight: height, width: '100%' }}
    >
      {w > 0
        ? React.cloneElement(children, { width: w, height } as Partial<{ width: number; height: number }>)
        : null}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type CalculatorResult = {
  id: string; createdAt: string; country: string;
  monthlyKwh: number; hourlyKwh: number; dailyKwh: number;
  recommendedInverterPower: number; recommendedBatteryCapacity: number;
  recommendedSolarPanels: number; estimatedCost: number; notes: string;
};

type ElectricityPriceData = { hour: string; price: number; date: string; };
type DailyPriceData = { date: string; avgPrice: number; minPrice: number; maxPrice: number; };

// ─── Regional corrections (calculator limited to DK / SE / NO) ───────────────
/** Nord Pool-style area for labels; `energiPriceArea` overrides API filter when EDS omits the zone (e.g. NO4). */
type RegionCorrection = {
  name: string;
  solarFactor: number;
  batteryBuffer: number;
  tiltBase: number;
  tiltOffset: number;
  panelOutputKwhPerDay: number;
  winterOutputPercent: number;
  label: string;
  priceZone: string | null;
  energiPriceArea?: string;
};

const SCANDINAVIA_CORRECTIONS: {
  denmark: RegionCorrection;
  sweden_south: RegionCorrection;
  sweden_north: RegionCorrection;
  norway_south: RegionCorrection;
  norway_north: RegionCorrection;
} = {
  denmark: {
    name: 'Denmark', solarFactor: 0.85, batteryBuffer: 1.25, tiltBase: 40, tiltOffset: 0,
    panelOutputKwhPerDay: 1.2, winterOutputPercent: 25, label: '🇩🇰 Denmark', priceZone: 'DK1',
  },
  /** Spot series SE3; central / southern Sweden. */
  sweden_south: {
    name: 'Sweden (South)', solarFactor: 0.80, batteryBuffer: 1.25, tiltBase: 45, tiltOffset: 0,
    panelOutputKwhPerDay: 1.1, winterOutputPercent: 20, label: '🇸🇪 Sweden (South)', priceZone: 'SE3',
  },
  /** Spot series SE4; colder climate, shorter sun hours. */
  sweden_north: {
    name: 'Sweden (North)', solarFactor: 0.65, batteryBuffer: 1.30, tiltBase: 50, tiltOffset: 10,
    panelOutputKwhPerDay: 0.9, winterOutputPercent: 15, label: '🇸🇪 Sweden (North)', priceZone: 'SE4',
  },
  norway_south: {
    name: 'Norway (South)', solarFactor: 0.75, batteryBuffer: 1.25, tiltBase: 45, tiltOffset: 0,
    panelOutputKwhPerDay: 1.0, winterOutputPercent: 20, label: '🇳🇴 Norway (South)', priceZone: 'NO2',
  },
  /** Nord Pool north = NO4. Energi Data Service Elspotprices publishes no NO4 — API queries use NO2. */
  norway_north: {
    name: 'Norway (North)', solarFactor: 0.55, batteryBuffer: 1.35, tiltBase: 55, tiltOffset: 15,
    panelOutputKwhPerDay: 0.7, winterOutputPercent: 10, label: '🇳🇴 Norway (North)',
    priceZone: 'NO4',
    energiPriceArea: 'NO2',
  },
};

type CountryKey = keyof typeof SCANDINAVIA_CORRECTIONS;

/** Legacy saves used `sweden` before split into south (SE3) / north (SE4). */
const normalizeSavedCountryKey = (ck: string): CountryKey => {
  if (ck === 'sweden') return 'sweden_south';
  if (ck in SCANDINAVIA_CORRECTIONS) return ck as CountryKey;
  return 'denmark';
};

const getEnergiApiPriceArea = (country: CountryKey): string | null => {
  const r = SCANDINAVIA_CORRECTIONS[country];
  if (!r) return null;
  return r.energiPriceArea ?? r.priceZone;
};

// ─── Energi Data Service API ─────────────────────────────────────────────────
// Dev/Cdn: Vite middleware or Vercel /api/energi-dataset-elspotprices → api.energidataservice.dk/dataset/Elspotprices
const ENERGI_BASE = '/api/energi-dataset-elspotprices';

/** yyyy-MM-dd in Europe/Copenhagen — aligns Nord Pool / Energi day boundaries (avoids UTC midnight skew). */
const fmtDate = (d: Date) =>
  d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });

type EnergiFetchOk<T> = { data: T; httpOk: boolean };

const fetchElectricityPrices = async (country: CountryKey): Promise<EnergiFetchOk<ElectricityPriceData[]>> => {
  const zone = getEnergiApiPriceArea(country);
  if (!zone) return { data: [], httpOk: true };
  try {
    const today    = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const params = new URLSearchParams({
      start:  fmtDate(today),
      end:    fmtDate(tomorrow),         // end is exclusive — must be tomorrow
      filter: JSON.stringify({ PriceArea: zone }),
      sort:   'HourUTC asc',
      limit:  '24',
    });
    const url = `${ENERGI_BASE}?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.warn('[EnergiAPI] today error:', response.status, text.slice(0, 300));
      return { data: [], httpOk: false };
    }
    const data = await response.json();
    console.log('[EnergiAPI] today records:', data.records?.length ?? 0, '| total:', data.total);
    const rows = (data.records || []).map((r: any) => ({
      hour:  new Date(r.HourDK || r.HourUTC).getHours().toString().padStart(2, '0') + ':00',
      price: parseFloat(((r.SpotPriceDKK || r.SpotPriceEUR || 0) / 1000).toFixed(4)),
      date:  fmtDate(new Date(r.HourDK || r.HourUTC)),
    }));
    return { data: rows, httpOk: true };
  } catch (err) {
    console.warn('[EnergiAPI] fetchElectricityPrices failed:', err);
    return { data: [], httpOk: false };
  }
};

const fetchHistoricalPrices = async (country: CountryKey, days = 7): Promise<EnergiFetchOk<DailyPriceData[]>> => {
  const zone = getEnergiApiPriceArea(country);
  if (!zone) return { data: [], httpOk: true };
  try {
    const end   = new Date();
    end.setDate(end.getDate() + 1);      // end is exclusive — include today
    const start = new Date();
    start.setDate(start.getDate() - days);
    const params = new URLSearchParams({
      start:  fmtDate(start),
      end:    fmtDate(end),
      filter: JSON.stringify({ PriceArea: zone }),
      sort:   'HourUTC asc',
      limit:  String(days * 25),
    });
    const url = `${ENERGI_BASE}?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.warn('[EnergiAPI] historical error:', response.status, text.slice(0, 300));
      return { data: [], httpOk: false };
    }
    const data = await response.json();
    console.log('[EnergiAPI] historical records:', data.records?.length ?? 0);
    const byDate: Record<string, number[]> = {};
    (data.records || []).forEach((r: any) => {
      const date  = fmtDate(new Date(r.HourDK || r.HourUTC));
      const price = (r.SpotPriceDKK || r.SpotPriceEUR || 0) / 1000;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(price);
    });
    const rows = Object.entries(byDate).map(([date, prices]) => ({
      date,
      avgPrice: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(4)),
      minPrice: parseFloat(Math.min(...prices).toFixed(4)),
      maxPrice: parseFloat(Math.max(...prices).toFixed(4)),
    }));
    return { data: rows, httpOk: true };
  } catch (err) {
    console.warn('[EnergiAPI] fetchHistoricalPrices failed:', err);
    return { data: [], httpOk: false };
  }
};

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'gls_calculator_results_v2';
const getCalculatorResults = (): CalculatorResult[] => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveCalculatorResult = (res: CalculatorResult) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([res, ...getCalculatorResults().filter(r=>r.id!==res.id)].slice(0,50)));
};
const deleteCalculatorResult = (id: string) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getCalculatorResults().filter(r=>r.id!==id)));
};

// ─── Spec helpers ─────────────────────────────────────────────────────────────
const specValue = (p: any, key: string): string => {
  const specs = p?.specs; if (!Array.isArray(specs)) return '';
  const found = specs.find((s: any) => String(s?.label||'').toLowerCase() === key.toLowerCase());
  return String(found?.value ?? '');
};
const getInverterKw = (p: any): number => {
  const d = Number(p.RatedPowerKw ?? p.NomPwrKw ?? p.NomOutputKw ?? p.MaxSPwr_kW);
  if (Number.isFinite(d) && d > 0) return d;
  for (const k of ['MaxSPwr_kVA','NomPwrKw','RatedPwrKw','Output Power','NomOutputKw','Rated Power','Power']) {
    const v = parseFloat(specValue(p,k));
    if (Number.isFinite(v) && v > 0) return k.toLowerCase().includes('kva') ? v*0.95 : v;
  }
  const locName = typeof p.name === 'object' && p.name != null
    ? String((p.name as Record<string, string>).en ?? (p.name as Record<string, string>).da ?? '')
    : String(p.name ?? '');
  const name: string = String(p.ModelName ?? p.BrandProd ?? locName ?? '');
  for (const re of [/(\d+(?:\.\d+)?)\s*[Kk][Ww]/,/[-_](\d+(?:\.\d+)?)[Kk][-_\s.]/,/[-_](\d+(?:\.\d+)?)[Kk]$/i,/[-_\s](\d+(?:\.\d+)?)[Kk][^Ww]/,/[A-Za-z](\d+(?:\.\d+)?)[Kk][A-Za-z-]/,/\s(\d+(?:\.\d+)?)-\d/]) {
    const m = name.match(re);
    if (m) { const v = parseFloat(m[1]); if (Number.isFinite(v) && v>0 && v<=1000) return v; }
  }
  return 0;
};
const getBatteryKwh = (p: any): number => {
  const d = Number(p.CapKwh ?? p.CapacityKwh ?? p.BattCapKwh);
  if (Number.isFinite(d) && d > 0) return d;
  for (const k of ['CapKwh','Capacity','CapacityKwh','BattCapKwh']) {
    const v = parseFloat(specValue(p,k));
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 0;
};
const getPanelWattage = (p: any): number => {
  const d = Number(p.RatedPwrWp);
  if (Number.isFinite(d) && d > 0) return d;
  const v = parseFloat(specValue(p,'RatedPwrWp'));
  return Number.isFinite(v) ? v : 0;
};

// ─── Company ──────────────────────────────────────────────────────────────────
const COMPANY_NAME = 'GREEN LIGHT Scandinavia Group';
const COMPANY_EMAIL = 'info@glsolargroup.dk';
const COMPANY_WEB = 'www.glsolargroup.dk';
const COMPANY_CONTACT = 'Katmosevej 16, Viborg 8800, Denmark';
const COMPANY_TEL = '+45 61 48 52 19';

// ─── Economic data ────────────────────────────────────────────────────────────
const ECONOMIC_DATA: Record<string, {
  pricePerKwh: number; currency: string; symbol: string; gridCO2: number;
  feedInTariff: number; subsidyPercent: number; subsidyNote: string; vatRate: number; avgSunHoursYear: number;
}> = {
  denmark:      { pricePerKwh:0.35, currency:'DKK', symbol:'kr', gridCO2:130, feedInTariff:0.09, subsidyPercent:15, subsidyNote:'Boligstøtte + net metering.',  vatRate:25, avgSunHoursYear:1100 },
  sweden_south: { pricePerKwh:0.18, currency:'SEK', symbol:'kr', gridCO2:14,  feedInTariff:0.06, subsidyPercent:20, subsidyNote:'ROT-avdrag: 30% on labor.',   vatRate:25, avgSunHoursYear:1100 },
  sweden_north: { pricePerKwh:0.12, currency:'SEK', symbol:'kr', gridCO2:14,  feedInTariff:0.04, subsidyPercent:20, subsidyNote:'ROT-avdrag: 30% on labor.',   vatRate:25, avgSunHoursYear:800  },
  norway_south: { pricePerKwh:0.20, currency:'NOK', symbol:'kr', gridCO2:24,  feedInTariff:0.10, subsidyPercent:19, subsidyNote:'Enova støtte available.',         vatRate:25, avgSunHoursYear:1000 },
  norway_north: { pricePerKwh:0.16, currency:'NOK', symbol:'kr', gridCO2:24,  feedInTariff:0.07, subsidyPercent:19, subsidyNote:'Enova støtte available.',         vatRate:25, avgSunHoursYear:750  },
};

/** User-entered tariffs for economics (same units as ECONOMIC_DATA for the region — e.g. DKK/kWh, SEK/kWh). */
type TariffOverride = { pricePerKwh?: number; feedInTariff?: number };

/** When set, Section 3 charts use flat synthetic curves from these values instead of Energi API rows. */
function tariffOverrideDrivesSection3(t: TariffOverride | undefined): t is TariffOverride {
  if (!t) return false;
  const g = t.pricePerKwh;
  const f = t.feedInTariff;
  if (g != null && Number.isFinite(g) && g > 0) return true;
  if (f != null && Number.isFinite(f) && f >= 0) return true;
  return false;
}

function buildSyntheticSection3TodayHourly(tariff: TariffOverride): ElectricityPriceData[] {
  const grid = tariff.pricePerKwh;
  const feed = tariff.feedInTariff;
  const rowPrice = grid != null && grid > 0 ? grid : feed;
  if (rowPrice == null || !Number.isFinite(rowPrice) || !(rowPrice >= 0)) return [];
  const todayStr = fmtDate(new Date());
  const out: ElectricityPriceData[] = [];
  for (let h = 0; h < 24; h++) {
    out.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      price: rowPrice,
      date: todayStr,
    });
  }
  return out;
}

function buildSyntheticSection3History(tariff: TariffOverride, days = 7): DailyPriceData[] {
  const grid = tariff.pricePerKwh;
  const feed = tariff.feedInTariff;
  const hasGrid = grid != null && Number.isFinite(grid) && grid > 0;
  const hasFeed = feed != null && Number.isFinite(feed) && feed >= 0;
  if (!hasGrid && !hasFeed) return [];
  const rows: DailyPriceData[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = fmtDate(d);
    if (hasGrid && hasFeed) {
      rows.push({
        date: dateStr,
        minPrice: Math.min(grid!, feed!),
        maxPrice: Math.max(grid!, feed!),
        avgPrice: (grid! + feed!) / 2,
      });
    } else if (hasGrid) {
      rows.push({ date: dateStr, avgPrice: grid!, minPrice: grid!, maxPrice: grid! });
    } else {
      rows.push({ date: dateStr, avgPrice: feed!, minPrice: feed!, maxPrice: feed! });
    }
  }
  return rows;
}

// ─── Economic calculator ──────────────────────────────────────────────────────
function calcEconomics(
  country: string, monthlyKwh: number, inverter: any, battery: any, panel: any, panelsNeeded: number,
  tariffOverride?: TariffOverride | null,
) {
  const ecoKey =
    country === 'sweden' ? 'sweden_south' : Object.prototype.hasOwnProperty.call(ECONOMIC_DATA, country) ? country : 'denmark';
  const ecoBase = ECONOMIC_DATA[ecoKey] || ECONOMIC_DATA.denmark;
  const pricePerKwh =
    tariffOverride != null && tariffOverride.pricePerKwh != null && Number.isFinite(tariffOverride.pricePerKwh) && tariffOverride.pricePerKwh > 0
      ? tariffOverride.pricePerKwh
      : ecoBase.pricePerKwh;
  const feedInTariff =
    tariffOverride != null && tariffOverride.feedInTariff != null && Number.isFinite(tariffOverride.feedInTariff) && tariffOverride.feedInTariff >= 0
      ? tariffOverride.feedInTariff
      : ecoBase.feedInTariff;
  const eco = { ...ecoBase, pricePerKwh, feedInTariff };
  const panelWp = Number(panel?.RatedPwrWp) || getPanelWattage(panel || {});
  const totalPvKwp = (panelWp * panelsNeeded) / 1000;
  const annualConsumption = monthlyKwh * 12;
  const annualSolarKwh = totalPvKwp * eco.avgSunHoursYear * 0.80;
  const selfConsumptionRate = annualSolarKwh > 0 ? Math.min(annualConsumption, annualSolarKwh * 0.70) / annualSolarKwh : 0;
  const selfConsumedKwh = annualSolarKwh * selfConsumptionRate;
  const exportedKwh = annualSolarKwh - selfConsumedKwh;
  const savingsFromSelfConsumption = selfConsumedKwh * eco.pricePerKwh;
  const savingsFromFeedIn = exportedKwh * eco.feedInTariff;
  const totalAnnualSavings = savingsFromSelfConsumption + savingsFromFeedIn;
  const invKw = getInverterKw(inverter);
  const invCost = Number(inverter?.PriceEurExVat ?? inverter?.price) || invKw * 200;
  const batCost = Number(battery?.PriceEurExVat ?? battery?.price) || (Number(battery?.CapKwh) || getBatteryKwh(battery || {}) || 10) * 350;
  const panelCost = Number(panel?.PriceEurExVat ?? panel?.price) || panelWp * 0.30;
  const installationCost = (invCost + batCost + panelCost * panelsNeeded) * 0.25;
  const systemCostExVat = invCost + batCost + panelCost * panelsNeeded + installationCost;
  const systemCostInVat = systemCostExVat * (1 + eco.vatRate / 100);
  const subsidyAmount = systemCostInVat * (eco.subsidyPercent / 100);
  const netCost = systemCostInVat - subsidyAmount;
  const paybackYears = totalAnnualSavings > 0 ? netCost / totalAnnualSavings : 99;
  const roi25yr = totalAnnualSavings > 0 ? ((totalAnnualSavings * 25 - netCost) / netCost) * 100 : 0;
  const co2SavedKg = (selfConsumedKwh * eco.gridCO2) / 1000;
  return {
    eco, totalPvKwp, annualSolarKwh, selfConsumedKwh, exportedKwh,
    savingsFromSelfConsumption, savingsFromFeedIn, totalAnnualSavings,
    invCost, batCost, panelCost, installationCost,
    systemCostExVat, systemCostInVat, subsidyAmount, netCost,
    paybackYears, roi25yr, co2SavedKg, annualConsumption,
    selfConsumptionRate: selfConsumptionRate * 100,
  };
}

// ─── Compatibility check types ────────────────────────────────────────────────
type CheckStatus = 'ok' | 'warn' | 'fail' | 'info';
interface CompatCheck {
  category: string; title: string; status: CheckStatus; detail: string; tip?: string;
}

function runCompatibilityChecks(inverter: any, battery: any, panel: any, panelsNeeded: number, result: CalculatorResult): CompatCheck[] {
  const checks: CompatCheck[] = [];
  const batVolt = Number(battery?.NomVoltV);
  const batKwh  = Number(battery?.CapKwh);
  const batChem: string = (battery?.BattChem || '').toLowerCase();
  const invType: string = (inverter?.InvType || '').toLowerCase();
  const invComm: string = (inverter?.CommProt || '').toLowerCase();

  if (batVolt > 0) {
    const isLV = batVolt <= 60;
    const isHybrid = invType.includes('hybrid');
    checks.push({ category:'Inverter ↔ Battery', title:'Battery voltage',
      status: isLV && !isHybrid ? 'warn' : 'ok',
      detail: `Battery ${batVolt}V — ${isLV ? 'Low-voltage' : 'High-voltage'} system.`,
      tip: isLV && !isHybrid ? 'Hybrid inverters required for LV batteries.' : undefined });
  }
  if (batChem) {
    const isLFP = batChem.includes('lifepo') || batChem.includes('lfp');
    checks.push({ category:'Inverter ↔ Battery', title:'Battery chemistry',
      status: isLFP ? 'ok' : 'info',
      detail: isLFP ? 'LiFePO₄ — Excellent for cold climates.' : `Chemistry: ${battery.BattChem}` });
  }
  if (invComm) {
    const hasCAN = invComm.includes('can'), hasRS485 = invComm.includes('rs485')||invComm.includes('modbus');
    checks.push({ category:'Inverter ↔ Battery', title:'Communication protocol',
      status: hasCAN || hasRS485 ? 'ok' : 'info',
      detail: `Inverter: ${inverter.CommProt}`,
      tip: !hasCAN && !hasRS485 ? 'Confirm BMS protocol compatibility with manufacturer.' : undefined });
  }
  if (batKwh > 0) {
    const ratio = batKwh / result.recommendedBatteryCapacity;
    checks.push({ category:'Inverter ↔ Battery', title:'Capacity match',
      status: ratio >= 0.9 ? 'ok' : 'fail',
      detail: `Battery ${batKwh} kWh covers ${Math.round(ratio*100)}% of required ${result.recommendedBatteryCapacity} kWh.`,
      tip: ratio < 0.9 ? 'Consider stacking multiple battery units.' : undefined });
  }
  const panelWp = Number(panel?.RatedPwrWp) || getPanelWattage(panel || {});
  const invKw = getInverterKw(inverter);
  if (panelWp > 0 && panelsNeeded > 0 && invKw > 0) {
    const totalPvKw = (panelWp * panelsNeeded) / 1000;
    const pvRatio = totalPvKw / invKw;
    checks.push({ category:'Inverter ↔ Solar', title:'PV array sizing',
      status: pvRatio >= 1.0 && pvRatio <= 1.5 ? 'ok' : 'warn',
      detail: `PV array: ${totalPvKw.toFixed(1)} kWp vs inverter ${invKw} kW (ratio: ${pvRatio.toFixed(2)}).`,
      tip: pvRatio > 1.5 ? 'DC oversizing above 1.5× — check inverter max PV input.' : pvRatio < 1.0 ? 'PV undersized — consider adding panels.' : undefined });
  } else if (!panelWp || !panelsNeeded) {
    checks.push({ category:'Inverter ↔ Solar', title:'Solar panels',
      status: 'info', detail: 'Solar panels not included in this configuration.' });
  }
  if (inverter?.Phases) {
    const is3 = String(inverter.Phases).toLowerCase().includes('three')||String(inverter.Phases).includes('3');
    checks.push({ category:'Inverter ↔ Solar', title:'Phase configuration',
      status: 'ok', detail: is3 ? 'Three-phase — suitable for larger installations.' : 'Single-phase — standard residential.' });
  }
  if (battery?.CycleLife) {
    const cycles = parseInt(String(battery.CycleLife).replace(/[^\d]/g,''));
    if (cycles > 0) {
      checks.push({ category:'Battery', title:'Cycle life',
        status: cycles >= 3000 ? 'ok' : cycles >= 1500 ? 'warn' : 'fail',
        detail: `Rated ${battery.CycleLife} cycles → ~${Math.round(cycles/365)} years at 1 cycle/day.`,
        tip: cycles < 3000 ? 'Aim for 3000+ cycles for solar daily-cycling.' : undefined });
    }
  }
  return checks;
}

// ─── PDF (full report) ────────────────────────────────────────────────────────
const downloadFullReportPdf = async (
  res: CalculatorResult, backupHours: number, country: CountryKey,
  advanced: { peakFactor: number; maxPower: number; invEff: number; cableLoss: number },
  matchingInverters: any[], matchingBatteries: any[], matchingSolarPanels: any[],
  includeSolar: boolean, electricityPrices?: ElectricityPriceData[], tariffOverride?: TariffOverride | null,
) => {
  const corr = SCANDINAVIA_CORRECTIONS[country] || SCANDINAVIA_CORRECTIONS.denmark;
  const dateStr = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const peakLoad = advanced.maxPower > 0 ? advanced.maxPower*1.10 : res.hourlyKwh*advanced.peakFactor*1.10;
  const sysEff = advanced.invEff*(1-advanced.cableLoss);
  const minBat = res.dailyKwh*backupHours/24/0.8*corr.batteryBuffer/sysEff*1.10;
  const invMin = Math.max(0.3, Math.ceil(peakLoad*10)/10).toFixed(1);
  const batMax = (Math.ceil(minBat*1.2*10)/10).toFixed(1);
  const esc = (s: any) => String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br/>');
  const totalPages = includeSolar ? 4 : 3;

  const inv0 = matchingInverters[0];
  const bat0 = matchingBatteries[0];
  const pan0 = matchingSolarPanels.length > 0 ? (matchingSolarPanels[0] as any).panel : null;
  const panN = matchingSolarPanels.length > 0 ? (matchingSolarPanels[0] as any).panelsNeeded : 0;
  const compatChecks = (inv0 && bat0) ? runCompatibilityChecks(inv0, bat0, pan0||{}, panN, res) : [];
  const econ = (inv0 && bat0) ? calcEconomics(country, res.monthlyKwh, inv0, bat0, pan0||{}, panN, tariffOverride) : null;

  const avgPx = electricityPrices?.length ? (electricityPrices.reduce((s,p)=>s+p.price,0)/electricityPrices.length).toFixed(4) : 'N/A';
  const minPx = electricityPrices?.length ? Math.min(...electricityPrices.map(p=>p.price)).toFixed(4) : 'N/A';
  const maxPx = electricityPrices?.length ? Math.max(...electricityPrices.map(p=>p.price)).toFixed(4) : 'N/A';

  const css = `<style>${GLS_PDF_TOPBAR_BRAND_CSS}
*{box-sizing:border-box;margin:0;padding:0;}.page{width:794px;min-height:1123px;padding:32px 44px 60px;font-family:Arial,sans-serif;color:#0f172a;background:#fff;position:relative;page-break-after:always;}.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 14px;border-radius:10px;background:#059669;color:#fff;margin-bottom:16px;}.brand{font-weight:900;font-size:20px;color:#fff;}.subtitle{margin-top:2px;font-weight:800;font-size:10px;text-transform:uppercase;color:rgba(255,255,255,.9);}.company{text-align:right;font-size:8px;font-weight:700;color:rgba(255,255,255,.95);line-height:1.5;}.sh{font-size:11px;font-weight:900;text-transform:uppercase;color:#059669;border-bottom:2px solid #059669;padding-bottom:4px;margin:14px 0 8px;}.kvg{display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;}.kvr{display:flex;justify-content:space-between;font-size:9px;padding:2px 0;border-bottom:1px solid #f1f5f9;}.kvk{color:#475569;font-weight:700;}.kvv{color:#0f172a;font-weight:900;font-family:monospace;}.cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0;}.card{border:1px solid #e2e8f0;border-radius:8px;padding:8px;}.card-lbl{font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;}.card-val{font-size:18px;font-weight:900;color:#059669;font-family:monospace;margin:2px 0;}.card-sub{font-size:8px;color:#64748b;line-height:1.3;}.rec{border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:8px 10px;margin:6px 0;}.rec h3{font-size:8px;font-weight:900;text-transform:uppercase;color:#92400e;margin-bottom:4px;}.ri{font-size:8px;color:#7c2d12;font-weight:700;line-height:1.5;margin:2px 0;}.pg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0;}.pc{border:1px solid #e2e8f0;border-radius:6px;padding:7px 9px;}.pn{font-size:9px;font-weight:900;color:#0f172a;line-height:1.2;}.ps{font-size:8px;color:#64748b;font-family:monospace;margin-top:1px;}.pp{font-size:9px;font-weight:900;color:#16a34a;font-family:monospace;margin-top:2px;}.pb{display:inline-block;font-size:7px;font-weight:900;text-transform:uppercase;padding:1px 5px;border-radius:3px;margin-top:2px;}.bi{background:#fef3c7;color:#92400e;}.bb{background:#dbeafe;color:#1e40af;}.bs{background:#dcfce7;color:#166534;}.tbl{width:100%;border-collapse:collapse;font-size:8px;margin:4px 0;}.tbl thead th{background:#f8fafc;text-align:left;padding:4px 7px;font-weight:900;border:1px solid #e2e8f0;color:#374151;}.tbl tbody td{padding:3px 7px;border:1px solid #e2e8f0;color:#0f172a;font-weight:600;}.tbl tbody tr:nth-child(even) td{background:#f8fafc;}.cr{display:flex;align-items:flex-start;gap:8px;padding:4px 7px;border-radius:6px;margin:3px 0;font-size:8px;}.cok{background:#f0fdf4;border:1px solid #bbf7d0;}.cwn{background:#fffbeb;border:1px solid #fde68a;}.cfl{background:#fef2f2;border:1px solid #fecaca;}.cin{background:#eff6ff;border:1px solid #bfdbfe;}.cd{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:1px;}.dok{background:#22c55e;}.dwn{background:#f59e0b;}.dfl{background:#ef4444;}.din{background:#60a5fa;}.eco{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0;}.ec{border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center;}.ev{font-size:16px;font-weight:900;font-family:monospace;color:#059669;}.el{font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;margin-top:1px;}.es{font-size:7px;color:#94a3b8;margin-top:1px;}.ft{position:absolute;bottom:12px;left:44px;right:44px;display:flex;justify-content:space-between;color:#94a3b8;font-size:7px;font-weight:800;border-top:1px solid #e2e8f0;padding-top:4px;}.fpb{background:#059669;color:#fff;font-size:7px;font-weight:900;padding:1px 6px;border-radius:10px;}.tg{font-size:7px;font-weight:900;padding:1px 5px;border-radius:3px;}.tgn{background:#dcfce7;color:#166534;}.tga{background:#fef3c7;color:#92400e;}.tgr{background:#fee2e2;color:#991b1b;}</style>`;

  const hdr = (sub: string, pageNum: number) => `
    <div class="topbar">
      <div class="topbar-brand">
        <div class="pdf-logo-mark">${getGlsPdfBrandMarkSvg(pageNum)}</div>
        <div class="topbar-titles">
          <div class="brand">Green Light</div>
          <div class="brand-logo-line">${esc(COMPANY_NAME)}</div>
          <div class="subtitle">${esc(sub)}</div>
        </div>
      </div>
      <div class="company">
        <b>${esc(COMPANY_WEB)}</b><br/>
        ${esc(COMPANY_CONTACT)} · ${esc(COMPANY_TEL)}<br/>
        ${esc(dateStr)}
      </div>
    </div>`;
  const ftr = (n: number) => `<div class="ft"><div>${esc(COMPANY_NAME)} · ${esc(corr.label)}</div><div><span class="fpb">Page ${n} / ${totalPages}</span></div></div>`;

  const neededEnergy = res.dailyKwh*(backupHours/24);
  const afterDoD = neededEnergy/0.8;
  const afterCold = afterDoD*corr.batteryBuffer;

  const renderProd = (p: any, type: 'inv'|'bat'|'sol', extra: string) => {
    const name = `${p.BrandProd||''} ${p.ModelName||''}`.trim();
    const pe = Number(p.PriceEurExVat ?? p.price);
    const price = pe > 0 ? `€ ${pe.toLocaleString('nl-NL')}` : '';
    const badge = type==='inv'?'bi':type==='bat'?'bb':'bs';
    const lbl = type==='inv'?'Inverter':type==='bat'?'Battery':'Solar';
    return `<div class="pc"><span class="pb ${badge}">${lbl}</span><div class="pn">${esc(name)}</div><div class="ps">${esc(extra)}</div>${price?`<div class="pp">${price} excl. VAT</div>`:''}</div>`;
  };

  const compatRowCls = (s: CheckStatus) => (s === 'ok' ? 'cok' : s === 'warn' ? 'cwn' : s === 'fail' ? 'cfl' : 'cin');
  const compatDotCls = (s: CheckStatus) => (s === 'ok' ? 'dok' : s === 'warn' ? 'dwn' : s === 'fail' ? 'dfl' : 'din');
  const compatDot = (s: CheckStatus) => `<div class="cd ${compatDotCls(s)}"></div>`;
  const compatRow = (c: CompatCheck) => `<div class="cr ${compatRowCls(c.status)}">${compatDot(c.status)}<div style="flex:1"><div style="font-weight:900">[${c.category}] ${c.title}</div><div style="color:#374151">${esc(c.detail)}</div>${c.tip?`<div style="font-size:7px;color:#6b7280">💡 ${esc(c.tip)}</div>`:''}</div><span class="tg ${c.status==='ok'?'tgn':c.status==='warn'?'tga':c.status==='fail'?'tgr':'tgn'}">${c.status==='ok'?'PASS':c.status.toUpperCase()}</span></div>`;

  const page1 = `${hdr('Full Report · Section 1 — Theoretical Requirements', 1)}
<div class="sh">Input Parameters</div>
<div class="kvg">
  <div><div class="kvr"><span class="kvk">Monthly consumption</span><span class="kvv">${res.monthlyKwh} kWh/month</span></div><div class="kvr"><span class="kvk">Daily consumption</span><span class="kvv">${res.dailyKwh.toFixed(2)} kWh/day</span></div><div class="kvr"><span class="kvk">Average hourly load</span><span class="kvv">${res.hourlyKwh.toFixed(3)} kW</span></div><div class="kvr"><span class="kvk">Backup duration</span><span class="kvv">${backupHours} hours</span></div></div>
  <div><div class="kvr"><span class="kvk">Region</span><span class="kvv">${corr.label}</span></div><div class="kvr"><span class="kvk">Solar factor</span><span class="kvv">×${corr.solarFactor}</span></div><div class="kvr"><span class="kvk">Battery cold buffer</span><span class="kvv">×${corr.batteryBuffer}</span></div><div class="kvr"><span class="kvk">System efficiency</span><span class="kvv">${(sysEff*100).toFixed(0)}%</span></div></div>
</div>
${corr.priceZone && electricityPrices?.length ? `<div class="sh">Real-Time Electricity Prices (${corr.label})</div><div class="kvg"><div class="kvr"><span class="kvk">Avg price today</span><span class="kvv">${avgPx} /kWh</span></div><div class="kvr"><span class="kvk">Min / Max</span><span class="kvv">${minPx} / ${maxPx}</span></div></div>` : ''}
<div class="sh">Recommended Components</div>
<div class="cards">
  <div class="card"><div class="card-lbl">Inverter Power</div><div class="card-val">${res.recommendedInverterPower} kW</div><div class="card-sub">Peak: ${peakLoad.toFixed(3)} kW · +10%<br/>Range: ${invMin}–${(parseFloat(invMin)+0.5).toFixed(1)} kW</div></div>
  <div class="card"><div class="card-lbl">Battery Capacity</div><div class="card-val">${res.recommendedBatteryCapacity} kWh</div><div class="card-sub">DoD 80% · Cold ×${corr.batteryBuffer}<br/>Range: ${res.recommendedBatteryCapacity}–${batMax} kWh</div></div>
  ${includeSolar ? `<div class="card"><div class="card-lbl">Solar Panels</div><div class="card-val">${res.recommendedSolarPanels}×</div><div class="card-sub">450W panels<br/>${(corr.panelOutputKwhPerDay*(corr.winterOutputPercent/100)).toFixed(2)} kWh/panel/day (winter)</div></div>` : ''}
</div>
<div class="sh">Calculation Method</div>
<table class="tbl"><thead><tr><th>Parameter</th><th>Formula</th><th>Result</th></tr></thead><tbody>
  <tr><td>Peak load</td><td>${advanced.maxPower>0?`Max power ${advanced.maxPower} kW × 1.10`:`Avg ${res.hourlyKwh.toFixed(3)} kW × ${advanced.peakFactor} × 1.10`}</td><td>${peakLoad.toFixed(3)} kW</td></tr>
  <tr><td>Min inverter</td><td>Peak load with 10% headroom</td><td>${res.recommendedInverterPower} kW</td></tr>
  <tr><td>Energy for backup</td><td>${res.dailyKwh.toFixed(2)} × ${backupHours}h/24</td><td>${neededEnergy.toFixed(2)} kWh</td></tr>
  <tr><td>After DoD 80%</td><td>${neededEnergy.toFixed(2)} ÷ 0.80</td><td>${afterDoD.toFixed(2)} kWh</td></tr>
  <tr><td>After cold factor</td><td>${afterDoD.toFixed(2)} × ${corr.batteryBuffer}</td><td>${afterCold.toFixed(2)} kWh</td></tr>
  <tr><td>After system eff</td><td>${afterCold.toFixed(2)} ÷ ${(sysEff*100).toFixed(0)}%</td><td>${(afterCold/sysEff).toFixed(2)} kWh</td></tr>
  <tr><td><b>Min battery</b></td><td>${(afterCold/sysEff).toFixed(2)} × 1.10</td><td><b>${res.recommendedBatteryCapacity} kWh</b></td></tr>
  ${includeSolar?`<tr><td><b>Solar panels</b></td><td>${(res.dailyKwh*1.2).toFixed(2)} kWh ÷ ${(corr.panelOutputKwhPerDay*(corr.winterOutputPercent/100)).toFixed(2)} kWh/panel</td><td><b>${res.recommendedSolarPanels} × 450W</b></td></tr>`:''}
</tbody></table>
<div class="rec"><h3>Practical Recommendations</h3>
  <div class="ri">▸ <b>Inverter:</b> ≥ ${invMin} kW. Range ${invMin}–${(parseFloat(invMin)+0.5).toFixed(1)} kW. Consider higher surge for motor loads.</div>
  <div class="ri">▸ <b>Battery:</b> ${res.recommendedBatteryCapacity}–${batMax} kWh. LiFePO₄ for cold climates (–25°C).</div>
  ${includeSolar?`<div class="ri">▸ <b>Solar (${corr.label}):</b> ${res.recommendedSolarPanels} × 450W. Winter ~${corr.winterOutputPercent}% of summer. Tilt: ${corr.tiltBase}°.</div>`:''}
</div>
${res.notes?`<div class="sh">Notes</div><div style="font-size:9px;padding:6px 8px;border:1px dashed #cbd5e1;border-radius:6px;">${esc(res.notes)}</div>`:''}
${ftr(1)}`;

  const invCards = matchingInverters.slice(0,4).map(p=>renderProd(p,'inv',`${getInverterKw(p)} kW · ${p.InvType||''} · ${p.Phases||''}`)).join('');
  const batCards = matchingBatteries.slice(0,4).map(p=>renderProd(p,'bat',`${p.CapKwh||''} kWh · ${p.BattChem||''} · ${p.NomVoltV||''}V`)).join('');
  const solCards = includeSolar ? matchingSolarPanels.slice(0,4).map((item:any)=>renderProd(item.panel,'sol',`${item.wattage} Wp · ${item.panel.CellTech||''} · ×${item.panelsNeeded} needed`)).join('') : '';

  const page2 = `${hdr('Full Report · Section 2 — Matching Products from Catalog', 2)}
<div class="sh">Inverters — ≥ ${res.recommendedInverterPower} kW (${matchingInverters.length} found)</div>
<div class="pg">${invCards||'<div style="font-size:8px;color:#94a3b8;padding:8px">No matching inverters found.</div>'}</div>
${matchingInverters.length>4?`<div style="font-size:8px;color:#94a3b8;text-align:center">+ ${matchingInverters.length-4} more</div>`:''}
<div class="sh">Batteries — ≥ ${res.recommendedBatteryCapacity} kWh (${matchingBatteries.length} found)</div>
<div class="pg">${batCards||'<div style="font-size:8px;color:#94a3b8;padding:8px">No matching batteries found.</div>'}</div>
${matchingBatteries.length>4?`<div style="font-size:8px;color:#94a3b8;text-align:center">+ ${matchingBatteries.length-4} more</div>`:''}
${includeSolar?`<div class="sh">Solar Panels — Winter Sizing (${matchingSolarPanels.length} found)</div><div class="pg">${solCards||'<div style="font-size:8px;color:#94a3b8;padding:8px">No solar panels found.</div>'}</div>`:'<div style="font-size:8px;color:#94a3b8;padding:6px;border:1px dashed #e2e8f0;border-radius:6px;">Solar panel calculation not included.</div>'}
${ftr(2)}`;

  const page3 = `${hdr('Full Report · Section 3 — Compatibility & Economic Analysis', 3)}
${compatChecks.length>0?`<div class="sh">Compatibility — ${inv0?.BrandProd} ${inv0?.ModelName} + ${bat0?.BrandProd} ${bat0?.ModelName}</div>${compatChecks.map(compatRow).join('')}`:'<div style="font-size:8px;color:#94a3b8;padding:8px">No matching products for compatibility check.</div>'}
${econ?`<div class="sh">Economic Analysis — ${corr.label} · ${econ.eco.symbol}${econ.eco.pricePerKwh}/kWh</div>
<div class="eco">
  <div class="ec"><div class="ev">${Math.round(econ.annualSolarKwh)} kWh</div><div class="el">Annual solar gen.</div><div class="es">${econ.totalPvKwp.toFixed(1)} kWp system</div></div>
  <div class="ec"><div class="ev">€${Math.round(econ.totalAnnualSavings)}</div><div class="el">Annual savings</div><div class="es">self-use + feed-in</div></div>
  <div class="ec"><div class="ev">${econ.paybackYears<99?econ.paybackYears.toFixed(1):'—'} yr</div><div class="el">Payback period</div><div class="es">${Math.round(econ.roi25yr)}% ROI/25yr</div></div>
</div>
<table class="tbl"><thead><tr><th>Cost item</th><th>Amount</th></tr></thead><tbody>
  <tr><td>Inverter</td><td>€ ${Math.round(econ.invCost).toLocaleString('nl-NL')}</td></tr>
  <tr><td>Battery</td><td>€ ${Math.round(econ.batCost).toLocaleString('nl-NL')}</td></tr>
  <tr><td>Solar panels (×${panN})</td><td>€ ${Math.round(econ.panelCost*panN).toLocaleString('nl-NL')}</td></tr>
  <tr><td>Installation (25%)</td><td>€ ${Math.round(econ.installationCost).toLocaleString('nl-NL')}</td></tr>
  <tr><td>Total incl. ${econ.eco.vatRate}% VAT</td><td>€ ${Math.round(econ.systemCostInVat).toLocaleString('nl-NL')}</td></tr>
  ${econ.subsidyAmount>0?`<tr><td>Subsidy (${econ.eco.subsidyPercent}%)</td><td>− € ${Math.round(econ.subsidyAmount).toLocaleString('nl-NL')}</td></tr>`:''}
</tbody></table>
<div style="display:flex;justify-content:space-between;font-weight:900;font-size:10px;padding:5px 8px;background:#fff8f4;border-radius:6px;margin-top:4px;"><span>Net investment</span><span style="color:#059669">€ ${Math.round(econ.netCost).toLocaleString('nl-NL')}</span></div>
<div style="font-size:7px;color:#94a3b8;margin-top:4px;">${esc(econ.eco.subsidyNote)}</div>
<div style="margin-top:6px;padding:5px 8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:8px;color:#166534;">🌿 CO₂ saved: ${Math.round(econ.co2SavedKg)} kg/year = ${(econ.co2SavedKg/210).toFixed(1)} flights Amsterdam→Oslo</div>`:''}
${ftr(3)}`;

  const page4 = includeSolar ? `${hdr('Full Report · Section 4 — Solar Reference', 4)}
<div class="sh">Solar Yield Reference (450W Panel per Region)</div>
<table class="tbl"><thead><tr><th>Region</th><th>Summer kWh/day</th><th>Winter kWh/day</th><th>Annual avg</th><th>Optimal tilt</th></tr></thead><tbody>
  <tr><td>🇩🇰 Denmark</td><td>2.0–3.0</td><td>0.2–0.5</td><td>0.9–1.5</td><td>40°</td></tr>
  <tr><td>🇸🇪 Sweden (South)</td><td>2.2–3.2</td><td>0.2–0.5</td><td>0.9–1.5</td><td>45°</td></tr>
  <tr><td>🇸🇪 Sweden (North)</td><td>1.6–2.6</td><td>0.15–0.45</td><td>0.65–1.2</td><td>50°</td></tr>
  <tr><td>🇳🇴 Norway (South)</td><td>2.0–3.0</td><td>0.1–0.4</td><td>0.7–1.3</td><td>45°</td></tr>
  <tr><td>🇳🇴 Norway (North)</td><td>2.5–4.5</td><td>0.0–0.1</td><td>0.4–0.9</td><td>55°</td></tr>
</tbody></table>
<div class="sh">Cold Climate Requirements</div>
<table class="tbl"><thead><tr><th>Parameter</th><th>Standard</th><th>Nordic / Scandinavia</th></tr></thead><tbody>
  <tr><td>Operating temp</td><td>–10°C to +45°C</td><td>–25°C to +50°C</td></tr>
  <tr><td>Battery chemistry</td><td>NMC</td><td>LiFePO₄ recommended</td></tr>
  <tr><td>IP rating</td><td>IP65</td><td>IP65+ with condensation protection</td></tr>
  <tr><td>Panel tilt</td><td>10–30°</td><td>35–60° for snow sliding</td></tr>
</tbody></table>
<div class="rec" style="margin-top:8px;"><h3>Next Steps</h3>
  <div class="ri">1. Review compatibility results and address any warnings</div>
  <div class="ri">2. Select specific models from the matching products list</div>
  <div class="ri">3. Request final quotation · ${esc(COMPANY_EMAIL)}</div>
  <div class="ri">4. Schedule site assessment and installation</div>
</div>
${ftr(4)}` : '';

  const allPages = [page1, page2, page3, ...(includeSolar ? [page4] : [])];
  // Inject CSS into <head> so it applies globally (not just inside container)
  const styleEl = document.createElement('style');
  styleEl.id = '__zk_pdf_styles';
  styleEl.textContent = css.replace(/<\/?style>/g, '');
  document.head.appendChild(styleEl);

  // Place container at (0,0) but invisible — html2canvas requires element to be in viewport
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:99999;opacity:0;pointer-events:none;overflow:hidden;';
  container.innerHTML = allPages.map(p=>`<div class="page" style="width:794px;min-height:1123px;padding:32px 44px 60px;font-family:Arial,sans-serif;color:#0f172a;background:#ffffff;position:relative;">${p}</div>`).join('');
  document.body.appendChild(container);

  try {
    const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
    const { jsPDF: JPDF } = await import('jspdf');
    const h2c = (await import('html2canvas')).default;
    const doc = new JPDF({ unit:'mm', format:'a4' });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await h2c(pages[i], {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 794,
        windowWidth: 794,
      });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');
      if (i < pages.length-1) doc.addPage();
    }
    doc.save(`GREEN-LIGHT-FullReport-${country}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    document.body.removeChild(container);
    document.head.removeChild(styleEl);
  }
};

// ─── Kit PDF ──────────────────────────────────────────────────────────────────
const downloadKitPdf = async (
  inv: any, bat: any, panel: any|null, panelsNeeded: number,
  result: CalculatorResult, country: CountryKey,
  solarInstallType: string, solarAzimuth: number, solarTilt: number,
  roofArea: string, includeSolar: boolean, tariffOverride?: TariffOverride | null,
) => {
  const corr = SCANDINAVIA_CORRECTIONS[country] || SCANDINAVIA_CORRECTIONS.denmark;
  const eco  = calcEconomics(country, result.monthlyKwh, inv, bat, panel||{}, panelsNeeded, tariffOverride);
  const dateStr = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const esc = (s:any) => String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const eur = (n:number) => `€ ${Math.round(n).toLocaleString('nl-NL')}`;
  const fmt = (n:number, d=0) => n.toFixed(d);

  const invKw    = getInverterKw(inv);
  const batKwh   = getBatteryKwh(bat) || Number(bat.CapKwh) || 0;
  const panWp    = panel ? (Number(panel.RatedPwrWp)||getPanelWattage(panel)) : 0;
  const totalKwp = (panWp * panelsNeeded) / 1000;

  // Derived values for accurate display
  const areaUsed   = panelsNeeded > 0 ? (panelsNeeded * 1.75).toFixed(1) : '—';
  const areaAvail  = roofArea || '—';
  const invActualKw = getInverterKw(inv).toString();
  const batActualKwh = String(getBatteryKwh(bat) || Number(bat.CapKwh) || 0);

  const azLabels: Record<number,string> = { 0:'South ×1.00', '-45':'South-East ×0.95', '45':'South-West ×0.95', '-90':'East ×0.80', '90':'West ×0.80', '180':'North ×0.45' };
  const azLabel  = azLabels[solarAzimuth] || `${solarAzimuth}°`;
  const installLabels: Record<string,string> = { roof_pitched:'🏠 Pitched Roof', roof_flat:'🏢 Flat Roof', ground:'🌿 Ground Mount' };
  const installLabel = installLabels[solarInstallType] || solarInstallType;

  const invPrice = Number(inv.PriceEurExVat ?? inv.price) || invKw*200;
  const batPrice = Number(bat.PriceEurExVat ?? bat.price) || batKwh*350;
  const panPrice = panel ? (Number(panel.PriceEurExVat ?? panel.price) || panWp*0.30) : 0;
  const panTotal = panPrice * panelsNeeded;
  const install  = (invPrice + batPrice + panTotal) * 0.25;
  const subtotal = invPrice + batPrice + panTotal + install;
  const vat      = subtotal * (eco.eco.vatRate/100);
  const total    = subtotal + vat;
  const subsidy  = total * (eco.eco.subsidyPercent/100);
  const net      = total - subsidy;

  const css = `<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;color:#0f172a;background:#fff;}.page{width:794px;min-height:1123px;padding:36px 48px 60px;position:relative;}.topbar{display:flex;justify-content:space-between;align-items:flex-start;padding:12px 16px;border-radius:12px;background:#059669;color:#fff;margin-bottom:20px;}.brand{font-size:22px;font-weight:900;letter-spacing:-1px;}.sub{font-size:10px;font-weight:800;text-transform:uppercase;color:rgba(255,255,255,.9);margin-top:2px;}.meta{text-align:right;font-size:8px;font-weight:700;color:rgba(255,255,255,.9);line-height:1.6;}.sh{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#059669;border-bottom:2px solid #059669;padding-bottom:4px;margin:16px 0 8px;}.comp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:8px 0;}.comp-card{border:1px solid #e2e8f0;border-radius:10px;padding:12px;}.comp-badge{display:inline-block;font-size:7px;font-weight:900;text-transform:uppercase;padding:2px 6px;border-radius:3px;margin-bottom:6px;}.bi{background:#fef3c7;color:#92400e;}.bb{background:#dbeafe;color:#1e40af;}.bs{background:#dcfce7;color:#166534;}.comp-name{font-size:11px;font-weight:900;color:#0f172a;line-height:1.2;margin-bottom:2px;}.comp-kv{display:flex;justify-content:space-between;font-size:8px;padding:1.5px 0;border-bottom:1px solid #f8fafc;}.comp-k{color:#64748b;font-weight:700;}.comp-v{font-family:monospace;font-weight:900;color:#0f172a;}.comp-price{margin-top:6px;font-size:11px;font-weight:900;color:#16a34a;font-family:monospace;}.sol-box{border:1px solid #fde68a;background:#fffbeb;border-radius:8px;padding:10px 12px;margin:8px 0;}.sol-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;}.cost-row{display:flex;justify-content:space-between;font-size:9px;padding:3px 8px;border-bottom:1px solid #f1f5f9;}.cost-k{color:#475569;font-weight:700;}.cost-v{font-family:monospace;font-weight:900;}.cost-sub{background:#f8fafc;}.cost-total{display:flex;justify-content:space-between;font-size:12px;font-weight:900;padding:6px 8px;background:#fff8f4;border-radius:6px;margin-top:4px;}.kpi-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:8px 0;}.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:8px;text-align:center;}.kpi-val{font-size:16px;font-weight:900;font-family:monospace;color:#059669;}.kpi-lbl{font-size:7px;font-weight:900;text-transform:uppercase;color:#64748b;margin-top:2px;}.footer{position:absolute;bottom:14px;left:48px;right:48px;display:flex;justify-content:space-between;color:#94a3b8;font-size:7px;font-weight:800;border-top:1px solid #e2e8f0;padding-top:5px;}.stamp{display:inline-block;border:2px solid #22c55e;color:#16a34a;font-size:9px;font-weight:900;text-transform:uppercase;padding:2px 8px;border-radius:4px;letter-spacing:1px;}</style>`;

  const html = `
  <div class="page">
    <div class="topbar">
      <div><div class="brand">Green Light</div><div class="sub">Optimal System Kit · ${esc(corr.label)}</div></div>
      <div class="meta"><b>${esc(COMPANY_NAME)}</b><br/>${esc(COMPANY_WEB)}<br/>${esc(dateStr)}</div>
    </div>

    <div class="sh">System Requirements (Input)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 24px">
      ${[
        ['Monthly consumption', `${result.monthlyKwh} kWh/month`],
        ['Region', corr.label],
        // Show ACTUAL selected component values, not minimum requirements
        ['Inverter (selected)', `${invActualKw} kW (min. ≥ ${result.recommendedInverterPower} kW)`],
        ['Battery (selected)', `${batActualKwh} kWh (min. ≥ ${result.recommendedBatteryCapacity} kWh)`],
        includeSolar && panel ? ['Solar panels (selected)', `${panelsNeeded} × ${panWp}W = ${((panWp*panelsNeeded)/1000).toFixed(1)} kWp`] : null,
        includeSolar ? ['Installation type', installLabel] : null,
        includeSolar && roofArea ? ['Available area', `${areaAvail} m²`] : null,
        includeSolar && panelsNeeded > 0 ? ['Area used by panels', `${areaUsed} m² (${panelsNeeded} × 1.75 m²/panel)`] : null,
        includeSolar ? ['Orientation', azLabel] : null,
        includeSolar && solarInstallType !== 'roof_pitched' ? ['Tilt angle', `${solarTilt}°`] : null,
      ].filter(Boolean).map(([k,v]) => `<div class="cost-row"><span class="cost-k">${esc(k)}</span><span class="cost-v">${esc(v)}</span></div>`).join('')}
    </div>

    <div class="sh">Selected Components</div>
    <div class="comp-grid">
      <div class="comp-card">
        <span class="comp-badge bi">Inverter</span>
        <div class="comp-name">${esc(inv.BrandProd)} ${esc(inv.ModelName)}</div>
        ${[
          ['Power', `${invKw} kW`],
          ['Type', inv.InvType||'—'],
          ['Phases', inv.Phases||'—'],
          ['Max eff', inv.MaxEffPerc ? `${inv.MaxEffPerc}%` : '—'],
          ['MPPT', inv.NumMppts ? `${inv.NumMppts}× ${inv.MpptVoltRangeV||''}` : '—'],
          ['IP rating', inv.IpRating||'—'],
          ['Communication', inv.CommProt||'—'],
        ].map(([k,v]) => `<div class="comp-kv"><span class="comp-k">${k}</span><span class="comp-v">${esc(v)}</span></div>`).join('')}
        <div class="comp-price">${invPrice ? eur(invPrice) + ' excl. VAT' : 'Price on request'}</div>
      </div>
      <div class="comp-card">
        <span class="comp-badge bb">Battery</span>
        <div class="comp-name">${esc(bat.BrandProd)} ${esc(bat.ModelName)}</div>
        ${[
          ['Capacity', `${batKwh} kWh`],
          ['Chemistry', bat.BattChem||'—'],
          ['Voltage', bat.NomVoltV ? `${bat.NomVoltV}V` : '—'],
          ['Cycles', bat.CycleLife||'—'],
          ['Scalable', bat.Scalab||'—'],
          ['Op. temp', bat.OpTempC||'—'],
          ['Certif.', bat.BattCert||'—'],
        ].map(([k,v]) => `<div class="comp-kv"><span class="comp-k">${k}</span><span class="comp-v">${esc(v)}</span></div>`).join('')}
        <div class="comp-price">${batPrice ? eur(batPrice) + ' excl. VAT' : 'Price on request'}</div>
      </div>
    </div>

    ${includeSolar && panel ? `
    <div class="comp-grid" style="grid-template-columns:1fr">
      <div class="comp-card">
        <span class="comp-badge bs">Solar Panels × ${panelsNeeded}</span>
        <div class="comp-name">${esc(panel.BrandProd)} ${esc(panel.ModelName)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0">
          ${[
            ['Rated power', `${panWp} Wp`],
            ['Cell tech', panel.CellTech||'—'],
            ['Module eff', panel.ModEffPerc ? `${panel.ModEffPerc}%` : '—'],
            ['Panels needed', `${panelsNeeded} units`],
            ['Total array', `${fmt(totalKwp,1)} kWp`],
            ['Install type', installLabel],
            ['Orientation', azLabel],
            solarInstallType !== 'roof_pitched' ? ['Tilt', `${solarTilt}°`] : ['Optimal tilt', `${corr.tiltBase}°`],
            roofArea ? ['Available area', `${areaAvail} m²`] : null,
            panelsNeeded > 0 ? ['Area used', `${areaUsed} m² of ${areaAvail} m²`] : null,
            panel.ProdWarrYrs ? ['Prod. warranty', `${panel.ProdWarrYrs} yr`] : null,
          ].filter(Boolean).map(([k,v]) => `<div class="comp-kv"><span class="comp-k">${k}</span><span class="comp-v">${esc(v as string)}</span></div>`).join('')}
        </div>
        <div class="comp-price">${panPrice ? eur(panPrice) + ' each · ' + eur(panTotal) + ' total excl. VAT' : 'Price on request'}</div>
      </div>
    </div>
    ` : ''}

    <div class="sh">Kit Pricing</div>
    ${[
      ['Inverter', inv.BrandProd+' '+inv.ModelName, eur(invPrice)],
      ['Battery', bat.BrandProd+' '+bat.ModelName, eur(batPrice)],
      ...(includeSolar && panel ? [[`Solar panels ×${panelsNeeded}`, panel.BrandProd+' '+panel.ModelName, eur(panTotal)]] : []),
      ['Installation (est. 25%)', 'Labour, cabling, mounting', eur(install)],
    ].map(([k,n,v]) => `<div class="cost-row"><div><div class="cost-k">${esc(k)}</div><div style="font-size:7px;color:#94a3b8">${esc(n)}</div></div><span class="cost-v">${v}</span></div>`).join('')}
    <div class="cost-row cost-sub"><span class="cost-k">Subtotal excl. VAT</span><span class="cost-v">${eur(subtotal)}</span></div>
    <div class="cost-row cost-sub"><span class="cost-k">VAT ${eco.eco.vatRate}%</span><span class="cost-v">${eur(vat)}</span></div>
    ${subsidy > 0 ? `<div class="cost-row" style="background:#f0fdf4"><span class="cost-k" style="color:#166534">Government subsidy (${eco.eco.subsidyPercent}%)</span><span class="cost-v" style="color:#16a34a">− ${eur(subsidy)}</span></div>` : ''}
    <div class="cost-total"><span>Net investment after subsidy</span><span style="color:#059669">${eur(net)}</span></div>
    ${eco.eco.subsidyNote ? `<div style="font-size:7px;color:#94a3b8;margin-top:4px">📋 ${esc(eco.eco.subsidyNote)}</div>` : ''}

    <div class="sh">Economic Summary</div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-val">€${Math.round(eco.totalAnnualSavings).toLocaleString()}</div><div class="kpi-lbl">Annual Savings</div></div>
      <div class="kpi"><div class="kpi-val">${eco.paybackYears<99 ? fmt(eco.paybackYears,1) : '—'} yr</div><div class="kpi-lbl">Payback Period</div></div>
      <div class="kpi"><div class="kpi-val">${Math.round(eco.roi25yr)}%</div><div class="kpi-lbl">ROI / 25yr</div></div>
      <div class="kpi"><div class="kpi-val">${Math.round(eco.co2SavedKg)} kg</div><div class="kpi-lbl">CO₂ Saved/yr</div></div>
    </div>

    <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;">
      <span class="stamp">✓ Optimal Configuration</span>
      <div style="text-align:right;font-size:8px;color:#64748b">Prepared by ${esc(COMPANY_NAME)} · ${esc(COMPANY_EMAIL)} · ${esc(COMPANY_WEB)}</div>
    </div>

    <div class="footer">
      <span>${esc(COMPANY_NAME)} — Professional Solar Equipment · ${esc(corr.label)}</span>
      <span>Prices excl. VAT unless stated. Estimates based on catalog data.</span>
    </div>
  </div>`;

  // Inject CSS into <head>
  const kitStyleEl = document.createElement('style');
  kitStyleEl.id = '__zk_kit_styles';
  kitStyleEl.textContent = css.replace(/<\/?style>/g, '');
  document.head.appendChild(kitStyleEl);

  // Render at (0,0) invisible — required by html2canvas
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:99999;opacity:0;pointer-events:none;overflow:hidden;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const { jsPDF: JPDF } = await import('jspdf');
    const h2c = (await import('html2canvas')).default;
    const el = container.firstElementChild as HTMLElement;
    const canvas = await h2c(el, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 794,
      windowWidth: 794,
    });
    const doc = new JPDF({ unit:'mm', format:'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    doc.save(`GREEN-LIGHT-Kit-${country}-${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    document.body.removeChild(container);
    document.head.removeChild(kitStyleEl);
  }
};

// ─── Kit Modal ────────────────────────────────────────────────────────────────
interface KitModalProps {
  inverters: any[]; batteries: any[]; solarPanels: any[];
  matchingInverters: any[]; matchingBatteries: any[]; matchingSolarPanels: any[];
  result: CalculatorResult; country: CountryKey; includeSolar: boolean;
  solarInstallType: string; solarAzimuth: number; solarTilt: number; roofArea: string;
  tariffOverride?: TariffOverride | null;
  onClose: () => void;
}

function KitModal({ matchingInverters, matchingBatteries, matchingSolarPanels, result, country, includeSolar, solarInstallType, solarAzimuth, solarTilt, roofArea, tariffOverride, onClose }: KitModalProps) {
  const [selInv, setSelInv] = React.useState(0);
  const [selBat, setSelBat] = React.useState(0);
  const [selSol, setSelSol] = React.useState(0);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const inv = matchingInverters[selInv];
  const bat = matchingBatteries[selBat];
  const solItem = matchingSolarPanels[selSol] as any;
  const panel = solItem?.panel || null;
  const panelsNeeded = solItem?.panelsNeeded || 0;
  const corr = SCANDINAVIA_CORRECTIONS[country];

  const econ = inv && bat ? calcEconomics(country, result.monthlyKwh, inv, bat, panel||{}, panelsNeeded, tariffOverride) : null;

  const invKw  = inv  ? getInverterKw(inv)         : 0;
  const batKwh = bat ? (getBatteryKwh(bat) || Number(bat.CapKwh) || 0) : 0;
  const panWp  = panel ? (Number(panel.RatedPwrWp)||getPanelWattage(panel)) : 0;

  const invPrice = inv ? (Number(inv.PriceEurExVat ?? inv.price) || invKw*200) : 0;
  const batPrice = bat ? (Number(bat.PriceEurExVat ?? bat.price) || batKwh*350) : 0;
  const panPrice = panel ? (Number(panel.PriceEurExVat ?? panel.price) || panWp*0.30) : 0;
  const panTotal = panPrice * panelsNeeded;
  const install  = (invPrice + batPrice + panTotal) * 0.25;
  const subtotal = invPrice + batPrice + panTotal + install;
  const totalVat = subtotal * (1 + (econ?.eco.vatRate||21)/100);
  const subsidy  = totalVat * ((econ?.eco.subsidyPercent||0)/100);
  const net      = totalVat - subsidy;
  const eur = (n:number) => `€ ${Math.round(n).toLocaleString('nl-NL')}`;

  const azLabels: Record<number,string> = { 0:'South','-45':'South-East','45':'South-West','-90':'East','90':'West','180':'North' };
  const installLabels: Record<string,string> = { roof_pitched:'Pitched Roof', roof_flat:'Flat Roof', ground:'Ground Mount' };

  if (!inv || !bat) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.6)'}} onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 text-center shadow-2xl mx-4">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="font-black text-slate-800">No matching components found</div>
        <div className="text-sm text-slate-500 mt-1">Run the calculator first to get recommendations</div>
        <button onClick={onClose} className="mt-4 px-5 py-2 rounded-xl bg-[#059669] text-white text-xs font-black uppercase">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center" style={{background:'rgba(0,0,0,0.65)',paddingTop:24,paddingBottom:24}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col" style={{maxHeight:'calc(100vh - 48px)'}}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="text-[#059669]">⚡</span> Optimal System Kit
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Select components and generate quotation PDF · {corr?.label}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"><X className="h-4 w-4 text-slate-500"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Component selectors */}
          {[
            { label:'⚡ Inverter', color:'amber', items:matchingInverters, sel:selInv, setSel:setSelInv,
              sub:(p:any)=>`${getInverterKw(p)} kW · ${p.InvType||''} · ${p.Phases||''}`,
              price:(p:any)=>Number(p.PriceEurExVat ?? p.price) || getInverterKw(p)*200 },
            { label:'🔋 Battery', color:'blue', items:matchingBatteries, sel:selBat, setSel:setSelBat,
              sub:(p:any)=>`${p.CapKwh||''} kWh · ${p.BattChem||''} · ${p.NomVoltV||''}V`,
              price:(p:any)=>Number(p.PriceEurExVat ?? p.price) || (Number(p.CapKwh)||getBatteryKwh(p)||10)*350 },
            ...(includeSolar && matchingSolarPanels.length > 0 ? [
              { label:'☀️ Solar Panel', color:'green', items:matchingSolarPanels, sel:selSol, setSel:setSelSol,
                sub:(item:any)=>`${item.wattage} Wp · ${item.panel.CellTech||''} · ×${item.panelsNeeded} panels needed`,
                price:(item:any)=>(Number(item.panel.PriceEurExVat ?? item.panel.price) || (item.wattage*0.30))*item.panelsNeeded,
                isPanel:true }
            ] : []),
          ].map(cat => (
            <div key={cat.label}>
              <div className={`text-xs font-black uppercase tracking-wider mb-3 text-${cat.color}-700`}>{cat.label}</div>
              <div className="space-y-2">
                {cat.items.slice(0,6).map((item:any, i:number) => {
                  const name = (cat as any).isPanel ? `${item.panel.BrandProd} ${item.panel.ModelName}` : `${item.BrandProd} ${item.ModelName}`;
                  const sub  = cat.sub(item);
                  const price= cat.price(item);
                  return (
                    <div key={i} onClick={()=>cat.setSel(i)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        cat.sel===i ? `border-[#059669] bg-orange-50` : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}>
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${cat.sel===i ? 'border-[#059669] bg-[#059669]' : 'border-slate-300'}`}>
                        {cat.sel===i && <div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-black truncate ${cat.sel===i ? 'text-[#059669]' : 'text-slate-800'}`}>{name}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{sub}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black font-mono text-slate-700">{eur(price)}</div>
                        <div className="text-[9px] text-slate-400">excl. VAT</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Solar install summary */}
          {includeSolar && panel && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-black text-amber-800 mb-2">☀️ Solar Installation Parameters</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {[
                  ['Type', installLabels[solarInstallType]||solarInstallType],
                  ['Orientation', azLabels[solarAzimuth]||`${solarAzimuth}°`],
                  ['Panels', `${panelsNeeded} × ${panWp}W = ${((panWp*panelsNeeded)/1000).toFixed(1)} kWp`],
                  solarInstallType !== 'roof_pitched' ? ['Tilt', `${solarTilt}° (optimal: ${corr.tiltBase}°)`] : ['Region optimal', `${corr.tiltBase}°`],
                  roofArea ? ['Available area', `${roofArea} m²`] : null,
                  panelsNeeded > 0 ? ['Area used', `${(panelsNeeded*1.75).toFixed(1)} m² (${panelsNeeded} × 1.75 m²)`] : null,
                  ['Annual generation', `~${Math.round((panWp*panelsNeeded/1000)*corr.panelOutputKwhPerDay*365*0.82)} kWh/yr`],
                ].filter(Boolean).map(([k,v])=>(
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-amber-700 font-bold">{k}:</span>
                    <span className="font-mono font-black text-amber-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing summary */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600">Kit Pricing Summary</div>
            </div>
            {[
              { k:`Inverter — ${inv.BrandProd} ${inv.ModelName}`, v:invPrice },
              { k:`Battery — ${bat.BrandProd} ${bat.ModelName}`, v:batPrice },
              ...(includeSolar && panel ? [{ k:`Solar panels ×${panelsNeeded} — ${panel.BrandProd} ${panel.ModelName}`, v:panTotal }] : []),
              { k:'Installation (est. 25%)', v:install },
            ].map(row=>(
              <div key={row.k} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-xs">
                <span className="text-slate-600 font-bold truncate pr-4">{row.k}</span>
                <span className="font-mono font-black text-slate-800 shrink-0">{eur(row.v)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-xs bg-slate-50">
              <span className="text-slate-600 font-bold">Total incl. {econ?.eco.vatRate||21}% VAT</span>
              <span className="font-mono font-black text-slate-800">{eur(totalVat)}</span>
            </div>
            {subsidy > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-xs bg-green-50">
                <span className="text-green-700 font-bold">Government subsidy ({econ?.eco.subsidyPercent}%)</span>
                <span className="font-mono font-black text-green-700">− {eur(subsidy)}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 bg-orange-50">
              <span className="font-black text-orange-900">Net investment</span>
              <span className="text-xl font-black font-mono text-[#059669]">{eur(net)}</span>
            </div>
          </div>

          {/* ROI strip */}
          {econ && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label:'Annual savings', val:`€${Math.round(econ.totalAnnualSavings).toLocaleString()}`, color:'text-green-700', bg:'bg-green-50 border-green-200' },
                { label:'Payback', val:`${econ.paybackYears<99?econ.paybackYears.toFixed(1):'—'} yr`, color: econ.paybackYears<=8?'text-green-700':econ.paybackYears<=12?'text-amber-700':'text-red-700', bg:econ.paybackYears<=8?'bg-green-50 border-green-200':econ.paybackYears<=12?'bg-amber-50 border-amber-200':'bg-red-50 border-red-200' },
                { label:'ROI / 25yr', val:`${Math.round(econ.roi25yr)}%`, color:'text-blue-700', bg:'bg-blue-50 border-blue-200' },
                { label:'CO₂ saved/yr', val:`${Math.round(econ.co2SavedKg)} kg`, color:'text-teal-700', bg:'bg-teal-50 border-teal-200' },
              ].map(m=>(
                <div key={m.label} className={`rounded-xl border p-3 text-center ${m.bg}`}>
                  <div className={`text-base font-black font-mono ${m.color}`}>{m.val}</div>
                  <div className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase">{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-mono">
            {matchingInverters.length} inv · {matchingBatteries.length} bat{includeSolar ? ` · ${matchingSolarPanels.length} panels` : ''}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors">Cancel</button>
            <button
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try { await downloadKitPdf(inv, bat, panel, panelsNeeded, result, country, solarInstallType, solarAzimuth, solarTilt, roofArea, includeSolar, tariffOverride); }
                finally { setPdfLoading(false); }
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#059669] text-white text-xs font-black uppercase tracking-wide hover:bg-[#047857] transition-colors disabled:opacity-60">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>}
              {pdfLoading ? 'Generating...' : 'Download Kit PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calculator ───────────────────────────────────────────────────────────

export const Calculator: React.FC = () => {
  const { products, isLoading: productsLoading } = useProducts();
  const { language, t } = useLanguage();

  const [monthlyKwh, setMonthlyKwh] = useState('');
  const [backupHours, setBackupHours] = useState('8');
  const [notes, setNotes] = useState('');
  const [country, setCountry] = useState<CountryKey>('denmark');
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [savedResults, setSavedResults] = useState<CalculatorResult[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showKit, setShowKit] = useState(false);
  const [includeSolar, setIncludeSolar] = useState(false);

  // Solar installation parameters
  const [solarInstallType, setSolarInstallType] = useState<'roof_pitched'|'roof_flat'|'ground'>('roof_pitched');
  const [roofArea, setRoofArea] = useState('');
  const [solarAzimuth, setSolarAzimuth] = useState<number>(0);       // 0=South, -90=East, 90=West
  const [solarTilt, setSolarTilt] = useState<number>(35);            // degrees
  const [panelWpInput, setPanelWpInput] = useState('450');           // panel wattage
  const [peakLoadFactor, setPeakLoadFactor] = useState('3');
  const [maxPowerKw, setMaxPowerKw] = useState('');
  const [inverterEfficiencyPercent, setInverterEfficiencyPercent] = useState('92');
  const [cableLossPercent, setCableLossPercent] = useState('2');
  const [electricityPrices, setElectricityPrices] = useState<ElectricityPriceData[]>([]);
  const [historicalPrices, setHistoricalPrices] = useState<DailyPriceData[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  /** User-facing state for Section 3 empty chart (distinct from “region unsupported”). */
  const [energiPricesUi, setEnergiPricesUi] = useState<'loading' | 'ok' | 'error' | 'empty' | 'empty_today'>('loading');
  const [pricesReloadKey, setPricesReloadKey] = useState(0);
  /** Optional — same currency as regional model (bill / kWh) for economics & PDF. */
  const [userGridPricePerKwh, setUserGridPricePerKwh] = useState('');
  const [userFeedInTariffPerKwh, setUserFeedInTariffPerKwh] = useState('');

  const activeCatalog = useMemo(() => (products || []).filter(p => p.is_active !== false), [products]);
  const inverters = useMemo(() => activeCatalog.filter(p => p.category === 'Invertere'), [activeCatalog]);
  const batteries = useMemo(() => activeCatalog.filter(p => p.category === 'Batterier'), [activeCatalog]);
  const solarPanels = useMemo(() => activeCatalog.filter(p => p.category === 'Solpaneler'), [activeCatalog]);

  useEffect(() => {
    setSavedResults(getCalculatorResults());
  }, []);

  useEffect(() => {
    if (!getEnergiApiPriceArea(country)) return;
    setPricesLoading(true);
    setEnergiPricesUi('loading');
    Promise.all([fetchElectricityPrices(country), fetchHistoricalPrices(country, 7)])
      .then(([todayRes, histRes]) => {
        setElectricityPrices(todayRes.data);
        setHistoricalPrices(histRes.data);
        const httpFail = !todayRes.httpOk || !histRes.httpOk;
        if (httpFail) {
          setEnergiPricesUi('error');
          return;
        }
        if (todayRes.data.length === 0 && histRes.data.length === 0) {
          setEnergiPricesUi('empty');
          return;
        }
        if (todayRes.data.length === 0 && histRes.data.length > 0) {
          setEnergiPricesUi('empty_today');
          return;
        }
        setEnergiPricesUi('ok');
      })
      .catch(() => {
        setElectricityPrices([]);
        setHistoricalPrices([]);
        setEnergiPricesUi('error');
      })
      .finally(() => setPricesLoading(false));
  }, [country, pricesReloadKey]);

  const correction = SCANDINAVIA_CORRECTIONS[country] || SCANDINAVIA_CORRECTIONS.denmark;
  const regionalEco = useMemo(() => {
    const ecoKey =
      country === 'sweden' ? 'sweden_south' : Object.prototype.hasOwnProperty.call(ECONOMIC_DATA, country) ? country : 'denmark';
    return ECONOMIC_DATA[ecoKey] || ECONOMIC_DATA.denmark;
  }, [country]);

  const tariffOverrideForEcon = useMemo((): TariffOverride | undefined => {
    const g = parseFloat(userGridPricePerKwh);
    const f = parseFloat(userFeedInTariffPerKwh);
    const out: TariffOverride = {};
    if (userGridPricePerKwh.trim() !== '' && Number.isFinite(g) && g > 0) out.pricePerKwh = g;
    if (userFeedInTariffPerKwh.trim() !== '' && Number.isFinite(f) && f >= 0) out.feedInTariff = f;
    if (!('pricePerKwh' in out) && !('feedInTariff' in out)) return undefined;
    return out;
  }, [userGridPricePerKwh, userFeedInTariffPerKwh]);

  const section3ClientTariffs = tariffOverrideDrivesSection3(tariffOverrideForEcon);

  const displayElectricityPrices = useMemo(() => {
    if (section3ClientTariffs && tariffOverrideForEcon) {
      const syn = buildSyntheticSection3TodayHourly(tariffOverrideForEcon);
      if (syn.length) return syn;
    }
    return electricityPrices;
  }, [section3ClientTariffs, tariffOverrideForEcon, electricityPrices]);

  const displayHistoricalPrices = useMemo(() => {
    if (section3ClientTariffs && tariffOverrideForEcon) {
      const syn = buildSyntheticSection3History(tariffOverrideForEcon);
      if (syn.length) return syn;
    }
    return historicalPrices;
  }, [section3ClientTariffs, tariffOverrideForEcon, historicalPrices]);

  const advancedParams = {
    peakFactor: parseFloat(peakLoadFactor)||3,
    maxPower:   parseFloat(maxPowerKw)||0,
    invEff:     (parseFloat(inverterEfficiencyPercent)||92)/100,
    cableLoss:  (parseFloat(cableLossPercent)||2)/100,
  };

  const calculateNeeds = () => {
    const monthly = parseFloat(monthlyKwh)||0;
    const backup  = parseFloat(backupHours)||8;
    if (monthly <= 0) return;
    const dailyKwh = monthly/30, hourlyKwh = monthly/(30*24);
    const peakLoadKw = advancedParams.maxPower>0 ? advancedParams.maxPower*1.10 : hourlyKwh*advancedParams.peakFactor*1.10;
    const sysEff = advancedParams.invEff*(1-advancedParams.cableLoss);
    const minBatKwh = dailyKwh*(backup/24)/0.8*correction.batteryBuffer/sysEff*1.10;
    const winterYield = correction.panelOutputKwhPerDay*(correction.winterOutputPercent/100);
    const recommendedSolarPanels = includeSolar ? Math.max(1, Math.ceil(dailyKwh*1.2/winterYield)) : 0;
    const recInv = parseFloat(peakLoadKw.toFixed(2));
    const recBat = parseFloat(minBatKwh.toFixed(2));

    const matchInv = inverters.filter(p => getInverterKw(p) >= recInv).sort((a, b) => getInverterKw(a) - getInverterKw(b));
    const matchBat = batteries.filter(p => getBatteryKwh(p) >= recBat).sort((a, b) => getBatteryKwh(a) - getBatteryKwh(b));
    let matchSol: { panel: Product; panelsNeeded: number; wattage: number }[] = [];
    if (includeSolar) {
      matchSol = solarPanels
        .map(panel => {
          const wattage = getPanelWattage(panel);
          if (!wattage) return null;
          const wy = (wattage / 450) * winterYield;
          return { panel, panelsNeeded: Math.ceil(dailyKwh * 1.2 / wy), wattage };
        })
        .filter((x): x is NonNullable<typeof x> => x != null && x.panelsNeeded > 0)
        .sort((a, b) => a.panelsNeeded - b.panelsNeeded);
    }
    const recIds = [matchInv[0]?.id, matchBat[0]?.id, matchSol[0]?.panel?.id].filter(Boolean) as string[];

    const gridParsed = parseFloat(userGridPricePerKwh);
    const feedParsed = parseFloat(userFeedInTariffPerKwh);
    logCalculatorRequestToServer(
      {
        monthlyKwh: monthly,
        backupHours: backup,
        country,
        notes: notes.trim() || undefined,
        dailyKwh: parseFloat(dailyKwh.toFixed(2)),
        hourlyKwh: parseFloat(hourlyKwh.toFixed(3)),
        recommendedInverterPower: recInv,
        recommendedBatteryCapacity: recBat,
        recommendedSolarPanels,
        estimatedCost: 0,
        recommendedProductIds: recIds,
        ...(userGridPricePerKwh.trim() !== '' && Number.isFinite(gridParsed) && gridParsed > 0 ? { userGridPricePerKwh: gridParsed } : {}),
        ...(userFeedInTariffPerKwh.trim() !== '' && Number.isFinite(feedParsed) && feedParsed >= 0 ? { userFeedInTariffPerKwh: feedParsed } : {}),
      },
      language,
    );

    setResult({
      id:`calc-${Date.now()}`, createdAt: new Date().toISOString(), country,
      monthlyKwh: monthly, hourlyKwh: parseFloat(hourlyKwh.toFixed(3)), dailyKwh: parseFloat(dailyKwh.toFixed(2)),
      recommendedInverterPower: recInv,
      recommendedBatteryCapacity: recBat,
      recommendedSolarPanels, estimatedCost:0, notes,
    });
  };

  const matchingInverters = result ? inverters.filter(p=>getInverterKw(p)>=result.recommendedInverterPower).sort((a,b)=>getInverterKw(a)-getInverterKw(b)) : [];
  const matchingBatteries = result ? batteries.filter(p=>getBatteryKwh(p)>=result.recommendedBatteryCapacity).sort((a,b)=>getBatteryKwh(a)-getBatteryKwh(b)) : [];
  const matchingSolarPanels = (result&&includeSolar) ? solarPanels.map(panel=>{
    const wattage = getPanelWattage(panel); if (!wattage) return null;
    const wy = (wattage/450)*(correction.panelOutputKwhPerDay*(correction.winterOutputPercent/100));
    return { panel, panelsNeeded: Math.ceil(result.dailyKwh*1.2/wy), wattage };
  }).filter((x): x is NonNullable<typeof x> => x!==null && x.panelsNeeded>0).sort((a,b)=>a.panelsNeeded-b.panelsNeeded) : [];

  // ── Chart data ──────────────────────────────────────────────────────────────
  const monthlyGenerationData = useMemo(() => {
    if (!result||!includeSolar) return [];
    const baseGen = (result.recommendedSolarPanels*450)/1000*correction.panelOutputKwhPerDay*30;
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month,i)=>({
      month,
      generation: parseFloat((baseGen*(0.5+Math.sin((i+3)*Math.PI/6)*0.5)).toFixed(1)),
      consumption: result.monthlyKwh,
    }));
  }, [result, includeSolar, correction]);

  const currentEcon = useMemo(()=>{
    if (!result||matchingInverters.length===0||matchingBatteries.length===0) return null;
    return calcEconomics(country, result.monthlyKwh, matchingInverters[0], matchingBatteries[0],
      matchingSolarPanels[0]?.panel||{}, matchingSolarPanels[0]?.panelsNeeded||0, tariffOverrideForEcon);
  }, [result, matchingInverters, matchingBatteries, matchingSolarPanels, country, tariffOverrideForEcon]);

  const paybackData = useMemo(()=>{
    if (!currentEcon) return [];
    return Array.from({length:25},(_,i)=>({
      year: i+1,
      cumulative: parseFloat((currentEcon.totalAnnualSavings*(i+1)-currentEcon.netCost).toFixed(0)),
      investment: Math.round(currentEcon.netCost),
    }));
  }, [currentEcon]);

  const costBreakdownData = useMemo(()=>{
    if (!currentEcon) return [];
    const panN = matchingSolarPanels[0]?.panelsNeeded||0;
    return [
      { name:'Inverter',     value: Math.round(currentEcon.invCost),                color:'#059669' },
      { name:'Battery',      value: Math.round(currentEcon.batCost),                color:'#10b981' },
      { name:'Panels',       value: Math.round(currentEcon.panelCost*panN),          color:'#3b82f6' },
      { name:'Installation', value: Math.round(currentEcon.installationCost),        color:'#8b5cf6' },
    ].filter(d=>d.value>0);
  }, [currentEcon, matchingSolarPanels]);

  const priceChartData = useMemo(() => {
    const g = tariffOverrideForEcon?.pricePerKwh;
    const f = tariffOverrideForEcon?.feedInTariff;
    const showFeedLine =
      g != null && g > 0 && f != null && f >= 0 && Number.isFinite(g) && Number.isFinite(f);
    return displayElectricityPrices.slice(0, 24).map((p) => ({
      hour: p.hour,
      price: p.price,
      ...(showFeedLine ? { feedIn: f } : {}),
    }));
  }, [displayElectricityPrices, tariffOverrideForEcon]);

  const historicalChartData = useMemo(() => {
    return displayHistoricalPrices.map((p) => {
      const short = p.date.length >= 10 ? `${p.date.slice(8, 10)}/${p.date.slice(5, 7)}` : p.date;
      return { date: short, avg: p.avgPrice, min: p.minPrice, max: p.maxPrice };
    });
  }, [displayHistoricalPrices]);

  const hourlyChartPrimaryLabel = useMemo(() => {
    if (!section3ClientTariffs) return t('calc_energi_chart_spot_legend');
    const g = tariffOverrideForEcon?.pricePerKwh;
    if (g != null && g > 0) return t('calc_user_grid_price_label');
    return t('calc_user_feedin_label');
  }, [section3ClientTariffs, tariffOverrideForEcon, t]);

  const handleSave = () => { if (!result) return; saveCalculatorResult({...result,notes}); setSavedResults(getCalculatorResults()); };
  const handleReset = () => {
    setMonthlyKwh(''); setBackupHours('8'); setNotes(''); setResult(null); setPeakLoadFactor('3'); setMaxPowerKw('');
    setInverterEfficiencyPercent('92'); setCableLossPercent('2');
    setUserGridPricePerKwh(''); setUserFeedInTariffPerKwh('');
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <CalculatorIcon className="h-8 w-8 text-[#059669]" /> Energy Calculator
          </h1>
          <p className="text-slate-500 mt-2 font-mono text-sm">Calculate required components with real-time electricity prices and economic analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 h-fit bg-white border border-slate-100 rounded-[2rem] shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-black uppercase tracking-wide text-slate-900">Input Parameters</div>
              <button onClick={()=>setShowHelpModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:border-[#059669] hover:text-[#059669] transition-all text-xs font-bold">
                <HelpCircle className="h-3.5 w-3.5" /> Guide
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Country */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-2"><MapPin className="h-3 w-3" /> Region / Country</label>
                <select value={country} onChange={e=>setCountry(e.target.value as CountryKey)} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900 bg-white">
                  {Object.entries(SCANDINAVIA_CORRECTIONS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Solar: ×{correction.solarFactor} | Battery: ×{correction.batteryBuffer}</div>
              </div>

              {/* Consumption */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Monthly Consumption (kWh)</label>
                <input type="number" min={0} step={1} value={monthlyKwh} onChange={e=>setMonthlyKwh(e.target.value)} placeholder="e.g. 500" className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900" />
              </div>

              {/* Backup */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Backup Hours Required</label>
                <input type="number" min={1} max={48} value={backupHours} onChange={e=>setBackupHours(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900" />
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> {t('calc_user_tariff_section_title')}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">{t('calc_user_grid_price_label')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={userGridPricePerKwh}
                    onChange={(e) => setUserGridPricePerKwh(e.target.value)}
                    placeholder={`${t('calc_user_tariff_example_prefix')} ${regionalEco.pricePerKwh} ${regionalEco.currency}/kWh`}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#059669] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">{t('calc_user_feedin_label')}</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={userFeedInTariffPerKwh}
                    onChange={(e) => setUserFeedInTariffPerKwh(e.target.value)}
                    placeholder={`${t('calc_user_tariff_example_prefix')} ${regionalEco.feedInTariff} ${regionalEco.currency}/kWh`}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#059669] bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{t('calc_user_tariff_hint')}</p>
              </div>

              {/* Solar installation configurator */}
              <div className="space-y-3">
                {/* Toggle header */}
                <div className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${includeSolar ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
                  onClick={() => setIncludeSolar(v => !v)}>
                  <div className="flex items-center gap-2.5">
                    <Sun className={`h-4 w-4 ${includeSolar ? 'text-amber-500' : 'text-slate-400'}`} />
                    <div>
                      <div className={`text-xs font-black ${includeSolar ? 'text-amber-800' : 'text-slate-600'}`}>Include solar panels</div>
                      <div className={`text-[10px] font-mono ${includeSolar ? 'text-amber-600' : 'text-slate-400'}`}>
                        {includeSolar ? 'Solar sizing active — configure below' : 'Off — battery + inverter only'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-all relative ${includeSolar ? 'bg-amber-400' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${includeSolar ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Expanded config when solar is ON */}
                {includeSolar && (
                  <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/50 space-y-4">

                    {/* Installation type */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase tracking-wider text-amber-700">Installation Type</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id:'roof_pitched', icon:'🏠', label:'Pitched Roof' },
                          { id:'roof_flat',    icon:'🏢', label:'Flat Roof'   },
                          { id:'ground',       icon:'🌿', label:'Ground'      },
                        ].map(opt => (
                          <button key={opt.id} type="button"
                            onClick={() => {
                              setSolarInstallType(opt.id as any);
                              // Set sensible defaults per type
                              if (opt.id === 'roof_pitched') setSolarTilt(correction.tiltBase);
                              if (opt.id === 'roof_flat')    setSolarTilt(10);
                              if (opt.id === 'ground')       setSolarTilt(correction.tiltBase);
                            }}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border text-[10px] font-bold transition-all ${
                              solarInstallType === opt.id
                                ? 'border-[#059669] bg-white text-[#059669]'
                                : 'border-amber-200 bg-white text-slate-500 hover:border-amber-400'
                            }`}>
                            <span className="text-lg">{opt.icon}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Roof area */}
                    <div className="space-y-1">
                      <label className="block text-xs font-mono uppercase tracking-wider text-amber-700">
                        {solarInstallType === 'ground' ? 'Available Ground Area (m²)' : 'Roof Area for Panels (m²)'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" min={0} step={1} value={roofArea}
                          onChange={e => setRoofArea(e.target.value)}
                          placeholder={solarInstallType === 'ground' ? 'e.g. 100' : 'e.g. 30'}
                          className="flex-1 border border-amber-200 rounded-lg px-3 py-1.5 font-mono text-sm focus:outline-none focus:border-[#059669] bg-white" />
                        <span className="text-xs font-mono text-slate-500">m²</span>
                      </div>
                      {roofArea && Number(roofArea) > 0 && (
                        <div className="text-[10px] text-amber-700 font-mono">
                          ≈ {Math.floor(Number(roofArea) / 1.75)} panels fit (1 panel ≈ 1.75m²)
                        </div>
                      )}
                    </div>

                    {/* Orientation (azimuth) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase tracking-wider text-amber-700">Orientation</label>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { label:'⬆ South (best)',   value: 0,   factor:'×1.00' },
                          { label:'↗ South-East',      value:-45,  factor:'×0.95' },
                          { label:'↖ South-West',      value: 45,  factor:'×0.95' },
                          { label:'→ East',             value:-90,  factor:'×0.80' },
                          { label:'← West',             value: 90,  factor:'×0.80' },
                          { label:'⬇ North (worst)',   value:180,  factor:'×0.45' },
                        ].map(opt => (
                          <button key={opt.value} type="button" onClick={() => setSolarAzimuth(opt.value)}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              solarAzimuth === opt.value
                                ? 'border-[#059669] bg-white text-[#059669]'
                                : 'border-amber-200 bg-white text-slate-600 hover:border-amber-400'
                            }`}>
                            <span>{opt.label}</span>
                            <span className={`font-mono ${opt.value === 0 ? 'text-green-600' : Math.abs(opt.value) <= 45 ? 'text-amber-600' : 'text-red-500'}`}>{opt.factor}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tilt angle — always shown for flat roof and ground; read-only info for pitched */}
                    {(solarInstallType === 'roof_flat' || solarInstallType === 'ground') && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono uppercase tracking-wider text-amber-700">Tilt Angle</label>
                          <span className="text-sm font-black font-mono text-[#059669]">{solarTilt}°</span>
                        </div>
                        <input type="range" min={0} max={90} step={5} value={solarTilt}
                          onChange={e => setSolarTilt(Number(e.target.value))}
                          className="w-full accent-[#059669]" />
                        <div className="flex justify-between text-[9px] font-mono text-slate-400">
                          <span>0° flat</span>
                          <span className="text-green-600 font-bold">Opt ~{correction.tiltBase}°</span>
                          <span>90° vertical</span>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          Math.abs(solarTilt - correction.tiltBase) <= 5  ? 'bg-green-50 text-green-700' :
                          Math.abs(solarTilt - correction.tiltBase) <= 15 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {Math.abs(solarTilt - correction.tiltBase) <= 5 ? '✓ Optimal tilt for this region' :
                           `⚠ ${Math.abs(solarTilt - correction.tiltBase)}° from optimal ${correction.tiltBase}°`}
                        </div>
                      </div>
                    )}

                    {solarInstallType === 'roof_pitched' && (
                      <div className="text-[10px] text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                        ℹ Tilt is determined by your roof pitch. Typical residential roofs: 30–45°. For best results, measure your roof angle.
                        Optimal for {correction.label}: <span className="font-black">{correction.tiltBase}°</span>
                      </div>
                    )}

                    {/* Panel wattage */}
                    <div className="space-y-1">
                      <label className="block text-xs font-mono uppercase tracking-wider text-amber-700">Panel Wattage (Wp)</label>
                      <div className="flex gap-2">
                        {[350, 400, 450, 500, 550].map(wp => (
                          <button key={wp} type="button" onClick={() => setPanelWpInput(String(wp))}
                            className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              panelWpInput === String(wp)
                                ? 'border-[#059669] bg-white text-[#059669]'
                                : 'border-amber-200 bg-white text-slate-500 hover:border-amber-400'
                            }`}>{wp}W</button>
                        ))}
                      </div>
                    </div>

                    {/* Live preview */}
                    {roofArea && Number(roofArea) > 0 && (() => {
                      const wp = Number(panelWpInput) || 450;
                      const panelArea = 1.75;
                      const maxPanels = Math.floor(Number(roofArea) / panelArea);
                      const azFactor = [0,45,-45].includes(solarAzimuth) ? (solarAzimuth === 0 ? 1.0 : 0.95) : Math.abs(solarAzimuth) === 90 ? 0.80 : 0.55;
                      const tiltUsed = solarInstallType === 'roof_pitched' ? correction.tiltBase : solarTilt;
                      const tiltDiff = Math.abs(tiltUsed - correction.tiltBase);
                      const tiltFactor = tiltDiff <= 5 ? 1.0 : tiltDiff <= 15 ? 0.97 : tiltDiff <= 30 ? 0.93 : 0.85;
                      const annualGen = (maxPanels * wp / 1000) * (correction.panelOutputKwhPerDay * 365) * azFactor * tiltFactor * 0.82;
                      return (
                        <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Installation Preview</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-slate-500">Max panels:</span><span className="font-mono font-black">{maxPanels} × {wp}W</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Total power:</span><span className="font-mono font-black text-[#059669]">{(maxPanels*wp/1000).toFixed(1)} kWp</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Orient. factor:</span><span className="font-mono font-black">×{azFactor}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Tilt factor:</span><span className="font-mono font-black">×{tiltFactor}</span></div>
                            <div className="flex justify-between col-span-2 border-t border-amber-100 pt-1 mt-0.5">
                              <span className="font-black text-amber-800">Est. annual generation:</span>
                              <span className="font-mono font-black text-[#059669]">{Math.round(annualGen).toLocaleString()} kWh/yr</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Advanced */}
              <div className="pt-2">
                <button type="button" onClick={()=>setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">
                  <Settings className="h-3 w-3" /> {showAdvanced?'Hide Advanced Settings':'Show Advanced Settings'}
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                    {[
                      { label:'Peak Load Factor', val:peakLoadFactor, set:setPeakLoadFactor, min:1, step:0.5 },
                      { label:'Max Simultaneous Power (kW)', val:maxPowerKw, set:setMaxPowerKw, min:0, step:0.1, ph:'e.g. 5' },
                      { label:'Inverter Efficiency (%)', val:inverterEfficiencyPercent, set:setInverterEfficiencyPercent, min:70, max:99, step:1 },
                      { label:'Cable Losses (%)', val:cableLossPercent, set:setCableLossPercent, min:0, max:10, step:0.5 },
                    ].map(f=>(
                      <div key={f.label} className="space-y-1">
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">{f.label}</label>
                        <input type="number" min={f.min} max={(f as any).max} step={f.step} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={(f as any).ph} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-500">Notes (Optional)</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:border-slate-900 resize-y" placeholder="Project notes..." />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={calculateNeeds} className="flex-1 px-4 py-2 rounded-xl bg-[#059669] text-white font-black uppercase tracking-widest text-[10px] hover:bg-[#047857] transition-all flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" /> Calculate
                </button>
                <button onClick={handleReset} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1 — Theoretical Requirements */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-slate-900">
                  <Zap className="h-4 w-4 text-amber-500" /> Section 1 — Theoretical Requirements {correction.label}
                </div>
                {result && (
                  <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest" onClick={handleSave}>Save</button>
                    <button className="px-4 py-2 rounded-xl border border-[#059669] text-[#059669] hover:bg-orange-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                      onClick={()=>downloadFullReportPdf(result, parseFloat(backupHours)||8, country, advancedParams, matchingInverters, matchingBatteries, matchingSolarPanels as any[], includeSolar, displayElectricityPrices, tariffOverrideForEcon)}>
                      <Printer className="h-4 w-4" /> Download PDF
                    </button>
                  </div>
                )}
              </div>
              <div className="p-6">
                {result ? (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-100 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-3">Input Parameters</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                        {[['Monthly consumption',`${result.monthlyKwh} kWh/month`],['Backup duration',`${backupHours} h`],['Daily consumption',`${result.dailyKwh.toFixed(2)} kWh/day`],['Avg hourly load',`${result.hourlyKwh.toFixed(3)} kW`]].map(([k,v])=>(
                          <div key={k} className="flex items-center justify-between gap-4"><span className="text-slate-500 font-black">{k}</span><span className="text-slate-900 font-black font-mono">{v}</span></div>
                        ))}
                        <div className="flex items-center justify-between gap-4 sm:col-span-2 bg-orange-50 px-3 py-2 rounded-lg">
                          <span className="text-[#c45200] font-black flex items-center gap-2"><MapPin className="h-3 w-3" /> Region Correction</span>
                          <span className="text-[#7c2d00] font-black font-mono">Solar ×{correction.solarFactor} | Battery ×{correction.batteryBuffer}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border-l-4 border-l-amber-500 bg-amber-50 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-2"><Zap className="h-4 w-4 text-amber-500" /><span className="text-xs font-mono uppercase font-bold">Min. Inverter Power</span></div>
                        <div className="text-3xl font-black font-mono text-amber-600">{result.recommendedInverterPower}<span className="text-base text-slate-500 ml-1">kW</span></div>
                        <div className="text-[10px] text-amber-700 font-bold mt-1 bg-amber-100 px-2 py-0.5 rounded">Minimum required — select ≥ this value</div>
                        <div className="text-xs text-slate-500 mt-1.5 font-mono">
                          {advancedParams.maxPower>0 ? `Max power: ${advancedParams.maxPower} kW × 1.10` : `Avg: ${result.hourlyKwh} kW × ${advancedParams.peakFactor} × 1.10`}
                        </div>
                      </div>
                      <div className="border-l-4 border-l-blue-500 bg-blue-50 p-4 rounded-xl">
                        <div className="flex items-center gap-2 text-slate-500 mb-2"><Battery className="h-4 w-4 text-blue-500" /><span className="text-xs font-mono uppercase font-bold">Min. Battery Capacity</span></div>
                        <div className="text-3xl font-black font-mono text-blue-600">{result.recommendedBatteryCapacity}<span className="text-base text-slate-500 ml-1">kWh</span></div>
                        <div className="text-[10px] text-blue-700 font-bold mt-1 bg-blue-100 px-2 py-0.5 rounded">Minimum required — select ≥ this value</div>
                        <div className="text-xs text-slate-500 mt-1.5 font-mono">
                          Daily: {result.dailyKwh} × {backupHours}h/24<br/>
                          Sys eff: {(advancedParams.invEff*(1-advancedParams.cableLoss)*100).toFixed(0)}% · Cold ×{correction.batteryBuffer}
                        </div>
                      </div>
                    </div>
                    {includeSolar && (() => {
                      const firstPanel = matchingSolarPanels[0] as any;
                      const actualWp = firstPanel ? firstPanel.wattage : 450;
                      const actualCount = firstPanel ? firstPanel.panelsNeeded : result.recommendedSolarPanels;
                      return (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3">
                        <Sun className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-xs text-slate-600 font-mono flex-1">
                          <span className="font-black text-slate-800">Solar panels (winter sizing, {correction.label}):</span><br/>
                          Winter yield per 450W panel: ~{(correction.panelOutputKwhPerDay*(correction.winterOutputPercent/100)).toFixed(2)} kWh/day<br/>
                          Required: {(result.dailyKwh*1.2).toFixed(2)} kWh/day → min. <span className="font-black text-amber-700">{result.recommendedSolarPanels} × 450W</span>
                          {firstPanel && <span className="font-black text-[#059669]"> · Best match: {actualCount} × {actualWp}W ({((actualWp*actualCount)/1000).toFixed(1)} kWp)</span>}
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CalculatorIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-mono text-sm uppercase">Enter your monthly consumption to calculate</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2 — Matching Products from Database */}
            {result && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" /> Section 2 — Matching Products from Database
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Compatible products from your inventory that meet the calculated requirements.</p>
                  </div>
                  {matchingInverters.length > 0 && matchingBatteries.length > 0 && (
                    <button onClick={() => setShowKit(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-black uppercase tracking-wide hover:bg-[#047857] transition-colors shrink-0">
                      <Zap className="h-3.5 w-3.5" /> Optimal Kit
                    </button>
                  )}
                </div>

                {productsLoading ? (
                  <div className="p-6 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading products...</div>
                ) : (
                  <div className="divide-y divide-slate-100">

                    {/* Inverters */}
                    <div className="p-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Zap className="h-3 w-3" /> Inverters — ≥ {result.recommendedInverterPower} kW ({matchingInverters.length} found)
                      </h3>
                      {matchingInverters.length === 0 ? (
                        <p className="text-sm text-slate-400 font-mono">No matching inverters in catalog.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {matchingInverters.slice(0,4).map((inv: any) => (
                            <div key={inv.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#059669] transition-colors">
                              <div className="text-xs font-black text-slate-900">{inv.BrandProd} {inv.ModelName}</div>
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                <span className="font-black text-[#059669]">{getInverterKw(inv)} kW</span>
                                {inv.InvType ? ` · ${inv.InvType}` : ''}
                                {inv.Phases ? ` · ${inv.Phases}` : ''}
                                {inv.IpRating ? ` · IP${inv.IpRating}` : ''}
                              </div>
                              {(Number(inv.PriceEurExVat ?? inv.price) > 0) && <div className="text-xs font-black text-green-700 font-mono mt-1.5">{formatCurrency(Number(inv.PriceEurExVat ?? inv.price))} excl. VAT</div>}
                              {(Number(inv.StockLvl ?? inv.stock) > 0) && <div className="text-[10px] text-green-600 mt-0.5">✓ In stock: {inv.StockLvl ?? inv.stock}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {matchingInverters.length > 4 && <p className="text-xs text-slate-400 mt-2 text-center">+ {matchingInverters.length - 4} more in catalog</p>}
                    </div>

                    {/* Batteries */}
                    <div className="p-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Battery className="h-3 w-3" /> Batteries — ≥ {result.recommendedBatteryCapacity} kWh ({matchingBatteries.length} found)
                      </h3>
                      {matchingBatteries.length === 0 ? (
                        <p className="text-sm text-slate-400 font-mono">No matching batteries in catalog.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {matchingBatteries.slice(0,4).map((bat: any) => (
                            <div key={bat.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#059669] transition-colors">
                              <div className="text-xs font-black text-slate-900">{bat.BrandProd} {bat.ModelName}</div>
                              <div className="text-xs text-slate-500 mt-1 font-mono">
                                <span className="font-black text-[#059669]">{getBatteryKwh(bat) || bat.CapKwh || '—'} kWh</span>
                                {bat.BattChem ? ` · ${bat.BattChem}` : ''}
                                {bat.NomVoltV ? ` · ${bat.NomVoltV}V` : ''}
                              </div>
                              {bat.CycleLife && <div className="text-[10px] text-slate-400 font-mono">{bat.CycleLife} cycles</div>}
                              {(Number(bat.PriceEurExVat ?? bat.price) > 0) && <div className="text-xs font-black text-green-700 font-mono mt-1.5">{formatCurrency(Number(bat.PriceEurExVat ?? bat.price))} excl. VAT</div>}
                              {(Number(bat.StockLvl ?? bat.stock) > 0) && <div className="text-[10px] text-green-600 mt-0.5">✓ In stock: {bat.StockLvl ?? bat.stock}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {matchingBatteries.length > 4 && <p className="text-xs text-slate-400 mt-2 text-center">+ {matchingBatteries.length - 4} more in catalog</p>}
                    </div>

                    {/* Solar Panels */}
                    {includeSolar ? (
                      <div className="p-6">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                          <Sun className="h-3 w-3" /> Solar Panels — Winter Sizing ({matchingSolarPanels.length} found)
                        </h3>
                        {matchingSolarPanels.length === 0 ? (
                          <p className="text-sm text-slate-400 font-mono">No solar panels with wattage data in catalog.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {matchingSolarPanels.slice(0,4).map((item: any) => (
                              <div key={item.panel.id} className="border border-slate-200 rounded-xl p-4 hover:border-[#059669] transition-colors">
                                <div className="text-xs font-black text-slate-900">{item.panel.BrandProd} {item.panel.ModelName}</div>
                                <div className="text-xs text-slate-500 mt-1 font-mono">
                                  {item.wattage} Wp
                                  {item.panel.CellTech ? ` · ${item.panel.CellTech}` : ''}
                                  {item.panel.ModEffPerc ? ` · ${item.panel.ModEffPerc}% eff` : ''}
                                </div>
                                <div className="text-xs mt-1.5 font-mono">
                                  Need: <span className="font-black text-amber-600">{item.panelsNeeded} panels</span>
                                  <span className="text-slate-400"> ({(item.wattage * item.panelsNeeded / 1000).toFixed(1)} kWp total)</span>
                                </div>
                                {(Number(item.panel.PriceEurExVat ?? item.panel.price) > 0) && <div className="text-xs font-black text-green-700 font-mono mt-1">{formatCurrency(Number(item.panel.PriceEurExVat ?? item.panel.price))} excl. VAT each</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {matchingSolarPanels.length > 4 && <p className="text-xs text-slate-400 mt-2 text-center">+ {matchingSolarPanels.length - 4} more in catalog</p>}
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <Sun className="h-5 w-5 text-slate-300 shrink-0" />
                          <div>
                            <div className="text-xs font-black text-slate-500">Solar panels not included</div>
                            <div className="text-[10px] text-slate-400">Enable "Include solar panels" in the input panel.</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section 3 — Real-Time Electricity Prices */}
            {getEnergiApiPriceArea(country) && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl">
                <div className="p-6 border-b border-slate-100">
                  <div className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-slate-900">
                    <Activity className="h-4 w-4 text-blue-500" /> Section 3 — Real-Time Electricity Prices
                    {pricesLoading && !section3ClientTariffs && <Loader2 className="h-4 w-4 animate-spin text-[#059669]" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {section3ClientTariffs
                      ? `${t('calc_section3_user_tariffs_subtitle')} · ${correction.label}`
                      : `Live data from Energi Data Service · ${correction.label}`}
                  </p>
                  {section3ClientTariffs && (
                    <p className="text-[10px] text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1.5 mt-2 leading-relaxed">
                      {t('calc_section3_user_tariffs_banner')}
                    </p>
                  )}
                  {!section3ClientTariffs && country === 'norway_north' && (
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-2 leading-relaxed">
                      {t('calc_energi_spot_no4_note')}
                    </p>
                  )}
                </div>
                <div className="p-6 space-y-6">
                  {/* Today hourly */}
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Calendar className="h-3 w-3" /> Today's Hourly Prices</div>
                    {priceChartData.length > 0 ? (
                      <SafeChart height={192}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="hour" tick={{ fontSize:10 }} stroke="#64748b" />
                            <YAxis tick={{ fontSize:10 }} stroke="#64748b" />
                            <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                            {priceChartData[0] != null && 'feedIn' in priceChartData[0] && (
                              <Legend wrapperStyle={{ fontSize:10 }} />
                            )}
                            <Area
                              type="monotone"
                              dataKey="price"
                              stroke="#059669"
                              fill="#059669"
                              fillOpacity={0.2}
                              strokeWidth={2}
                              name={hourlyChartPrimaryLabel}
                            />
                            {priceChartData[0] != null && 'feedIn' in priceChartData[0] && (
                              <Area
                                type="monotone"
                                dataKey="feedIn"
                                stroke="#2563eb"
                                fill="#3b82f6"
                                fillOpacity={0.12}
                                strokeWidth={2}
                                name={t('calc_user_feedin_label')}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      </SafeChart>
                    ) : (
                      <div className="py-6 px-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                        {pricesLoading || energiPricesUi === 'loading' ? (
                          <div className="text-center text-slate-400 text-sm font-mono">Loading prices...</div>
                        ) : energiPricesUi === 'error' ? (
                          <>
                            <div className="text-sm font-black text-slate-800">{t('calc_energi_prices_error_title')}</div>
                            <p className="text-xs text-slate-600 leading-relaxed">{t('calc_energi_prices_error_lead')}</p>
                            <p className="text-xs text-slate-600 leading-relaxed">{t('calc_energi_prices_error_steps')}</p>
                            <p className="text-xs text-slate-500">
                              <a href={`mailto:${COMPANY_EMAIL}`} className="font-bold text-[#059669] hover:underline">{COMPANY_EMAIL}</a>
                            </p>
                            <button
                              type="button"
                              disabled={pricesLoading}
                              onClick={() => setPricesReloadKey((k) => k + 1)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                              <RefreshCw className={`h-3.5 w-3.5 ${pricesLoading ? 'animate-spin' : ''}`} />
                              {t('calc_energi_prices_retry')}
                            </button>
                          </>
                        ) : energiPricesUi === 'empty_today' ? (
                          <>
                            <div className="text-sm font-black text-slate-800">{t('calc_energi_prices_empty_today_title')}</div>
                            <p className="text-xs text-slate-600 leading-relaxed">{t('calc_energi_prices_empty_today_lead')}</p>
                            <button
                              type="button"
                              disabled={pricesLoading}
                              onClick={() => setPricesReloadKey((k) => k + 1)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                              <RefreshCw className={`h-3.5 w-3.5 ${pricesLoading ? 'animate-spin' : ''}`} />
                              {t('calc_energi_prices_retry')}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-black text-slate-800">{t('calc_energi_prices_empty_title')}</div>
                            <p className="text-xs text-slate-600 leading-relaxed">{t('calc_energi_prices_empty_lead')}</p>
                            <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-2 mt-1">{t('calc_energi_prices_zones_note')}</p>
                            <button
                              type="button"
                              disabled={pricesLoading}
                              onClick={() => setPricesReloadKey((k) => k + 1)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                              <RefreshCw className={`h-3.5 w-3.5 ${pricesLoading ? 'animate-spin' : ''}`} />
                              {t('calc_energi_prices_retry')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {/* 7-day history */}
                  {historicalChartData.length > 0 && (
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><TrendingUp className="h-3 w-3" /> 7-Day Price History</div>
                      <SafeChart height={160}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historicalChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize:10 }} stroke="#64748b" />
                            <YAxis tick={{ fontSize:10 }} stroke="#64748b" />
                            <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                            <Legend wrapperStyle={{ fontSize:10 }} />
                            <Bar dataKey="avg" fill="#059669" name="Avg" />
                            <Bar dataKey="min" fill="#10b981" name="Min" />
                            <Bar dataKey="max" fill="#ef4444" name="Max" />
                          </BarChart>
                        </ResponsiveContainer>
                      </SafeChart>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 4 — Economic Analysis */}
            {result && currentEcon && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl">
                <div className="p-6 border-b border-slate-100">
                  <div className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-slate-900">
                    <DollarSign className="h-4 w-4 text-green-500" /> Section 4 — Economic Analysis · {correction.label}
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {tariffOverrideForEcon && (
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 leading-relaxed">
                      {t('calc_user_tariff_active')}
                    </div>
                  )}
                  {/* KPI row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase text-green-600 mb-1">Annual Savings</div>
                      <div className="text-2xl font-black font-mono text-green-700">€{Math.round(currentEcon.totalAnnualSavings).toLocaleString()}</div>
                      <div className="text-[10px] text-green-600 mt-1">self-use + feed-in</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${currentEcon.paybackYears<=8?'bg-green-50 border-green-200':currentEcon.paybackYears<=12?'bg-amber-50 border-amber-200':'bg-red-50 border-red-200'}`}>
                      <div className={`text-[10px] font-black uppercase mb-1 ${currentEcon.paybackYears<=8?'text-green-600':currentEcon.paybackYears<=12?'text-amber-600':'text-red-600'}`}>Payback</div>
                      <div className={`text-2xl font-black font-mono ${currentEcon.paybackYears<=8?'text-green-700':currentEcon.paybackYears<=12?'text-amber-700':'text-red-700'}`}>{currentEcon.paybackYears<99?currentEcon.paybackYears.toFixed(1):'—'} yr</div>
                      <div className={`text-[10px] mt-1 ${currentEcon.paybackYears<=8?'text-green-600':currentEcon.paybackYears<=12?'text-amber-600':'text-red-600'}`}>{currentEcon.paybackYears<=7?'🟢 Excellent':currentEcon.paybackYears<=10?'🟡 Good':'🟠 Acceptable'}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase text-blue-600 mb-1">ROI / 25yr</div>
                      <div className="text-2xl font-black font-mono text-blue-700">{Math.round(currentEcon.roi25yr)}%</div>
                      <div className="text-[10px] text-blue-600 mt-1">total return</div>
                    </div>
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase text-teal-600 mb-1">CO₂ Saved</div>
                      <div className="text-2xl font-black font-mono text-teal-700">{Math.round(currentEcon.co2SavedKg)} kg</div>
                      <div className="text-[10px] text-teal-600 mt-1">per year</div>
                    </div>
                  </div>

                  {/* Payback timeline */}
                  {paybackData.length > 0 && (
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><BarChart3 className="h-3 w-3" /> Payback Timeline (25 Years)</div>
                      <SafeChart height={224}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={paybackData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="year" tick={{ fontSize:10 }} stroke="#64748b" />
                            <YAxis tick={{ fontSize:10 }} stroke="#64748b" tickFormatter={v=>v>=0?`+€${(v/1000).toFixed(0)}k`:`-€${(-v/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v:any)=>[`€${Number(v).toLocaleString()}`, '']} />
                            <Legend wrapperStyle={{ fontSize:10 }} />
                            <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2} name="Cumulative Savings" dot={false} />
                            <Line type="monotone" dataKey="investment" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Initial Investment" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </SafeChart>
                    </div>
                  )}

                  {/* Cost breakdown */}
                  {costBreakdownData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><PieChartIcon className="h-3 w-3" /> System Cost Breakdown</div>
                        <SafeChart height={192}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie data={costBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{ stroke:'#94a3b8', strokeWidth:1 }}>
                                {costBreakdownData.map((entry,i)=><Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v:any)=>[`€${Number(v).toLocaleString()}`,'Cost']} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </SafeChart>
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Investment Summary</div>
                        <div className="space-y-2">
                          {costBreakdownData.map(item=>(
                            <div key={item.name} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm" style={{ background:item.color }} /><span className="font-bold text-slate-700">{item.name}</span></div>
                              <span className="font-mono font-black text-slate-800">€{item.value.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm pt-2">
                            <span className="font-black text-slate-700">Net investment</span>
                            <span className="font-black font-mono text-[#059669]">€{Math.round(currentEcon.netCost).toLocaleString()}</span>
                          </div>
                          {currentEcon.subsidyAmount > 0 && (
                            <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">{currentEcon.eco.subsidyPercent}% subsidy applied: −€{Math.round(currentEcon.subsidyAmount).toLocaleString()}<br/><span className="opacity-70">{currentEcon.eco.subsidyNote}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 4 — Monthly Generation vs Consumption */}
            {result && includeSolar && monthlyGenerationData.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl">
                <div className="p-6 border-b border-slate-100">
                  <div className="text-sm font-black uppercase tracking-wide flex items-center gap-2 text-slate-900">
                    <Sun className="h-4 w-4 text-amber-500" /> Section 5 — Monthly Solar Generation vs Consumption
                  </div>
                </div>
                <div className="p-6">
                  <SafeChart height={224}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyGenerationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize:10 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize:10 }} stroke="#64748b" unit=" kWh" />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                        <Legend wrapperStyle={{ fontSize:10 }} />
                        <Bar dataKey="generation" fill="#059669" name="Solar Generation" />
                        <Bar dataKey="consumption" fill="#3b82f6" name="Monthly Consumption" />
                      </BarChart>
                    </ResponsiveContainer>
                  </SafeChart>
                  <p className="text-[10px] text-slate-400 font-mono mt-3">* Generation is an estimate based on regional irradiation data. Actual output depends on installation angle, shading, and system losses.</p>
                </div>
              </div>
            )}

            {/* Saved Calculations */}
            {savedResults.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-[2rem] shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <div className="text-sm font-black uppercase tracking-wide text-slate-900">Saved Calculations</div>
                </div>
                <div className="divide-y divide-slate-100">
                  {savedResults.map(saved=>(
                    <div key={saved.id} className="p-6 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-slate-500">{new Date(saved.createdAt).toLocaleDateString()}</div>
                        <div className="font-black text-slate-900 flex items-center gap-2">
                          {saved.monthlyKwh} kWh/month
                          {saved.country && <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-[#c45200] rounded-full font-mono">{SCANDINAVIA_CORRECTIONS[normalizeSavedCountryKey(saved.country)]?.label||saved.country}</span>}
                        </div>
                        <div className="text-xs text-slate-500 font-mono truncate">{saved.notes||'—'}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-[10px] font-black uppercase tracking-widest"
                          onClick={()=>{ setMonthlyKwh(String(saved.monthlyKwh)); setCountry(normalizeSavedCountryKey(String(saved.country||''))); setNotes(saved.notes||''); setResult(saved); }}>Load</button>
                        <button className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 flex items-center justify-center"
                          onClick={()=>{ if(window.confirm('Delete?')){ deleteCalculatorResult(saved.id); setSavedResults(getCalculatorResults()); }}}>
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

      {/* Help Modal */}
      {showKit && result && matchingInverters.length > 0 && matchingBatteries.length > 0 && (
        <KitModal
          inverters={inverters} batteries={batteries} solarPanels={solarPanels}
          matchingInverters={matchingInverters} matchingBatteries={matchingBatteries}
          matchingSolarPanels={matchingSolarPanels as any[]}
          result={result} country={country} includeSolar={includeSolar}
          solarInstallType={solarInstallType} solarAzimuth={solarAzimuth}
          solarTilt={solarTilt} roofArea={roofArea} tariffOverride={tariffOverrideForEcon}
          onClose={() => setShowKit(false)}
        />
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(0,0,0,0.6)' }} onClick={()=>setShowHelpModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-900">Calculator Guide</h2>
              <button onClick={()=>setShowHelpModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                ['📋 Monthly Consumption','Find on your electricity bill (kWh/month). For annual figures divide by 12. Use winter month for worst-case sizing.'],
                ['⏱️ Backup Hours','How long battery should run during outages. 8h = overnight, 24h = full autonomy. The calculator assumes even load distribution.'],
                ['📍 Region','Adjusts solar irradiation factors and cold-climate battery buffer for your location.'],
                ['☀️ Include Solar','Toggle to include solar panel sizing. Disable for battery+inverter-only systems.'],
                ['⚙️ Advanced Settings','Peak Load Factor (default 3×) — max vs avg load ratio. Or enter Max Power directly. Inverter Efficiency 90–96%. Cable Losses 1–5%.'],
                ['⚡ Electricity Prices','Live prices from Energi Data Service (Denmark/Nordics). Shows today\'s hourly chart and 7-day history.'],
                ['💶 Your tariff (optional)', t('calc_guide_user_tariff')],
                ['💰 Economic Analysis','Calculates annual savings, payback period, 25-year ROI and CO₂ reduction based on regional tariffs and subsidies (or your entered prices).'],
              ].map(([title,desc])=>(
                <div key={title} className="space-y-1">
                  <div className="font-black text-slate-800 text-sm">{title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100">
              <button onClick={()=>setShowHelpModal(false)} className="px-5 py-2 rounded-xl bg-[#059669] text-white text-xs font-black uppercase tracking-widest hover:bg-[#047857]">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

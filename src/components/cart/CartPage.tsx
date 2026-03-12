import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { IMAGE_FALLBACK } from '../../utils/constants';
import { AppView } from '../../types';
import { Plus, Minus, ShoppingBag, ArrowRight, UserCheck, UserPlus, UserCircle, ChevronLeft, Trash2, Check, ShieldAlert, FileText, Loader2, ChevronDown, Info } from 'lucide-react';
import { LocalizedText } from '../../types';
import { DualPrice } from '../PriceDisplay';
import { exportCartDocx } from '../../utils/docExport';

const useLocalizedText = () => {
  const { language } = useLanguage();
  return (text: LocalizedText | null | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['en'] || Object.values(text as any)[0] || '';
  };
};

interface CartPageProps { onCheckout: () => void; }

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, removeItem, totalPrice, isVatEnabled, setVatEnabled } = useCart();
  const { t, formatPrice, language } = useLanguage();
  const { currentUser } = useUser();
  const getLoc = useLocalizedText();

  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const [docLoading, setDocLoading]         = useState(false);
  const [expandedSpecs, setExpandedSpecs]   = useState<Set<string>>(new Set());

  const toggleSpecs = (id: string) => {
    setExpandedSpecs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePlaceOrder = () => {
    if (currentUser) onCheckout();
    else setShowAuthChoice(true);
  };

  const handleExportWord = async () => {
    setDocLoading(true);
    try {
      await exportCartDocx(items.map(item => ({
        ...item,
        name: typeof item.name === 'string' ? item.name : (item.name as any)?.en || (item.name as any)?.da || '',
        parts: item.parts?.map((p: any) => ({ name: p.name, quantity: p.quantity, price: p.price })),
      })));
    } catch (e) { console.error(e); }
    finally { setDocLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-24 animate-fade-in bg-white rounded-[3rem] border border-slate-100 shadow-xl max-w-4xl mx-auto">
        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
          <ShoppingBag className="text-slate-200" size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-3 uppercase tracking-tighter">{t('empty_cart')}</h2>
        <p className="text-slate-400 mb-8 max-w-xs mx-auto font-bold uppercase text-[10px] tracking-widest leading-relaxed">{t('cart_empty_desc')}</p>
      </div>
    );
  }

  if (showAuthChoice) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in py-6 text-left">
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8">
          <button onClick={() => setShowAuthChoice(false)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase text-[10px] tracking-widest transition-all mb-2">
            <ChevronLeft size={16} /> {t('back_to_cart')}
          </button>
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{t('checkout_identify')}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em] leading-relaxed">
              {language === 'da' ? 'Vi anbefaler at bruge en profil for sikre betalinger og ordrehistorik.' : 'We recommend using a profile for secure card payments and order history.'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button onClick={onCheckout} className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-emerald-500 transition-all flex items-center gap-6 text-left">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors"><UserCircle size={28} /></div>
              <div>
                <div className="text-base font-black text-slate-900 uppercase tracking-tight">{t('identify_guest')}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('identify_guest_desc')}</div>
              </div>
              <ArrowRight className="ml-auto text-slate-200 group-hover:translate-x-1 transition-transform" size={24} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))} className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-blue-500 transition-all flex flex-col gap-3 text-left">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><UserCheck size={22} /></div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{t('cabinet_login')}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('identify_login_desc')}</div>
                </div>
              </button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: AppView.CABINET }))} className="group p-6 rounded-3xl border-2 border-slate-100 hover:border-yellow-500 transition-all flex flex-col gap-3 text-left">
                <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center"><UserPlus size={22} /></div>
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{t('cabinet_register')}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{t('identify_reg_desc')}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vatBtnActive   = 'w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between border-emerald-500 bg-emerald-900';
  const vatBtnInactive = 'w-full p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between border-slate-700 bg-slate-800 hover:border-slate-600';
  const checkActive    = 'w-8 h-8 rounded-full flex items-center justify-center border-2 bg-emerald-500 border-emerald-500 text-white';
  const checkInactive  = 'w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-600 text-transparent';

  return (
    <div className="max-w-7xl mx-auto px-4 text-left pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Items list */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
              <ShoppingBag className="text-emerald-500" size={32} /> {t('cart_title')}
            </h2>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{items.length} {t('units')}</span>
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const isExpanded = expandedSpecs.has(item.id);
              const parts      = Array.isArray(item.parts) ? item.parts : [];
              const features   = Array.isArray(item.features) ? item.features : [];
              const desc       = typeof item.description === 'string'
                ? item.description
                : (item.description as any)?.en || (item.description as any)?.da || '';

              // Build specs from typed DB fields based on category
              const buildSpecs = (it: any): { label: string; value: string }[] => {
                const add = (label: string, val: any, unit = '') =>
                  val !== undefined && val !== null && val !== ''
                    ? [{ label, value: `${val}${unit}` }]
                    : [];

                const cat = (it.category || '').toLowerCase();

                if (cat.includes('batteri')) return [
                  ...add('Brand',        it.BrandProd),
                  ...add('Model',        it.ModelName),
                  ...add('Chemistry',    it.BattChem),
                  ...add('Type',         it.BattType),
                  ...add('Capacity',     it.CapKwh,     ' kWh'),
                  ...add('Voltage',      it.NomVoltV,   ' V'),
                  ...add('Cycle Life',   it.CycleLife),
                  ...add('Max Cur.',     it.MaxChgDchgCur_A, ' A'),
                  ...add('Scalable',     it.Scalab),
                  ...add('Temp Range',   it.OpTempC),
                  ...add('BMS',          it.BmsInt),
                  ...add('Certs',        it.BattCert),
                  ...add('Dimensions',   it.DimsMm,     ' mm'),
                  ...add('Weight',       it.WgtKg,      ' kg'),
                ];
                if (cat.includes('inverter') || cat.includes('invertere')) return [
                  ...add('Brand',        it.BrandProd),
                  ...add('Model',        it.ModelName),
                  ...add('Type',         it.InvType),
                  ...add('Phases',       it.Phases),
                  ...add('Max Eff.',     it.MaxEffPerc, ' %'),
                  ...add('MPPTs',        it.NumMppts),
                  ...add('MPPT Range',   it.MpptVoltRangeV, ' V'),
                  ...add('Max PV Volt',  it.MaxPvInVoltV,   ' V'),
                  ...add('Protocol',     it.CommProt),
                  ...add('Protection',   it.IntProt),
                  ...add('IP Rating',    it.IpRating),
                ];
                if (cat.includes('solar') || cat.includes('panel')) return [
                  ...add('Brand',        it.BrandProd),
                  ...add('Model',        it.ModelName),
                  ...add('Type',         it.SolarPanelType),
                  ...add('Cell Tech',    it.CellTech),
                  ...add('Power',        it.RatedPwrWp, ' Wp'),
                  ...add('Efficiency',   it.ModEffPerc, ' %'),
                  ...add('Temp Coeff',   it.TempCoeffPmax),
                  ...add('Glass',        it.GlassType),
                  ...add('Prod. Warr.', it.ProdWarrYrs, ' yrs'),
                  ...add('Perf. Warr.', it.PerfWarrYrs, ' yrs'),
                ];
                if (cat.includes('varmepumpe') || cat.includes('heat')) return [
                  ...add('Brand',        it.BrandProd),
                  ...add('Model',        it.ModelName),
                  ...add('Type',         it.HpType),
                  ...add('Phases',       it.Phases1),
                  ...add('Refrigerant',  it.RefrType),
                  ...add('Heat Cap.',    it.HeatCapKw, ' kW'),
                  ...add('SCOP 35°C',   it.Scop35C),
                  ...add('Max Flow T.',  it.MaxFlowTempC, ' °C'),
                  ...add('Sound',        it.SndPwrDba,    ' dBA'),
                ];
                if (cat.includes('ev') || cat.includes('charger') || cat.includes('power station')) return [
                  ...add('Brand',        it.BrandProd),
                  ...add('Model',        it.ModelName),
                  ...add('Power',        it.ChgPwrKw,  ' kW'),
                  ...add('Connector',    it.ConnType),
                  ...add('Auth.',        it.AuthMeth),
                  ...add('OCPP',         it.OcppVer),
                  ...add('Dyn. Load',    it.DynLoadMng),
                  ...add('V2G',          it.V2gSupp),
                  ...add('Protection',   it.ChgProtRcd),
                  ...add('MID Meter',    it.MidMet),
                ];
                // Fallback — generic specs array
                const specArr = Array.isArray(it.specs) ? it.specs : [];
                return specArr.map((s: any) => ({ label: s.label || '', value: String(s.value || '') }));
              };

              const dbSpecs = buildSpecs(item);

              return (
                <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:border-emerald-400 transition-all group/item">

                  <div className="p-5 flex flex-col sm:flex-row gap-5 items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-2">
                      <img src={item.image || IMAGE_FALLBACK} alt={getLoc(item.name)} className="max-w-full max-h-full object-contain group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight truncate max-w-[250px]">{getLoc(item.name)}</h3>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3">{t('cat_' + item.category)}</p>
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100 shadow-inner w-fit">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 transition-all"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => {
                            const next = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                            if (!Number.isFinite(next)) return;
                            const safe = Math.max(1, next);
                            const delta = safe - item.quantity;
                            if (delta !== 0) updateQuantity(item.id, delta);
                          }}
                          className="w-12 text-center font-black text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 transition-all"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 min-w-[140px]">
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        <button
                          onClick={() => toggleSpecs(item.id)}
                          title={isExpanded ? 'Collapse' : 'View details'}
                          className={isExpanded
                            ? 'p-2 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200'
                            : 'p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 transition-all'}
                        >
                          <Info size={18} />
                        </button>
                      </div>
                      <DualPrice priceExVat={(item.price ?? 0) * item.quantity} align="right" />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-5 space-y-5">

                      {/* Base info row */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {item.manufacturer && (
                          <div className="flex flex-col py-2 px-3 rounded-xl border bg-white border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Manufacturer</span>
                            <span className="text-[10px] font-black text-slate-900 mt-0.5">{item.manufacturer || item.BrandProd}</span>
                          </div>
                        )}
                        {item.stock !== undefined && (
                          <div className="flex flex-col py-2 px-3 rounded-xl border bg-white border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">In Stock</span>
                            <span className={`text-[10px] font-black mt-0.5 ${(item.stock || 0) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {(item.stock || 0) > 0 ? `${item.stock} units` : 'Out of stock'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {desc && (
                        <div className="space-y-1.5">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</div>
                          <p className="text-[10px] text-slate-600 leading-relaxed bg-white px-3 py-2 rounded-xl border border-slate-100">{desc}</p>
                        </div>
                      )}

                      {/* Kit parts */}
                      {parts.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kit Components</div>
                          <div className="space-y-1.5">
                            {parts.map((p: any, i: number) => (
                              <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-slate-100">
                                <span className="text-[10px] font-black text-slate-700 uppercase">{p.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] text-slate-400 font-bold">x{p.quantity}</span>
                                  <DualPrice priceExVat={p.price * p.quantity} showLabels={false} align="right" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Technical specs from DB fields */}
                      {dbSpecs.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Technical Specifications</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {dbSpecs.map((s, i) => (
                              <div key={i} className={i % 2 === 0
                                ? 'flex flex-col py-2 px-3 rounded-xl border bg-emerald-50 border-emerald-100'
                                : 'flex flex-col py-2 px-3 rounded-xl border bg-white border-slate-100'}>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                                <span className="text-[10px] font-black text-slate-900 mt-0.5">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      {features.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Key Features</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {features.map((f: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 py-2 px-3 bg-white rounded-xl border border-slate-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-[9px] font-bold text-slate-600">{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {dbSpecs.length === 0 && features.length === 0 && parts.length === 0 && !desc && (
                        <p className="text-[9px] text-slate-400 italic text-center py-2">No additional details available.</p>
                      )}

                      <button onClick={() => toggleSpecs(item.id)} className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                        <ChevronDown size={12} className="rotate-180" /> Collapse
                      </button>
                    </div>
                  )}
                </div>
              );
            })}


          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-3xl border border-white/5 space-y-10 sticky top-24">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-tighter">{t('cart_summary')}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Vælg din faktureringsmetode</p>
            </div>

            <div className="space-y-4">
              <button onClick={() => setVatEnabled(false)} className={!isVatEnabled ? vatBtnActive : vatBtnInactive}>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ekskl. moms (0%)</span>
                  <span className="text-xl font-black tracking-tighter">{formatPrice(totalPrice)}</span>
                </div>
                <div className={!isVatEnabled ? checkActive : checkInactive}><Check size={16} strokeWidth={4} /></div>
              </button>

              <button onClick={() => setVatEnabled(true)} className={isVatEnabled ? vatBtnActive : vatBtnInactive}>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inkl. moms (25%)</span>
                  <span className="text-xl font-black tracking-tighter text-emerald-400">{formatPrice(totalPrice * 1.25)}</span>
                </div>
                <div className={isVatEnabled ? checkActive : checkInactive}><Check size={16} strokeWidth={4} /></div>
              </button>
            </div>

            {!isVatEnabled && (
              <div className="bg-rose-950 border border-rose-800 p-6 rounded-3xl flex gap-4">
                <ShieldAlert className="text-rose-500 shrink-0" size={24} />
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Vigtig Information</div>
                  <p className="text-[10px] font-bold text-rose-300 leading-relaxed uppercase tracking-wider">
                    {language === 'da' ? 'Ved køb uden moms skal du have et gyldigt europæisk moms-certifikat (VAT number).' : 'When purchasing without VAT, you must have a valid European VAT certificate.'}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-700 space-y-4">
              <div className="text-right space-y-1">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{t('cart_total_value')}</div>
                <div className="text-4xl font-black text-white tracking-tighter">
                  {formatPrice(totalPrice)}
                  <span className="text-[10px] text-slate-500 ml-2 uppercase tracking-widest">Ekskl. moms</span>
                </div>
                <div className="text-xl font-black text-emerald-400 tracking-tighter">
                  {formatPrice(totalPrice * 1.25)}
                  <span className="text-[10px] text-emerald-600 ml-2 uppercase tracking-widest">Inkl. moms</span>
                </div>
              </div>

              <button onClick={handleExportWord} disabled={docLoading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50">
                {docLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Download Word (.docx)
              </button>

              <button onClick={handlePlaceOrder}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95">
                {t('cart_checkout_btn')} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

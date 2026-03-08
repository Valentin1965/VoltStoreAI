import React from 'react';
import { Plus, Edit, Trash2, X, Save, Layers, Search, Settings, Database, Image as ImageIconLucide,
  FileText, ExternalLink, ListPlus, Minus, Package, ShieldCheck,
  LayoutGrid, Filter as FilterIcon, RefreshCcw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Marker } from '../MarkerComponent.tsx';
import { DualPrice } from '../PriceDisplay';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { supabase } from '../../services/supabase';
import { ProductSpec, ProductDoc, KitComponent, Category } from '../../types';
import { categoryToTable, emptyLoc, IMAGE_FALLBACK, ModalTab } from './adminTypes';
import { useMemo } from 'react';

interface AdminProductModalProps {
  editingProduct: any | null;
  formData: any;
  setFormData: (d: any) => void;
  modalTab: ModalTab;
  setModalTab: (t: ModalTab) => void;
  localImages: string[];
  setLocalImages: (v: string[]) => void;
  localSpecs: ProductSpec[];
  setLocalSpecs: (v: ProductSpec[]) => void;
  localDocs: any[];
  setLocalDocs: (v: any[]) => void;
  localKitComponents: KitComponent[];
  setLocalKitComponents: (v: KitComponent[]) => void;
  selectedImageFiles: File[];
  setSelectedImageFiles: (v: File[]) => void;
  allProducts: any[];
  editLang: Language;
  setEditLang: (l: Language) => void;
  // kit builder filters
  compSearch: string; setCompSearch: (v: string) => void;
  compCategoryFilter: Category | 'All'; setCompCategoryFilter: (v: Category | 'All') => void;
  compBrandFilter: string; setCompBrandFilter: (v: string) => void;
  compModelFilter: string; setCompModelFilter: (v: string) => void;
  compBattTypeFilter: string; setCompBattTypeFilter: (v: string) => void;
  compCapKwhFilter: string; setCompCapKwhFilter: (v: string) => void;
  compInvTypeFilter: string; setCompInvTypeFilter: (v: string) => void;
  compPhasesFilter: string; setCompPhasesFilter: (v: string) => void;
  compNumMpptsFilter: string; setCompNumMpptsFilter: (v: string) => void;
  compHpTypeFilter: string; setCompHpTypeFilter: (v: string) => void;
  compPhases1Filter: string; setCompPhases1Filter: (v: string) => void;
  compRefrTypeFilter: string; setCompRefrTypeFilter: (v: string) => void;
  compHeatCapKwFilter: string; setCompHeatCapKwFilter: (v: string) => void;
  compSolarPanelTypeFilter: string; setCompSolarPanelTypeFilter: (v: string) => void;
  compRatedPwrWpFilter: string; setCompRatedPwrWpFilter: (v: string) => void;
  compChgPwrKwFilter: string; setCompChgPwrKwFilter: (v: string) => void;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  editingProduct, formData, setFormData, modalTab, setModalTab,
  localImages, setLocalImages, localSpecs, setLocalSpecs, localDocs, setLocalDocs,
  localKitComponents, setLocalKitComponents, selectedImageFiles, setSelectedImageFiles,
  allProducts, editLang, setEditLang,
  compSearch, setCompSearch, compCategoryFilter, setCompCategoryFilter,
  compBrandFilter, setCompBrandFilter, compModelFilter, setCompModelFilter,
  compBattTypeFilter, setCompBattTypeFilter, compCapKwhFilter, setCompCapKwhFilter,
  compInvTypeFilter, setCompInvTypeFilter, compPhasesFilter, setCompPhasesFilter,
  compNumMpptsFilter, setCompNumMpptsFilter, compHpTypeFilter, setCompHpTypeFilter,
  compPhases1Filter, setCompPhases1Filter, compRefrTypeFilter, setCompRefrTypeFilter,
  compHeatCapKwFilter, setCompHeatCapKwFilter, compSolarPanelTypeFilter, setCompSolarPanelTypeFilter,
  compRatedPwrWpFilter, setCompRatedPwrWpFilter, compChgPwrKwFilter, setCompChgPwrKwFilter,
  onClose, onSaved,
}) => {
  const { categories } = useProducts();
  const { addNotification } = useNotification();
  const { getLoc, t } = useLanguage();

  // ── Kit builder derived data ─────────────────────────────────────────
  const compCategoryProducts = useMemo(() => {
    if (compCategoryFilter === 'All') return allProducts.filter(p => p.category !== 'Sæt');
    return allProducts.filter(p => p.category === compCategoryFilter);
  }, [allProducts, compCategoryFilter]);

  const compAvailableBrands = useMemo(() =>
    Array.from(new Set(compCategoryProducts.map(p => p.manufacturer || p.BrandProd).filter(Boolean) as string[])).sort(),
  [compCategoryProducts]);

  const compBrandFilteredProducts = useMemo(() => {
    if (!compBrandFilter) return compCategoryProducts;
    return compCategoryProducts.filter(p => (p.BrandProd || p.manufacturer || '').toLowerCase().includes(compBrandFilter.toLowerCase()));
  }, [compCategoryProducts, compBrandFilter]);

  const compAvailableModels = useMemo(() => {
    if (!compBrandFilter) return [];
    return Array.from(new Set(compBrandFilteredProducts.map(p => p.ModelName).filter(Boolean) as string[])).sort();
  }, [compBrandFilteredProducts, compBrandFilter]);

  const compAvailableBattTypes     = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.BattType).filter(Boolean)      as string[])).sort(), [compCategoryProducts]);
  const compAvailableCapKwh        = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.CapKwh).filter(Boolean)         as string[])).sort(), [compCategoryProducts]);
  const compAvailableInvTypes      = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.InvType).filter(Boolean)        as string[])).sort(), [compCategoryProducts]);
  const compAvailablePhases        = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.Phases).filter(Boolean)         as string[])).sort(), [compCategoryProducts]);
  const compAvailableNumMppts      = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.NumMppts).filter(Boolean)       as string[])).sort(), [compCategoryProducts]);
  const compAvailableHpTypes       = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.HpType).filter(Boolean)         as string[])).sort(), [compCategoryProducts]);
  const compAvailablePhases1       = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.Phases1).filter(Boolean)        as string[])).sort(), [compCategoryProducts]);
  const compAvailableRefrType      = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.RefrType).filter(Boolean)       as string[])).sort(), [compCategoryProducts]);
  const compAvailableHeatCapKw     = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.HeatCapKw).filter(Boolean)      as string[])).sort(), [compCategoryProducts]);
  const compAvailableSolarPanelTypes = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.SolarPanelType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableRatedPwrWp    = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.RatedPwrWp).filter(Boolean)     as string[])).sort(), [compCategoryProducts]);
  const compAvailableChgPwrKw      = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.ChgPwrKw).filter(Boolean)       as string[])).sort(), [compCategoryProducts]);

  const filteredCompProducts = useMemo(() => {
    return compBrandFilteredProducts.filter(p => {
      if (p.id === editingProduct?.id) return false;
      if (compSearch && !(p.ModelName || getLoc(p.name)).toLowerCase().includes(compSearch.toLowerCase())) return false;
      if (compModelFilter && p.ModelName !== compModelFilter) return false;
      if (compCategoryFilter === 'Batterier') {
        if (compBattTypeFilter && p.BattType !== compBattTypeFilter) return false;
        if (compCapKwhFilter && String(p.CapKwh) !== compCapKwhFilter) return false;
      }
      if (compCategoryFilter === 'Invertere') {
        if (compInvTypeFilter && p.InvType !== compInvTypeFilter) return false;
        if (compPhasesFilter && String(p.Phases) !== compPhasesFilter) return false;
        if (compNumMpptsFilter && String(p.NumMppts) !== compNumMpptsFilter) return false;
      }
      if (compCategoryFilter === 'Varmepumper') {
        if (compHpTypeFilter && p.HpType !== compHpTypeFilter) return false;
        if (compPhases1Filter && String(p.Phases1) !== compPhases1Filter) return false;
        if (compRefrTypeFilter && p.RefrType !== compRefrTypeFilter) return false;
        if (compHeatCapKwFilter && String(p.HeatCapKw) !== compHeatCapKwFilter) return false;
      }
      if (compCategoryFilter === 'Solpaneler') {
        if (compSolarPanelTypeFilter && p.SolarPanelType !== compSolarPanelTypeFilter) return false;
        if (compRatedPwrWpFilter && String(p.RatedPwrWp) !== compRatedPwrWpFilter) return false;
      }
      if (compCategoryFilter === 'Power Station') {
        if (compChgPwrKwFilter && String(p.ChgPwrKw) !== compChgPwrKwFilter) return false;
      }
      return true;
    });
  }, [compBrandFilteredProducts, editingProduct, compSearch, getLoc, compModelFilter, compCategoryFilter,
    compBattTypeFilter, compCapKwhFilter, compInvTypeFilter, compPhasesFilter, compNumMpptsFilter,
    compHpTypeFilter, compPhases1Filter, compRefrTypeFilter, compHeatCapKwFilter,
    compSolarPanelTypeFilter, compRatedPwrWpFilter, compChgPwrKwFilter]);

  const resetKitFilters = () => {
    setCompCategoryFilter('All'); setCompBrandFilter(''); setCompModelFilter('');
    setCompSearch(''); setCompBattTypeFilter(''); setCompCapKwhFilter('');
    setCompInvTypeFilter(''); setCompPhasesFilter(''); setCompNumMpptsFilter('');
    setCompHpTypeFilter(''); setCompPhases1Filter(''); setCompRefrTypeFilter('');
    setCompHeatCapKwFilter(''); setCompSolarPanelTypeFilter(''); setCompRatedPwrWpFilter('');
    setCompChgPwrKwFilter('');
  };

  // ── Upload helpers ────────────────────────────────────────────────────
  const uploadFileToSupabase = async (file: File, folder: string): Promise<string | null> => {
    const ext  = file.name.split('.').pop();
    const path = `${folder}/${uuidv4()}.${ext}`;
    try {
      const { error } = await supabase.storage.from('product-assets').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) { addNotification(`Error uploading ${file.name}: ${error.message}`, 'error'); return null; }
      const { data } = supabase.storage.from('product-assets').getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      addNotification(`Error uploading ${file.name}: ${err.message}`, 'error');
      return null;
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const category    = formData.category;
    const targetTable = categoryToTable[category] || 'products';

    let finalImageUrls: string[] = [];
    if (selectedImageFiles.length > 0) {
      const uploads = await Promise.all(selectedImageFiles.map(f => uploadFileToSupabase(f, 'images')));
      finalImageUrls = uploads.filter(Boolean) as string[];
    } else {
      finalImageUrls = localImages.filter(u => u && u.trim() !== '');
    }

    let finalDocObjects: ProductDoc[] = [];
    for (const doc of localDocs) {
      if (doc.file) {
        const url = await uploadFileToSupabase(doc.file, 'docs');
        if (url) finalDocObjects.push({ title: doc.title || doc.file.name, url });
      } else if (doc.url?.trim()) {
        finalDocObjects.push({ title: doc.title || 'Document', url: doc.url });
      }
    }

    const tableFields: Record<string, string[]> = {
      batteries:   ['BrandProd','ModelName','SkuShopId','PriceEurExVat','StockLvl','BattType','BattChem','CapKwh','NomVoltV','CycleLife','MaxChgDchgCur_A','Scalab','OpTempC','BmsInt','BattCert','DimsMm','WgtKg','name','description','image','images','docs','specs','is_active','is_leader'],
      inverters:   ['BrandProd','ModelName','SkuShopId','PriceEurExVat','StockLvl','InvType','Phases','MaxEffPerc','NumMppts','MpptVoltV','MaxPvInVoltV','CommProt','IntProt','IpRating','DimsMm','WgtKg','name','description','image','images','docs','specs','is_active','is_leader'],
      solar_panels:['BrandProd','ModelName','SkuShopId','PriceEurExVat','StockLvl','SolarPanelType','CellTech','RatedPwrWp','ModEffPerc','TempCoeffPmax','GlassType','ProdWarrYrs','PerfWarrYrs','DimsMm','WgtKg','name','description','image','images','docs','specs','is_active','is_leader'],
      ev_chargers: ['BrandProd','ModelName','SkuShopId','PriceEurExVat','StockLvl','ChgPwrKw','ConnType','AuthMeth','OcppVer','DynLoadMng','V2gSupp','ChgProtRcd','MidMet','DimsMm','WgtKg','name','description','image','images','docs','specs','is_active','is_leader'],
      heat_pumps:  ['BrandProd','ModelName','SkuShopId','PriceEurExVat','StockLvl','HpType','Phases1','RefrType','HeatCapKw','Scop35C','MaxFlowTempC','SndPwrDba','DimsMm','WgtKg','name','description','image','images','docs','specs','is_active','is_leader'],
      kits:        ['name','power_kw','phases','description','components','total_price','image','images','docs','specs','is_active','is_leader'],
      products:    ['name','description','category','price','stock','image','images','specs','docs','is_active','is_leader'],
    };

    const allowed = tableFields[targetTable] || [];
    const payload: any = {};
    allowed.forEach(f => { if (formData[f] !== undefined) payload[f] = formData[f]; });
    payload.name        = formData.name        || { en: formData.ModelName || '' };
    payload.description = formData.description || emptyLoc();
    payload.image       = finalImageUrls[0] || null;
    payload.images      = finalImageUrls;
    payload.docs        = finalDocObjects;
    payload.specs       = localSpecs.filter(s => s.label?.trim());

    if (targetTable === 'kits') {
      payload.components  = localKitComponents.map(c => ({ component_id: c.id, name: c.name, price: c.price, quantity: c.quantity }));
      payload.total_price = localKitComponents.reduce((s, c) => s + c.price * c.quantity, 0);
    }

    try {
      if (editingProduct) {
        const rawId  = editingProduct.realId || editingProduct.id;
        const realId = typeof rawId === 'string' && rawId.includes('-') ? rawId.split('-')[1] : rawId;
        const { error } = await supabase.from(targetTable).update(payload).eq('id', realId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(targetTable).insert([payload]);
        if (error) throw error;
      }
      addNotification('Registry Updated', 'success');
      onClose();
      onSaved();
    } catch (err: any) {
      addNotification(err.message || 'DB Sync Error', 'error');
    }
  };

  const addComponentToKit = (p: any) => {
    if (localKitComponents.find(c => c.id === p.id)) return;
    setLocalKitComponents([...localKitComponents, { id: p.id, name: p.ModelName || getLoc(p.name), price: p.PriceEurExVat || p.price, quantity: 1 }]);
  };
  const removeComponentFromKit = (id: string) => setLocalKitComponents(localKitComponents.filter(c => c.id !== id));

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col max-h-[95vh] animate-modal-in overflow-hidden">

        {/* Header */}
        <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2 rounded-lg text-emerald-500"><Settings size={18} /></div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              {formData.category === 'Sæt' ? 'Kit Assembly Panel' : 'Asset Configuration Panel'}
            </h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {formData.category === 'Sæt' ? (
            (['main', 'kit_builder'] as const).map(tab => (
              <button key={tab} onClick={() => setModalTab(tab)}
                className={`flex-1 py-5 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${modalTab === tab ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab === 'main' ? 'Kit Identity' : 'Component Assembly'}
              </button>
            ))
          ) : (
            (['main', 'media', 'specs'] as const).map(tab => (
              <button key={tab} onClick={() => setModalTab(tab)}
                className={`flex-1 py-5 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${modalTab === tab ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab === 'main' ? 'Main Info' : tab === 'media' ? 'Media' : 'Specifications'}
              </button>
            ))
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 text-left">
          <div className="space-y-10 animate-fade-in">

            {/* ── TAB MAIN ─────────────────────────────────────────── */}
            {modalTab === 'main' && (
              <div className="space-y-10 animate-fade-in">
                {formData.category !== 'Sæt' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Asset Class (Target Table)</label>
                      <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="input-premium appearance-none bg-white" disabled={!!editingProduct}>
                        {Object.keys(categoryToTable).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Brand (BrandProd)</label>
                      <input value={formData.BrandProd || ''} onChange={e => setFormData({ ...formData, BrandProd: e.target.value })}
                        className="input-premium bg-white" placeholder="e.g. Huawei, Victron, Daikin..." />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Localization Matrix</h4>
                      <div className="flex gap-1.5">
                        {(['da','en','no','se'] as Language[]).map(l => (
                          <button key={l} type="button" onClick={() => setEditLang(l)}
                            className={`w-9 h-9 rounded-xl text-[9px] font-black uppercase transition-all ${editLang === l ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Display Name / Model Name ({editLang})</label>
                        <input required
                          value={formData.category === 'Sæt' ? (formData.name?.[editLang] || '') : (formData.ModelName || '')}
                          onChange={e => {
                            if (formData.category === 'Sæt') setFormData({ ...formData, name: { ...formData.name, [editLang]: e.target.value } });
                            else setFormData({ ...formData, ModelName: e.target.value });
                          }}
                          className="input-premium" placeholder={formData.category === 'Sæt' ? 'e.g. Premium Solar Kit' : 'e.g. SUN2000-10KTL-M1'} />
                      </div>

                      {formData.category === 'Sæt' ? (
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Power (kW)</label>
                            <input type="number" step="0.1" value={formData.power_kw || 0}
                              onChange={e => setFormData({ ...formData, power_kw: Number(e.target.value) })} className="input-premium" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Phases</label>
                            <select value={formData.phases || 3} onChange={e => setFormData({ ...formData, phases: Number(e.target.value) })} className="input-premium">
                              <option value={1}>1 Phase</option>
                              <option value={3}>3 Phases</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Main Image</label>
                              <input type="file" accept="image/*"
                                onChange={e => setSelectedImageFiles(e.target.files ? [e.target.files[0]] : [])}
                                className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                              {selectedImageFiles[0] && <img src={URL.createObjectURL(selectedImageFiles[0])} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-xl" />}
                              {formData.image && !selectedImageFiles[0] && <img src={formData.image} alt="Current" className="mt-2 w-24 h-24 object-cover rounded-xl" />}
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Gallery Images</label>
                              <input type="file" accept="image/*" multiple
                                onChange={e => setSelectedImageFiles(Array.from(e.target.files || []))}
                                className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedImageFiles.map((file, i) => <img key={i} src={URL.createObjectURL(file)} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />)}
                                {formData.images && !selectedImageFiles.length && formData.images.map((img: string, i: number) => <img key={i} src={img} alt="Current" className="w-16 h-16 object-cover rounded-xl" />)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Price Ex. VAT (EUR)</label>
                              <input type="number" step="0.01" value={formData.PriceEurExVat || 0}
                                onChange={e => setFormData({ ...formData, PriceEurExVat: Number(e.target.value) })} className="input-premium" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Stock Level</label>
                              <input type="number" value={formData.StockLvl || 0}
                                onChange={e => setFormData({ ...formData, StockLvl: Number(e.target.value) })} className="input-premium" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Short Description ({editLang})</label>
                      <textarea value={formData.description?.[editLang] || ''}
                        onChange={e => setFormData({ ...formData, description: { ...formData.description, [editLang]: e.target.value } })}
                        className="input-premium min-h-[150px] py-4" placeholder="Brief technical summary..." />
                    </div>
                    <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-900">Visibility Status</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Show in public catalog</div>
                      </div>
                      <button type="button" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <div className="text-[10px] font-black uppercase text-slate-900">Sales Leader</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Mark as best seller</div>
                      </div>
                      <button type="button" onClick={() => setFormData({ ...formData, is_leader: !formData.is_leader })}
                        className={`w-14 h-8 rounded-full transition-all relative ${formData.is_leader ? 'bg-amber-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.is_leader ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB MEDIA ─────────────────────────────────────────── */}
            {modalTab === 'media' && (
              <div className="space-y-10 animate-fade-in">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Image Gallery (URLs)</h4>
                  <div className="space-y-4">
                    {localImages.map((url, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="flex-1 relative">
                          <ImageIconLucide size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input value={url} onChange={e => { const n = [...localImages]; n[idx] = e.target.value; setLocalImages(n); }}
                            className="input-premium pl-12 bg-white" placeholder="https://..." />
                        </div>
                        <button type="button" onClick={() => setLocalImages(localImages.filter((_, i) => i !== idx))}
                          className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setLocalImages([...localImages, ''])}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                      + Add Image Slot
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">PDF Documentation</h4>
                  <div className="space-y-4">
                    {localDocs.map((doc, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="relative">
                            <FileText size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input value={doc.title} onChange={e => { const n = [...localDocs]; n[idx].title = e.target.value; setLocalDocs(n); }}
                              className="w-full input-premium pl-12 bg-white" placeholder="Document Title (e.g. Datasheet)" />
                          </div>
                          <div className="relative flex items-center">
                            {doc.url ? (
                              <div className="flex items-center w-full relative">
                                <ExternalLink size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input value={doc.url} onChange={e => { const n = [...localDocs]; n[idx].url = e.target.value; setLocalDocs(n); }}
                                  className="w-full input-premium pl-12 bg-white" placeholder="https://...pdf" />
                              </div>
                            ) : (
                              <div className="flex items-center w-full">
                                {doc.file ? (
                                  <div className="w-full input-premium bg-white flex items-center justify-between">
                                    <span className="text-xs text-slate-600 truncate">{doc.file.name}</span>
                                    <button type="button" onClick={() => { const n = [...localDocs]; n[idx].file = undefined; setLocalDocs(n); }} className="text-rose-500 hover:text-rose-600"><X size={16} /></button>
                                  </div>
                                ) : (
                                  <input type="file" accept="application/pdf" onChange={e => { const file = e.target.files?.[0]; if (file) { const n = [...localDocs]; n[idx].file = file; if (!n[idx].title) n[idx].title = file.name.replace('.pdf', ''); setLocalDocs(n); } }}
                                    className="input-premium w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button type="button" onClick={() => setLocalDocs(localDocs.filter((_, i) => i !== idx))}
                          className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setLocalDocs([...localDocs, { title: '', url: '' }])}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                      + Add Document Slot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB SPECS ─────────────────────────────────────────── */}
            {modalTab === 'specs' && (
              <div className="space-y-10 animate-fade-in">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                    <Database size={14} /> Technical Schema: {formData.category}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.category === 'Batterier' && (<>
                      <input value={formData.BattType || ''} onChange={e => setFormData({...formData, BattType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="BattType (e.g. LFP)" />
                      <input value={formData.BattChem || ''} onChange={e => setFormData({...formData, BattChem: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="BattChem" />
                      <input type="number" value={formData.CapKwh || ''} onChange={e => setFormData({...formData, CapKwh: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="CapKwh" />
                      <input type="number" value={formData.NomVoltV || ''} onChange={e => setFormData({...formData, NomVoltV: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="NomVoltV" />
                    </>)}
                    {formData.category === 'Invertere' && (<>
                      <input value={formData.InvType || ''} onChange={e => setFormData({...formData, InvType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="InvType (Hybrid/On-Grid)" />
                      <input value={formData.Phases || ''} onChange={e => setFormData({...formData, Phases: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="Phases (1/3)" />
                      <input type="number" value={formData.MaxEffPerc || ''} onChange={e => setFormData({...formData, MaxEffPerc: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="MaxEffPerc" />
                      <input type="number" value={formData.NumMppts || ''} onChange={e => setFormData({...formData, NumMppts: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="NumMppts" />
                    </>)}
                    {formData.category === 'Solpaneler' && (<>
                      <input value={formData.SolarPanelType || ''} onChange={e => setFormData({...formData, SolarPanelType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="SolarPanelType" />
                      <input type="number" value={formData.RatedPwrWp || ''} onChange={e => setFormData({...formData, RatedPwrWp: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="RatedPwrWp" />
                      <input type="number" value={formData.ModEffPerc || ''} onChange={e => setFormData({...formData, ModEffPerc: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="ModEffPerc" />
                    </>)}
                    {formData.category === 'Power Station' && (<>
                      <input type="number" value={formData.ChgPwrKw || ''} onChange={e => setFormData({...formData, ChgPwrKw: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="ChgPwrKw" />
                      <input value={formData.ConnType || ''} onChange={e => setFormData({...formData, ConnType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="ConnType" />
                    </>)}
                    {formData.category === 'Varmepumper' && (<>
                      <input value={formData.HpType || ''} onChange={e => setFormData({...formData, HpType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="HpType" />
                      <input value={formData.RefrType || ''} onChange={e => setFormData({...formData, RefrType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="RefrType" />
                      <input type="number" value={formData.HeatCapKw || ''} onChange={e => setFormData({...formData, HeatCapKw: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="HeatCapKw" />
                    </>)}
                    <input value={formData.DimsMm || ''} onChange={e => setFormData({...formData, DimsMm: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="DimsMm (x*y*z)" />
                    <input type="number" value={formData.WgtKg || ''} onChange={e => setFormData({...formData, WgtKg: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="WgtKg" />
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Custom Specifications</h4>
                  <div className="space-y-4">
                    {localSpecs.map((s, idx) => (
                      <div key={idx} className="flex gap-4">
                        <input value={s.label} onChange={e => { const n = [...localSpecs]; n[idx].label = e.target.value; setLocalSpecs(n); }}
                          className="flex-1 input-premium bg-white !text-xs" placeholder="Label (e.g. Warranty)" />
                        <input value={s.value} onChange={e => { const n = [...localSpecs]; n[idx].value = e.target.value; setLocalSpecs(n); }}
                          className="flex-1 input-premium bg-white !text-xs" placeholder="Value (e.g. 10 Years)" />
                        <button type="button" onClick={() => setLocalSpecs(localSpecs.filter((_, i) => i !== idx))}
                          className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setLocalSpecs([...localSpecs, { label: '', value: '' }])}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                      + Add Specification
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB KIT BUILDER ───────────────────────────────────── */}
            {modalTab === 'kit_builder' && (
              <div className="space-y-12 animate-fade-in">
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                    <FilterIcon size={18} className="text-emerald-500" /> Catalog Filter
                  </h4>
                  <div className="flex flex-col gap-8 bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">1. Select Category</label>
                      <div className="flex gap-3 overflow-x-auto pb-4 flex-nowrap custom-scrollbar min-h-[60px]">
                        <Marker label="All" active={compCategoryFilter === 'All'} onClick={() => { setCompCategoryFilter('All'); setCompBrandFilter(''); setCompModelFilter(''); }} />
                        {categories.filter(c => c !== 'Sæt' && c !== 'All').map(c => (
                          <Marker key={c} label={t(`cat_${c}`)} active={compCategoryFilter === c} onClick={() => { setCompCategoryFilter(c); setCompBrandFilter(''); setCompModelFilter(''); }} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200/50">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">2. Filter by Brand</label>
                        <select value={compBrandFilter} onChange={e => { setCompBrandFilter(e.target.value); setCompModelFilter(''); }} className="input-premium !py-4 !text-xs bg-white shadow-sm">
                          <option value="">All Brands</option>
                          {compAvailableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">3. Select Model</label>
                        <div className="flex gap-3">
                          <select value={compModelFilter} onChange={e => setCompModelFilter(e.target.value)} className="input-premium !py-4 !text-xs bg-white flex-1 shadow-sm" disabled={!compBrandFilter}>
                            <option value="">All Models</option>
                            {compAvailableModels.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <button type="button" onClick={resetKitFilters} className="p-4 bg-white text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm border border-slate-100" title="Reset Filters">
                            <RefreshCcw size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {compCategoryFilter !== 'All' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-200/50">
                        {compCategoryFilter === 'Batterier' && (<>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Battery Type</label><div className="flex flex-wrap gap-2">{compAvailableBattTypes.map(t => <Marker key={t} label={t} active={compBattTypeFilter === t} onClick={() => setCompBattTypeFilter(compBattTypeFilter === t ? '' : t)} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Capacity (kWh)</label><div className="flex flex-wrap gap-2">{compAvailableCapKwh.map(c => <Marker key={c} label={String(c)} active={compCapKwhFilter === String(c)} onClick={() => setCompCapKwhFilter(compCapKwhFilter === String(c) ? '' : String(c))} color="slate" />)}</div></div>
                        </>)}
                        {compCategoryFilter === 'Invertere' && (<>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Inverter Type</label><div className="flex flex-wrap gap-2">{compAvailableInvTypes.map(t => <Marker key={t} label={t} active={compInvTypeFilter === t} onClick={() => setCompInvTypeFilter(compInvTypeFilter === t ? '' : t)} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Phases</label><div className="flex flex-wrap gap-2">{compAvailablePhases.map(p => <Marker key={p} label={String(p)} active={compPhasesFilter === String(p)} onClick={() => setCompPhasesFilter(compPhasesFilter === String(p) ? '' : String(p))} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">MPPTs</label><div className="flex flex-wrap gap-2">{compAvailableNumMppts.map(n => <Marker key={n} label={String(n)} active={compNumMpptsFilter === String(n)} onClick={() => setCompNumMpptsFilter(compNumMpptsFilter === String(n) ? '' : String(n))} color="slate" />)}</div></div>
                        </>)}
                        {compCategoryFilter === 'Varmepumper' && (<>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">HP Type</label><div className="flex flex-wrap gap-2">{compAvailableHpTypes.map(t => <Marker key={t} label={t} active={compHpTypeFilter === t} onClick={() => setCompHpTypeFilter(compHpTypeFilter === t ? '' : t)} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Phases</label><div className="flex flex-wrap gap-2">{compAvailablePhases1.map(p => <Marker key={p} label={String(p)} active={compPhases1Filter === String(p)} onClick={() => setCompPhases1Filter(compPhases1Filter === String(p) ? '' : String(p))} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Refrigerant</label><div className="flex flex-wrap gap-2">{compAvailableRefrType.map(r => <Marker key={r} label={r} active={compRefrTypeFilter === r} onClick={() => setCompRefrTypeFilter(compRefrTypeFilter === r ? '' : r)} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Heat Cap (kW)</label><div className="flex flex-wrap gap-2">{compAvailableHeatCapKw.map(h => <Marker key={h} label={String(h)} active={compHeatCapKwFilter === String(h)} onClick={() => setCompHeatCapKwFilter(compHeatCapKwFilter === String(h) ? '' : String(h))} color="slate" />)}</div></div>
                        </>)}
                        {compCategoryFilter === 'Solpaneler' && (<>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Panel Type</label><div className="flex flex-wrap gap-2">{compAvailableSolarPanelTypes.map(t => <Marker key={t} label={t} active={compSolarPanelTypeFilter === t} onClick={() => setCompSolarPanelTypeFilter(compSolarPanelTypeFilter === t ? '' : t)} color="slate" />)}</div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Power (Wp)</label><div className="flex flex-wrap gap-2">{compAvailableRatedPwrWp.map(p => <Marker key={p} label={String(p)} active={compRatedPwrWpFilter === String(p)} onClick={() => setCompRatedPwrWpFilter(compRatedPwrWpFilter === String(p) ? '' : String(p))} color="slate" />)}</div></div>
                        </>)}
                        {compCategoryFilter === 'Power Station' && (
                          <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Chg Power (kW)</label><div className="flex flex-wrap gap-2">{compAvailableChgPwrKw.map(p => <Marker key={p} label={String(p)} active={compChgPwrKwFilter === String(p)} onClick={() => setCompChgPwrKwFilter(compChgPwrKwFilter === String(p) ? '' : String(p))} color="slate" />)}</div></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                    <Package size={18} className="text-emerald-500" /> Available Components ({filteredCompProducts.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                    {filteredCompProducts.map(p => (
                      <div key={p.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-emerald-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-50 flex items-center justify-center">
                            <img src={p.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain" alt="" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase text-slate-900 leading-tight truncate">{p.ModelName || getLoc(p.name)}</div>
                            <DualPrice priceExVat={p.PriceEurExVat || p.price} showLabels={false} />
                          </div>
                        </div>
                        <button type="button" onClick={() => addComponentToKit(p)}
                          className="p-2.5 bg-slate-50 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm shrink-0"><Plus size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                    <Layers size={18} className="text-emerald-500" /> Assembly Workspace
                  </h4>
                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden min-h-[300px]">
                    {localKitComponents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-slate-700 opacity-50 space-y-4">
                        <LayoutGrid size={60} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Workspace Empty</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 relative z-10">
                        {localKitComponents.map(c => (
                          <div key={c.id} className="flex items-center justify-between gap-6 py-4 border-b border-white/5 animate-fade-in">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-black uppercase truncate">{c.name}</div>
                              <DualPrice priceExVat={c.price} className="mt-1" secondaryClassName="text-slate-500" showLabels={false} />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-inner">
                                <button type="button" onClick={() => { const n = [...localKitComponents]; const x = n.find(k => k.id === c.id); if (x) x.quantity = Math.max(1, x.quantity - 1); setLocalKitComponents(n); }} className="p-1 text-slate-400 hover:text-white"><Minus size={14} /></button>
                                <span className="text-[12px] font-black w-6 text-center">{c.quantity}</span>
                                <button type="button" onClick={() => { const n = [...localKitComponents]; const x = n.find(k => k.id === c.id); if (x) x.quantity += 1; setLocalKitComponents(n); }} className="p-1 text-slate-400 hover:text-white"><Plus size={14} /></button>
                              </div>
                              <button type="button" onClick={() => removeComponentFromKit(c.id)} className="p-2.5 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 flex justify-between items-center shadow-lg">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Assembly Yield:</span>
                    <DualPrice priceExVat={localKitComponents.reduce((s, c) => s + c.price * c.quantity, 0)} className="text-emerald-600" secondaryClassName="text-emerald-600/60" align="right" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[3rem] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <ShieldCheck size={16} className="text-emerald-500" /> Connected Table: {categoryToTable[formData.category]}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-10 py-5 font-black uppercase text-[10px] text-slate-400 hover:text-slate-900 transition-colors">Cancel Access</button>
            <button onClick={handleSubmit} type="button" className="btn-action !bg-slate-900 shadow-2xl px-16 !rounded-2xl group ring-4 ring-slate-900/10">
              <Save size={20} className="text-emerald-500 group-hover:scale-125 transition-transform duration-500" /> Commit to Registry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import {Plus, Trash2, X, Save, Layers, Settings, Database, Image as ImageIconLucide,
  FileText, ExternalLink, Minus, ShieldCheck,
  LayoutGrid,} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DualPrice } from '../PriceDisplay';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { supabase } from '../../services/supabase';
import { ProductSpec, ProductDoc, KitComponent, Category } from '../../types';
import { categoryToTable, emptyLoc, ModalTab } from './adminTypes';


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
  localKitComponentsAdditional: KitComponent[];
  setLocalKitComponentsAdditional: (v: KitComponent[]) => void;
  selectedImageFiles: File[];
  setSelectedImageFiles: (v: File[]) => void;
  allProducts: any[];
  editLang: Language;
  setEditLang: (l: Language) => void;
  // kit builder filters
  compSearch: string;
  setCompSearch: (v: string) => void;
  compCategoryFilter: Category | 'All';
  setCompCategoryFilter: (v: Category | 'All') => void;
  compBrandFilter: string;
  setCompBrandFilter: (v: string) => void;
  compModelFilter: string;
  setCompModelFilter: (v: string) => void;
  compBattTypeFilter: string;
  setCompBattTypeFilter: (v: string) => void;
  compCapKwhFilter: string;
  setCompCapKwhFilter: (v: string) => void;
  compInvTypeFilter: string;
  setCompInvTypeFilter: (v: string) => void;
  compPhasesFilter: string;
  setCompPhasesFilter: (v: string) => void;
  compNumMpptsFilter: string;
  setCompNumMpptsFilter: (v: string) => void;
  compHpTypeFilter: string;
  setCompHpTypeFilter: (v: string) => void;
  compPhases1Filter: string;
  setCompPhases1Filter: (v: string) => void;
  compRefrTypeFilter: string;
  setCompRefrTypeFilter: (v: string) => void;
  compHeatCapKwFilter: string;
  setCompHeatCapKwFilter: (v: string) => void;
  compSolarPanelTypeFilter: string;
  setCompSolarPanelTypeFilter: (v: string) => void;
  compRatedPwrWpFilter: string;
  setCompRatedPwrWpFilter: (v: string) => void;
  compChgPwrKwFilter: string;
  setCompChgPwrKwFilter: (v: string) => void;
  onClose: () => void;
  onSaved?: () => void; // optional, щоб не падати
}

 export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  editingProduct,
  formData,
  setFormData,
  modalTab,
  setModalTab,
  localImages = [],
  setLocalImages,
  localSpecs = [],
  setLocalSpecs,
  localDocs = [],
  setLocalDocs,
  localKitComponents = [],
  setLocalKitComponents,
  localKitComponentsAdditional = [],
  setLocalKitComponentsAdditional,
  selectedImageFiles = [],
  setSelectedImageFiles,
  allProducts: _allProducts = [],
  editLang = 'en',
  setEditLang,
  compSearch: _compSearch,
  setCompSearch: _setCompSearch,
  compCategoryFilter: _compCategoryFilter,
  setCompCategoryFilter: _setCompCategoryFilter,
  compBrandFilter: _compBrandFilter,
  setCompBrandFilter: _setCompBrandFilter,
  compModelFilter: _compModelFilter,
  setCompModelFilter: _setCompModelFilter,
  compBattTypeFilter: _compBattTypeFilter,
  setCompBattTypeFilter: _setCompBattTypeFilter,
  compCapKwhFilter: _compCapKwhFilter,
  setCompCapKwhFilter: _setCompCapKwhFilter,
  compInvTypeFilter: _compInvTypeFilter,
  setCompInvTypeFilter: _setCompInvTypeFilter,
  compPhasesFilter: _compPhasesFilter,
  setCompPhasesFilter: _setCompPhasesFilter,
  compNumMpptsFilter: _compNumMpptsFilter,
  setCompNumMpptsFilter: _setCompNumMpptsFilter,
  compHpTypeFilter: _compHpTypeFilter,
  setCompHpTypeFilter: _setCompHpTypeFilter,
  compPhases1Filter: _compPhases1Filter,
  setCompPhases1Filter: _setCompPhases1Filter,
  compRefrTypeFilter: _compRefrTypeFilter,
  setCompRefrTypeFilter: _setCompRefrTypeFilter,
  compHeatCapKwFilter: _compHeatCapKwFilter,
  setCompHeatCapKwFilter: _setCompHeatCapKwFilter,
  compSolarPanelTypeFilter: _compSolarPanelTypeFilter,
  setCompSolarPanelTypeFilter: _setCompSolarPanelTypeFilter,
  compRatedPwrWpFilter: _compRatedPwrWpFilter,
  setCompRatedPwrWpFilter: _setCompRatedPwrWpFilter,
  compChgPwrKwFilter: _compChgPwrKwFilter,
  setCompChgPwrKwFilter: _setCompChgPwrKwFilter,
  onClose,
  onSaved,
}) => {
  const { addNotification } = useNotification();
  const { getLoc: _getLoc, t } = useLanguage();
  const { categories: _categories } = useProducts();

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);

  const mergeFiles = (prev: File[], next: File[]) => {
    const key = (f: File) => `${f.name}__${f.size}__${f.lastModified}`;
    const seen = new Set(prev.map(key));
    const merged = [...prev];
    for (const f of next) {
      const k = key(f);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(f);
    }
    return merged;
  };

  const mainImagePreviewUrl = useMemo(() => {
    if (!mainImageFile) return null;
    const url = URL.createObjectURL(mainImageFile);
    return url;
  }, [mainImageFile]);

  const galleryPreviewUrls = useMemo(() => {
    if (!selectedImageFiles.length) return [];
    return selectedImageFiles.map(f => URL.createObjectURL(f));
  }, [selectedImageFiles]);


  // Upload helper
  const uploadFileToSupabase = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${uuidv4()}.${ext}`;
    try {
      const { error } = await supabase.storage
        .from('product-assets')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) {
        addNotification(`Error uploading ${file.name}: ${error.message}`, 'error');
        return null;
      }
      const { data } = supabase.storage.from('product-assets').getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      addNotification(`Error uploading ${file.name}: ${err.message}`, 'error');
      return null;
    }
  };


  // ── Save ─────────────────────────────────────────────────────────────
  // Save
  const handleSubmit = async () => {
    const category = formData.category;
    const targetTable = categoryToTable[category] || 'products';

    const existingImageUrls = localImages.filter(u => u && u.trim() !== '');
    const uploadQueue: File[] = [
      ...(mainImageFile ? [mainImageFile] : []),
      ...selectedImageFiles,
    ];

    const uploadedUrls =
      uploadQueue.length > 0
        ? ((await Promise.all(uploadQueue.map(f => uploadFileToSupabase(f, 'images')))).filter(Boolean) as string[])
        : [];

    const uploadedMainUrl = mainImageFile ? uploadedUrls[0] : null;
    const uploadedGalleryUrls = mainImageFile ? uploadedUrls.slice(1) : uploadedUrls;

    // Merge: keep existing URLs, append newly uploaded ones.
    // If a new main image was uploaded, it becomes first.
    let finalImageUrls: string[] = [];
    if (uploadedMainUrl) {
      finalImageUrls = [uploadedMainUrl, ...existingImageUrls, ...uploadedGalleryUrls];
    } else {
      finalImageUrls = [...existingImageUrls, ...uploadedGalleryUrls];
    }
    // De-dupe (just in case)
    finalImageUrls = Array.from(new Set(finalImageUrls));

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
      batteries: [
        'BrandProd',
        'ModelName',
        'SkuShopId',
        'PriceEurExVat',
        'StockLvl',
        'BattType',
        'BattChem',
        'CapKwh',
        'NomVoltV',
        'CycleLife',
        'MaxChgDchgCur_A',
        'Scalab',
        'OpTempC',
        'BmsInt',
        'BattCert',
        'DimsMm',
        'WgtKg',
        'name',
        'description',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      inverters: [
        'BrandProd',
        'ModelName',
        'SkuShopId',
        'PriceEurExVat',
        'StockLvl',
        'InvType',
        'Phases',
        'MaxEffPerc',
        'NumMppts',
        'MpptVoltV',
        'MaxPvInVoltV',
        'CommProt',
        'IntProt',
        'IpRating',
        'DimsMm',
        'WgtKg',
        'name',
        'description',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      solar_panels: [
        'BrandProd',
        'ModelName',
        'SkuShopId',
        'PriceEurExVat',
        'StockLvl',
        'SolarPanelType',
        'CellTech',
        'RatedPwrWp',
        'ModEffPerc',
        'TempCoeffPmax',
        'GlassType',
        'ProdWarrYrs',
        'PerfWarrYrs',
        'DimsMm',
        'WgtKg',
        'name',
        'description',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      ev_chargers: [
        'BrandProd',
        'ModelName',
        'SkuShopId',
        'PriceEurExVat',
        'StockLvl',
        'ChgPwrKw',
        'ConnType',
        'AuthMeth',
        'OcppVer',
        'DynLoadMng',
        'V2gSupp',
        'ChgProtRcd',
        'MidMet',
        'DimsMm',
        'WgtKg',
        'name',
        'description',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      heat_pumps: [
        'BrandProd',
        'ModelName',
        'SkuShopId',
        'PriceEurExVat',
        'StockLvl',
        'HpType',
        'Phases1',
        'RefrType',
        'HeatCapKw',
        'Scop35C',
        'MaxFlowTempC',
        'SndPwrDba',
        'DimsMm',
        'WgtKg',
        'name',
        'description',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      kits: [
        'name',
        'power_kw',
        'phases',
        'description',
        'components',
        'total_price',
        'base_price',
        'image',
        'images',
        'docs',
        'specs',
        'is_active',
        'is_leader',
      ],
      products: [
        'name',
        'description',
        'category',
        'price',
        'stock',
        'image',
        'images',
        'specs',
        'docs',
        'is_active',
        'is_leader',
      ],
    };
 const allowed = tableFields[targetTable] || [];
    const payload: any = {};
    allowed.forEach((f) => {
      if (formData[f] !== undefined) payload[f] = formData[f];
    });
    const fixUndefinedLocKey = (val: any) => {
      if (!val || typeof val !== 'object') return val;
      if (!Object.prototype.hasOwnProperty.call(val, 'undefined')) return val;
      const fixed = { ...val };
      const moved = typeof fixed.undefined === 'string' ? fixed.undefined : '';
      delete fixed.undefined;
      // If all known langs are empty, put moved value into en
      if (moved && !String(fixed.da || '').trim() && !String(fixed.en || '').trim() && !String(fixed.no || '').trim() && !String(fixed.se || '').trim()) {
        fixed.en = moved;
      }
      return fixed;
    };

    payload.name = fixUndefinedLocKey(formData.name) || { en: formData.ModelName || '' };
    payload.description = fixUndefinedLocKey(formData.description) || emptyLoc();
    // Some tables store `images` as text (JSON string) and some as json/jsonb arrays.
    // We'll try array first, and if DB rejects it we retry with JSON string.
    payload.image = finalImageUrls[0] || null;
    payload.images = finalImageUrls;
    payload.docs = finalDocObjects;
    payload.specs = localSpecs.filter((s) => s.label?.trim());
    if (targetTable === 'kits') {
      const baseWithFlag = localKitComponents.map((c) => ({ ...c, isBase: true }));
      const additionalWithFlag = localKitComponentsAdditional.map((c) => ({ ...c, isBase: false }));
      const allComponents = [...baseWithFlag, ...additionalWithFlag];
      const additionalTotal = localKitComponentsAdditional.reduce(
        (s, c) => s + c.price * c.quantity,
        0,
      );
      const basePrice = Number(formData.base_price) || 0;
      const autoTotal = basePrice + additionalTotal;
      payload.components = allComponents.map((c) => ({
        component_id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
        type_complect: c.typeComplect ?? '',
        market: !!c.market,
        is_base: c.isBase !== false,
      }));
      payload.total_price =
        typeof formData.total_price === 'number' && !Number.isNaN(formData.total_price)
          ? formData.total_price
          : autoTotal;
    }
    const persist = async (p: any) => {
      if (editingProduct) {
        const rawId = editingProduct.realId || editingProduct.id;
        const realId =
          typeof rawId === 'string' && rawId.includes('-') ? rawId.split('-')[1] : rawId;
        return await supabase.from(targetTable).update(p).eq('id', realId);
      }
      return await supabase.from(targetTable).insert([p]);
    };

    try {
      const { error } = await persist(payload);
      if (error) {
        // Retry if `images` column expects a text JSON string
        const retryPayload = { ...payload, images: JSON.stringify(finalImageUrls) };
        const { error: retryError } = await persist(retryPayload);
        if (retryError) throw retryError;
      }
      addNotification('Registry Updated', 'success');
      onClose();
      if (typeof onSaved === 'function') {
        onSaved(); // захищений виклик
      }
    } catch (err: any) {
      addNotification(err.message || 'DB Sync Error', 'error');
    }
  };

  const removeComponentFromKit = (id: string) =>
    setLocalKitComponents(localKitComponents.filter((c) => c.id !== id));
  const removeAdditionalComponentFromKit = (id: string) =>
    setLocalKitComponentsAdditional(localKitComponentsAdditional.filter((c) => c.id !== id));

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left overflow-y-auto">
      <div className="bg-white w-full md:max-w-6xl rounded-t-[2rem] md:rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col max-h-[80vh] md:max-h-[80vh] animate-modal-in overflow-hidden min-h-0 flex-1 md:flex-initial">

        {/* Header */}
        <div className="px-4 md:px-10 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <div className="bg-slate-900 p-2 rounded-lg text-emerald-500 shrink-0"><Settings size={18} /></div>
            <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-900 truncate">
              {formData.category === 'Sæt' ? 'Kit Assembly Panel' : 'Asset Configuration Panel'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2.5 md:p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 shrink-0"><X size={24} /></button>
        </div>

        {/* Tabs — readable on mobile */}
        <div className="flex border-b border-slate-100 shrink-0">
          {formData.category === 'Sæt' ? (
            (['main', 'kit_builder'] as const).map(tab => (
              <button key={tab} onClick={() => setModalTab(tab)}
                className={`flex-1 py-4 md:py-5 text-center font-black text-xs md:text-[10px] uppercase tracking-wider md:tracking-widest transition-colors ${modalTab === tab ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab === 'main' ? 'Kit Identity' : 'Component Assembly'}
              </button>
            ))
          ) : (
            (['main', 'media', 'specs'] as const).map(tab => (
              <button key={tab} onClick={() => setModalTab(tab)}
                className={`flex-1 py-4 md:py-5 text-center font-black text-xs md:text-[10px] uppercase tracking-wider md:tracking-widest transition-colors ${modalTab === tab ? 'border-b-4 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-900'}`}>
                {tab === 'main' ? 'Main Info' : tab === 'media' ? 'Media' : 'Specifications'}
              </button>
            ))
          )}
        </div>

        {/* Body — scrollable on mobile with min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-10 text-left">
          <div className="space-y-10 animate-fade-in">

            {/* ── TAB MAIN ─────────────────────────────────────────── */}
            {modalTab === 'main' && (
              <div className="space-y-10 animate-fade-in">
                {formData.category !== 'Sæt' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-5 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <div className="space-y-2">
                      <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Asset Class (Target Table)</label>
                      <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="input-premium appearance-none bg-white" disabled={!!editingProduct}>
                        {Object.keys(categoryToTable).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Brand (BrandProd)</label>
                      <input value={formData.BrandProd || ''} onChange={e => setFormData({ ...formData, BrandProd: e.target.value })}
                        className="input-premium bg-white text-sm md:text-base" placeholder="e.g. Huawei, Victron, Daikin..." />
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-1 ${formData.category === 'Sæt' ? '' : 'lg:grid-cols-2'} gap-12`}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Localization Matrix</h4>
                      <div className="flex gap-1.5">
                        {(['da','en','no','se'] as Language[]).map(l => (
                          <button key={l} type="button" onClick={() => setEditLang(l)}
                            className={`w-9 h-9 rounded-xl text-xs md:text-[9px] font-black uppercase transition-all ${editLang === l ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">
                          {formData.category === 'Sæt' ? 'Kit name' : `Display Name / Model Name (${editLang})`}
                        </label>
                        <input
                          required
                          value={formData.category === 'Sæt' ? (formData.name?.[editLang] || '') : (formData.ModelName || '')}
                          onChange={e => {
                            if (formData.category === 'Sæt') {
                              const lang = (editLang || 'en') as Language;
                              const current = (formData.name && typeof formData.name === 'object') ? formData.name : emptyLoc();
                              setFormData({ ...formData, name: { ...current, [lang]: e.target.value } });
                            } else {
                              setFormData({ ...formData, ModelName: e.target.value });
                            }
                          }}
                          className="input-premium text-sm md:text-base"
                          placeholder={formData.category === 'Sæt' ? 'e.g. Premium Solar Kit' : 'e.g. SUN2000-10KTL-M1'}
                        />
                      </div>

                      {formData.category === 'Sæt' ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">
                              Kit description ({editLang})
                            </label>
                            <textarea
                              value={formData.description?.[editLang] || ''}
                              onChange={e =>
                                setFormData({
                                  ...formData,
                                  description: { ...(formData.description && typeof formData.description === 'object' ? formData.description : emptyLoc()), [(editLang || 'en') as Language]: e.target.value },
                                })
                              }
                              className="input-premium min-h-[180px] py-4 resize-y"
                              placeholder="Describe what is included in this kit..."
                            />
                          </div>
                          <div className="flex justify-end">
                            <div className="space-y-2 w-full md:w-1/4">
                              <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">
                                Base kit price (EUR excl. VAT)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.base_price || 0}
                                onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                className="input-premium !py-1.5 text-xs"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Main Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => setMainImageFile(e.target.files?.[0] || null)}
                                className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              {mainImagePreviewUrl && (
                                <img
                                  src={mainImagePreviewUrl}
                                  alt="Preview"
                                  className="mt-2 w-24 h-24 object-cover rounded-xl"
                                />
                              )}
                              {formData.image && !mainImagePreviewUrl && (
                                <img src={formData.image} alt="Current" className="mt-2 w-24 h-24 object-cover rounded-xl" />
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Gallery Images</label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={e => setSelectedImageFiles(prev => mergeFiles(prev, Array.from(e.target.files || [])))}
                                className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                {Array.isArray(formData.images) &&
                                  formData.images.map((img: string, i: number) => (
                                    <img key={`current-${i}`} src={img} alt="Current" className="w-16 h-16 object-cover rounded-xl" />
                                  ))}
                                {galleryPreviewUrls.map((url, i) => (
                                  <img key={`new-${i}`} src={url} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Price Ex. VAT (EUR)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.PriceEurExVat || 0}
                                onChange={e => setFormData({ ...formData, PriceEurExVat: Number(e.target.value) })}
                                className="input-premium"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">Stock Level</label>
                              <input
                                type="number"
                                value={formData.StockLvl || 0}
                                onChange={e => setFormData({ ...formData, StockLvl: Number(e.target.value) })}
                                className="input-premium"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {formData.category !== 'Sæt' && (
                      <div className="space-y-2">
                        <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">
                          Short Description ({editLang})
                        </label>
                        <textarea
                          value={formData.description?.[editLang] || ''}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              description: { ...formData.description, [editLang]: e.target.value },
                            })
                          }
                          className="input-premium min-h-[150px] py-4"
                          placeholder="Brief technical summary..."
                        />
                      </div>
                    )}
                    {formData.category !== 'Sæt' && (
                      <>
                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex-1 space-y-1">
                            <div className="text-xs md:text-[10px] font-black uppercase text-slate-900">Visibility Status</div>
                            <div className="text-[10px] md:text-[8px] font-bold text-slate-400 uppercase">Show in public catalog</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`w-14 h-8 rounded-full transition-all relative ${
                              formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                                formData.is_active ? 'left-7' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex-1 space-y-1">
                            <div className="text-xs md:text-[10px] font-black uppercase text-slate-900">Sales Leader</div>
                            <div className="text-[10px] md:text-[8px] font-bold text-slate-400 uppercase">Mark as best seller</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_leader: !formData.is_leader })}
                            className={`w-14 h-8 rounded-full transition-all relative ${
                              formData.is_leader ? 'bg-amber-500' : 'bg-slate-200'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${
                                formData.is_leader ? 'left-7' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB MEDIA ─────────────────────────────────────────── */}
            {modalTab === 'media' && (
              <div className="space-y-10 animate-fade-in">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                  <h4 className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                    Image Gallery (URLs / Upload)
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs md:text-[9px] font-black text-slate-900 uppercase ml-2">
                        Upload images (files)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => setSelectedImageFiles(prev => mergeFiles(prev, Array.from(e.target.files || [])))}
                        className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {selectedImageFiles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {galleryPreviewUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Preview ${i + 1}`}
                              className="w-16 h-16 object-cover rounded-xl"
                            />
                          ))}
                        </div>
                      )}
                    </div>

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
                  <h4 className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">PDF Documentation</h4>
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
                  <h4 className="text-xs md:text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
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
                  <h4 className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Custom Specifications</h4>
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
                <div className="space-y-8">
                  {/* Block: Additional components */}
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                    <h4 className="text-xs md:text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 flex items-center gap-2">
                      <Layers size={18} className="text-amber-500" /> {t('kit_additional_components')}
                    </h4>
                    <div className="space-y-4">
                      {localKitComponentsAdditional.map((c, idx) => (
                        <div key={c.id} className="flex flex-wrap gap-3 items-center">
                          <label className="flex items-center shrink-0 cursor-pointer" title="Market">
                            <input type="checkbox" checked={!!c.market} onChange={e => { const n = [...localKitComponentsAdditional]; n[idx] = { ...n[idx], market: e.target.checked }; setLocalKitComponentsAdditional(n); }} className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                          </label>
                          <input value={c.typeComplect ?? ''} onChange={e => { const n = [...localKitComponentsAdditional]; n[idx] = { ...n[idx], typeComplect: e.target.value }; setLocalKitComponentsAdditional(n); }} className="w-32 input-premium bg-white !text-xs" placeholder="Type complect" />
                          <input value={c.name} onChange={e => { const n = [...localKitComponentsAdditional]; n[idx] = { ...n[idx], name: e.target.value }; setLocalKitComponentsAdditional(n); }} className="flex-1 min-w-[140px] input-premium bg-white !text-xs" placeholder="Component name" />
                          <input type="number" min={1} value={c.quantity ?? 1} onChange={e => { const n = [...localKitComponentsAdditional]; n[idx] = { ...n[idx], quantity: Math.max(1, Number(e.target.value) || 1) }; setLocalKitComponentsAdditional(n); }} className="w-24 input-premium bg-white !text-xs" placeholder="Qty" />
                          <input type="number" step="0.01" min={0} value={c.price ?? 0} onChange={e => { const n = [...localKitComponentsAdditional]; n[idx] = { ...n[idx], price: Number(e.target.value) || 0 }; setLocalKitComponentsAdditional(n); }} className="w-28 input-premium bg-white !text-xs" placeholder="Cost (EUR)" />
                          <button type="button" onClick={() => setLocalKitComponentsAdditional(localKitComponentsAdditional.filter((_, i) => i !== idx))} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shrink-0" aria-label="Remove"><Trash2 size={20} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setLocalKitComponentsAdditional([...localKitComponentsAdditional, { id: `manual-${uuidv4()}`, name: '', quantity: 1, price: 0, typeComplect: '', market: false }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">+ Add component</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                    <Layers size={18} className="text-emerald-500" /> Assembly Workspace
                  </h4>
                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white space-y-6 shadow-2xl relative overflow-hidden min-h-[300px]">
                    {(localKitComponents.length === 0 && localKitComponentsAdditional.length === 0) ? (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-slate-700 opacity-50 space-y-4">
                        <LayoutGrid size={60} />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Workspace Empty</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 relative z-10">
                        {localKitComponents.map((c, idx) => (
                          <div key={`base-${c.id}-${idx}`} className="flex items-center justify-between gap-6 py-4 border-b border-white/5 animate-fade-in">
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
                        {localKitComponentsAdditional.map((c, idx) => (
                          <div key={`add-${c.id}-${idx}`} className="flex items-center justify-between gap-6 py-4 border-b border-white/5 animate-fade-in">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-black uppercase truncate">{c.name}</div>
                              <DualPrice priceExVat={c.price} className="mt-1" secondaryClassName="text-slate-500" showLabels={false} />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-inner">
                                <button type="button" onClick={() => { const n = [...localKitComponentsAdditional]; const x = n.find(k => k.id === c.id); if (x) x.quantity = Math.max(1, x.quantity - 1); setLocalKitComponentsAdditional(n); }} className="p-1 text-slate-400 hover:text-white"><Minus size={14} /></button>
                                <span className="text-[12px] font-black w-6 text-center">{c.quantity}</span>
                                <button type="button" onClick={() => { const n = [...localKitComponentsAdditional]; const x = n.find(k => k.id === c.id); if (x) x.quantity += 1; setLocalKitComponentsAdditional(n); }} className="p-1 text-slate-400 hover:text-white"><Plus size={14} /></button>
                              </div>
                              <button type="button" onClick={() => removeAdditionalComponentFromKit(c.id)} className="p-2.5 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 space-y-4 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                          Total of components
                        </span>
                        <DualPrice
                          priceExVat={
                            (Number(formData.base_price) || 0) +
                            localKitComponentsAdditional.reduce((s, c) => s + c.price * c.quantity, 0)
                          }
                          className="text-emerald-600"
                          secondaryClassName="text-emerald-600/60"
                          align="left"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-3 bg-emerald-50/60 px-4 py-3 rounded-2xl border border-emerald-200 flex-1">
                          <div className="flex-1">
                            <div className="text-[10px] font-black uppercase text-emerald-900">Visibility Status</div>
                            <div className="text-[9px] font-bold text-emerald-700/80 uppercase">Show in public catalog</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`w-12 h-7 rounded-full transition-all relative ${
                              formData.is_active ? 'bg-emerald-500' : 'bg-emerald-100'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                                formData.is_active ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-50/60 px-4 py-3 rounded-2xl border border-emerald-200 flex-1">
                          <div className="flex-1">
                            <div className="text-[10px] font-black uppercase text-emerald-900">Sales Leader</div>
                            <div className="text-[9px] font-bold text-emerald-700/80 uppercase">Mark as best seller</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_leader: !formData.is_leader })}
                            className={`w-12 h-7 rounded-full transition-all relative ${
                              formData.is_leader ? 'bg-amber-500' : 'bg-emerald-100'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                                formData.is_leader ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 w-full md:w-1/2">
                      <label className="text-[9px] font-black text-emerald-700 uppercase ml-1">
                        Final kit price (editable, EUR excl. VAT)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          typeof formData.total_price === 'number' && !Number.isNaN(formData.total_price)
                            ? formData.total_price
                            : (Number(formData.base_price) || 0) +
                              localKitComponentsAdditional.reduce((s, c) => s + c.price * c.quantity, 0)
                        }
                        onChange={e =>
                          setFormData({
                            ...formData,
                            total_price: Number(e.target.value),
                          })
                        }
                        className="input-premium bg-white !py-3 !text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — stacked on mobile, readable text */}
        <div className="px-4 md:px-10 py-4 md:py-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[2rem] md:rounded-b-[3rem] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 text-xs md:text-[9px] font-black text-slate-500 md:text-slate-400 uppercase tracking-wider md:tracking-widest">
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" /> <span className="truncate">Table: {categoryToTable[formData.category]}</span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
            <button type="button" onClick={onClose} className="px-6 py-4 sm:py-5 font-black uppercase text-xs md:text-[10px] text-slate-400 hover:text-slate-900 transition-colors rounded-2xl border border-slate-200 sm:border-0">Cancel</button>
            <button onClick={handleSubmit} type="button" className="btn-action !bg-slate-900 shadow-2xl px-6 md:px-16 py-4 md:py-5 !rounded-2xl group ring-4 ring-slate-900/10 text-sm md:text-base">
              <Save size={20} className="text-emerald-500 group-hover:scale-125 transition-transform duration-500 shrink-0" /> Commit to Registry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

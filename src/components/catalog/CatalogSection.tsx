
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProducts, SortOption } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { IMAGE_FALLBACK } from '../../utils/constants';
import { 
  ShoppingCart, X, Loader2, Zap, Download, FileText, Info, 
  ShoppingBag, PlayCircle, Heart, Percent,
  Layers, Package, Star, Factory, Activity, Crown,
  Filter, RotateCcw, Search, SlidersHorizontal, Check, ExternalLink,
  Link2, CheckCheck, ListPlus, Trash2, CheckCircle2
} from 'lucide-react';
import { Product, Category, KitComponent, KitPart } from '../../types';
import { CATALOG_SLUG_TO_CATEGORY } from '../../routing/siteCountry';
import { Marker } from '../MarkerComponent.tsx';
import { DualPrice } from '../PriceDisplay';
import { DocExportButton } from '../DocExportButton';

/** Рядок «Мій вибір» у каталозі (локальний список перед кошиком) */
export type CatalogSelectionLine = {
  key: string;
  product: Product;
  unitPrice: number;
  quantity: number;
  parts?: KitPart[];
};

/** Картка каталогу: квадратне фото, категорія + назва, низ — ціна + дії */
export const ProductCard: React.FC<{
  product: Product;
  onSelect: (p: Product) => void;
  /** Якщо задано — нижня кнопка «Додати до списку» замість кошика */
  onAddToList?: (e: React.MouseEvent, p: Product) => void;
  onAddToCart?: (e: React.MouseEvent, p: Product) => void;
}> = React.memo(({ product, onSelect, onAddToList, onAddToCart }) => {
  const { t, getLoc } = useLanguage();
  const { getDiscountedPrice, currentUser } = useUser();

  const discountedPrice = getDiscountedPrice(product.price);
  const hasDiscount = currentUser && currentUser.discount && currentUser.discount > 0;

  return (
    <div
      className="group bg-white border-2 border-slate-100 hover:border-emerald-300 rounded-3xl p-4 hover:shadow-lg transition-all flex flex-col h-full notranslate cursor-pointer"
      translate="no"
      onClick={() => onSelect(product)}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 bg-slate-50 border border-slate-50">
        <img
          src={product.image || IMAGE_FALLBACK}
          alt=""
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t(`cat_${product.category}`)}</p>
        <h4 className="font-black text-slate-900 text-[11px] uppercase tracking-tight line-clamp-2 leading-snug">
          {getLoc(product.name)}
        </h4>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {hasDiscount && (
            <span className="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase inline-flex items-center gap-0.5">
              <Percent size={8} /> {currentUser!.discount}%
            </span>
          )}
          {product.is_leader && (
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase flex items-center gap-0.5">
              <Star size={7} fill="currentColor" /> {t('sales_leader')}
            </span>
          )}
          {!product.is_active && (
            <span className="bg-slate-400 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase">
              {t('inactive_status') || 'Inactive'}
            </span>
          )}
        </div>
        {(product.manufacturer || (product.category === 'Invertere' && product.inverter_type)) && (
          <div className="flex flex-wrap gap-2 mt-2">
            {product.manufacturer && (
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Factory size={10} /> {product.manufacturer}
              </span>
            )}
            {product.category === 'Invertere' && product.inverter_type && (
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} /> {product.inverter_type}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
        <DualPrice priceExVat={discountedPrice} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onAddToList) onAddToList(e, product);
            else onAddToCart?.(e, product);
          }}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-[0.98]"
        >
          {onAddToList ? (
            <>
              <ListPlus size={14} /> {t('catalog_add_to_list')}
            </>
          ) : (
            <>
              <ShoppingCart size={14} /> {t('add_to_cart')}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

const CategorySpecs: React.FC<{ product: Product }> = ({ product }) => {
  const { t } = useLanguage();
  const renderSpec = (label: string, value: any, suffix: string = '') => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[10px] font-bold text-slate-900">{value}{suffix}</span>
      </div>
    );
  };

  switch (product.category) {
    case 'Batterier':
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-1">
          {renderSpec('Brand', product.BrandProd)}
          {renderSpec('Model', product.ModelName)}
          {renderSpec('SKU', product.SkuShopId)}
          {renderSpec('Type', product.BattType)}
          {renderSpec('Chemistry', product.BattChem)}
          {renderSpec('Capacity', product.CapKwh, ' kWh')}
          {renderSpec('Nominal Voltage', product.NomVoltV, ' V')}
          {renderSpec('Cycle Life', product.CycleLife)}
          {renderSpec('Max Current', product.MaxChgDchgCur_A)}
          {renderSpec('Scalability', product.Scalab)}
          {renderSpec('Op. Temp', product.OpTempC)}
          {renderSpec('BMS', product.BmsInt)}
          {renderSpec('Certification', product.BattCert)}
          {renderSpec('Dimensions', product.DimsMm)}
          {renderSpec('Weight', product.WgtKg, ' kg')}
        </div>
      );
    case 'Power Station':
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-1">
          {renderSpec('Brand', product.BrandProd)}
          {renderSpec('Model', product.ModelName)}
          {renderSpec('SKU', product.SkuShopId)}
          {renderSpec('Power', product.ChgPwrKw, ' kW')}
          {renderSpec('Connector', product.ConnType)}
          {renderSpec('Auth Method', product.AuthMeth)}
          {renderSpec('OCPP', product.OcppVer)}
          {renderSpec('Load Mgmt', product.DynLoadMng)}
          {renderSpec('V2G Support', product.V2gSupp)}
          {renderSpec('Protection', product.ChgProtRcd)}
          {renderSpec('MID Meter', product.MidMet)}
          {renderSpec('Dimensions', product.DimsMm)}
          {renderSpec('Weight', product.WgtKg, ' kg')}
        </div>
      );
    case 'Varmepumper':
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-1">
          {renderSpec('Brand', product.BrandProd)}
          {renderSpec('Model', product.ModelName)}
          {renderSpec('SKU', product.SkuShopId)}
          {renderSpec('Type', product.HpType)}
          {renderSpec('Phases', product.Phases1)}
          {renderSpec('Refrigerant', product.RefrType)}
          {renderSpec('Heat Capacity', product.HeatCapKw, ' kW')}
          {renderSpec('SCOP 35°C', product.Scop35C)}
          {renderSpec('Max Flow Temp', product.MaxFlowTempC, ' °C')}
          {renderSpec('Sound Power', product.SndPwrDba, ' dBA')}
          {renderSpec('Dimensions', product.DimsMm)}
          {renderSpec('Weight', product.WgtKg, ' kg')}
        </div>
      );
    case 'Invertere':
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-1">
          {renderSpec('Brand', product.BrandProd)}
          {renderSpec('Model', product.ModelName)}
          {renderSpec('SKU', product.SkuShopId)}
          {renderSpec('Type', product.InvType)}
          {renderSpec('Phases', product.Phases)}
          {renderSpec('Max Efficiency', product.MaxEffPerc, '%')}
          {renderSpec('MPPTs', product.NumMppts)}
          {renderSpec('Voltage Range', product.MpptVoltRangeV)}
          {renderSpec('Max PV Input', product.MaxPvInVoltV, ' V')}
          {renderSpec('Comm. Prot.', product.CommProt)}
          {renderSpec('Int. Prot.', product.IntProt)}
          {renderSpec('IP Rating', product.IpRating)}
          {renderSpec('Dimensions', product.DimsMm)}
          {renderSpec('Weight', product.WgtKg, ' kg')}
        </div>
      );
    case 'Solpaneler':
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-1">
          {renderSpec('Brand', product.BrandProd)}
          {renderSpec('Model', product.ModelName)}
          {renderSpec('SKU', product.SkuShopId)}
          {renderSpec('Type', product.SolarPanelType)}
          {renderSpec('Cell Tech', product.CellTech)}
          {renderSpec('Rated Power', product.RatedPwrWp, ' Wp')}
          {renderSpec('Module Eff.', product.ModEffPerc, '%')}
          {renderSpec('Temp. Coeff.', product.TempCoeffPmax)}
          {renderSpec('Glass Type', product.GlassType)}
          {renderSpec('Prod. Warranty', product.ProdWarrYrs, ' yrs')}
          {renderSpec('Perf. Warranty', product.PerfWarrYrs, ' yrs')}
          {renderSpec('Dimensions', product.DimsMm)}
          {renderSpec('Weight', product.WgtKg, ' kg')}
        </div>
      );
    default:
      return (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-3">
           {Array.isArray(product.specs) ? product.specs.map((s: any, i: number) => (
             <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
               <span className="text-[10px] font-bold text-slate-900">{s.value}</span>
             </div>
           )) : <p className="text-[10px] text-slate-400 italic">{t('specs_unassigned')}</p>}
        </div>
      );
  }
};

export const CatalogSection: React.FC<{ catalogSlug?: string | null }> = ({ catalogSlug = null }) => {
  const { t, getLoc } = useLanguage();
  const productsContext = useProducts();

  // Safe context extraction
  const { 
    filteredProducts = [], categories = [], selectedCategory = 'All' as (Category | 'All'), setSelectedCategory, isLoading = false,
    searchQuery = '', setSearchQuery, priceRange = [0, 100000],
    selectedPowerMarkers: _selectedPowerMarkers = [], setSelectedPowerMarkers: _setSelectedPowerMarkers, showOnlyLeaders = false, setShowOnlyLeaders,
    sortBy = 'newest' as SortOption, setSortBy,
    availableManufacturers = [], availableModels = [], availableSubcategories: _availableSubcategories = [], availablePowerMarkers: _availablePowerMarkers = [], maxPossiblePrice = 100000, resetFilters,
    applyFilters,
    filterBrand, setFilterBrand,
    filterModel, setFilterModel,
    filterBattType, setFilterBattType,
    filterCapKwh, setFilterCapKwh,
    filterChgPwrKw, setFilterChgPwrKw,
    filterHpType, setFilterHpType,
    filterPhases1, setFilterPhases1,
    filterRefrType, setFilterRefrType,
    filterHeatCapKw, setFilterHeatCapKw,
    filterInvType, setFilterInvType,
    filterPhases, setFilterPhases,
    filterNumMppts, setFilterNumMppts,
    filterSolarPanelType, setFilterSolarPanelType,
    filterRatedPwrWp, setFilterRatedPwrWp,

    availableBattTypes = [], availableCapKwh = [], availableChgPwrKw = [], availableHpTypes = [], availablePhases1 = [], availableRefrTypes = [], availableHeatCapKw = [],
    availableInvTypes = [], availablePhases = [], availableNumMppts = [], availableSolarPanelTypes = [], availableRatedPwrWp = []
  } = productsContext || {};
  
  const { addItem } = useCart();
  const { getDiscountedPrice, currentUser } = useUser();
  const { addNotification } = useNotification();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  // Kit modal: selected optional add-on components (is_base=false)
  const [kitSelectedAddons, setKitSelectedAddons] = useState<Record<string, number>>({});
  const [catalogSelection, setCatalogSelection] = useState<CatalogSelectionLine[]>([]);

  useEffect(() => {
    if (!setSelectedCategory) return;
    if (!catalogSlug) {
      setSelectedCategory('All');
      return;
    }
    const cat = CATALOG_SLUG_TO_CATEGORY[catalogSlug];
    if (cat) setSelectedCategory(cat);
  }, [catalogSlug, setSelectedCategory]);

  const addLineToCatalogSelection = useCallback(
    (product: Product, unitPrice: number, parts?: KitPart[]) => {
      setCatalogSelection((prev) => {
        if (!parts || parts.length === 0) {
          const existing = prev.find(
            (l) => l.product.id === product.id && (!l.parts || l.parts.length === 0)
          );
          if (existing) {
            return prev.map((l) =>
              l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l
            );
          }
        }
        const key = parts?.length ? `${product.id}-${Date.now()}` : product.id;
        return [...prev, { key, product, unitPrice, quantity: 1, parts }];
      });
      addNotification(t('catalog_added_to_selection'), 'success');
    },
    [addNotification, t]
  );

  const removeCatalogSelectionLine = useCallback((key: string) => {
    setCatalogSelection((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const addSingleCatalogLineToCart = useCallback(
    (line: CatalogSelectionLine) => {
      const p = { ...line.product, price: line.unitPrice };
      if (line.parts?.length) {
        for (let i = 0; i < line.quantity; i++) addItem(p, line.parts);
      } else {
        for (let i = 0; i < line.quantity; i++) addItem(p);
      }
      setCatalogSelection((prev) => prev.filter((l) => l.key !== line.key));
      addNotification(t('item_added'), 'success');
    },
    [addItem, addNotification, t]
  );

  const addAllCatalogSelectionToCart = useCallback(() => {
    catalogSelection.forEach((line) => {
      const p = { ...line.product, price: line.unitPrice };
      if (line.parts?.length) {
        for (let i = 0; i < line.quantity; i++) addItem(p, line.parts);
      } else {
        for (let i = 0; i < line.quantity; i++) addItem(p);
      }
    });
    setCatalogSelection([]);
    addNotification(t('catalog_selection_added_to_cart'), 'success');
  }, [catalogSelection, addItem, addNotification, t]);

  const catalogSelectionTotal = useMemo(
    () => catalogSelection.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    [catalogSelection]
  );

  // Open product from URL param ?product=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('product');
    if (pid && filteredProducts.length > 0) {
      const decoded = decodeURIComponent(pid);
      const found = filteredProducts.find(p => p.id === decoded);
      if (found) setSelectedProduct(found);
    }
  }, [filteredProducts]);

  // Ensure catalog filter UI is closed when opening a kit modal
  useEffect(() => {
    if (selectedProduct && (selectedProduct.category === 'Sæt' || (selectedProduct as any).category === 'Kits')) setShowFilters(false);
  }, [selectedProduct]);

  const handleCopyProductLink = (product: Product) => {
    // SPA without router — encode view + product ID
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = `${base}?view=catalog&product=${encodeURIComponent(product.id)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (priceRange?.[1] < (maxPossiblePrice || 100000)) count++;
    if (showOnlyLeaders) count++;
    if (filterBrand) count++;
    if (filterModel) count++;
    if (filterBattType) count++;
    if (filterCapKwh) count++;
    if (filterChgPwrKw) count++;
    if (filterHpType) count++;
    if (filterPhases1) count++;
    if (filterRefrType) count++;
    if (filterHeatCapKw) count++;
    if (filterInvType) count++;
    if (filterPhases) count++;
    if (filterNumMppts) count++;
    if (filterSolarPanelType) count++;
    if (filterRatedPwrWp) count++;
    return count;
  }, [searchQuery, priceRange, showOnlyLeaders, maxPossiblePrice, filterBrand, filterModel, filterBattType, filterCapKwh, filterChgPwrKw, filterHpType, filterPhases1, filterRefrType, filterHeatCapKw, filterInvType, filterPhases, filterNumMppts, filterSolarPanelType, filterRatedPwrWp]);

  const currentTotal = useMemo(() => {
    if (!selectedProduct) return 0;

    const isKit = selectedProduct.category === 'Sæt' || (selectedProduct as any).category === 'Kits';
    // Комплект: базова ціна з base_price лише якщо > 0; інакше product.price (total / fallback з контексту)
    const bp = (selectedProduct as any).base_price;
    const rawBasePrice =
      isKit && typeof bp === 'number' && bp > 0 ? bp : selectedProduct.price;

    const base = getDiscountedPrice(rawBasePrice);
    if (!isKit) return base;

    // Додаємо тільки вибрані додаткові компоненти
    const addonTotal = Object.entries(kitSelectedAddons).reduce((sum, [id, qty]) => {
      const comp = (selectedProduct.kitComponents || []).find(c => c.id === id);
      return sum + (comp ? (comp.price || 0) * (qty as number) : 0);
    }, 0);

    return base + addonTotal;
  }, [selectedProduct, kitSelectedAddons, getDiscountedPrice]);

  const buildKitPartsForCatalog = useCallback((sp: Product, addons: Record<string, number>): KitPart[] | undefined => {
    const isKit = sp.category === 'Sæt' || (sp as any).category === 'Kits';
    if (!isKit) return undefined;
    const allComponents = sp.kitComponents || [];
    const baseComponents = allComponents.filter((c) => c.is_base !== false);
    const addonComponents = allComponents.filter((c) => c.is_base === false);
    const parts: KitPart[] = [
      ...baseComponents.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity ?? 1,
      })),
      ...addonComponents
        .filter((c) => (addons[c.id] ?? 0) > 0)
        .map((c) => ({ id: c.id, name: c.name, price: c.price, quantity: addons[c.id]! })),
    ];
    return parts.length ? parts : undefined;
  }, []);

  const renderFilterField = (label: string, value: string, setter: (v: string) => void, options: string[], color: string = "emerald") => (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
      <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto custom-scrollbar pr-2 p-1 border border-slate-100 rounded-xl bg-slate-50/50">
        {(options || []).length > 0 ? (options || []).map(opt => (
          <Marker 
            key={opt} 
            label={opt} 
            active={value === opt} 
            onClick={() => setter(value === opt ? '' : opt)} 
            color={color} 
          />
        )) : <span className="text-[9px] text-slate-300 font-bold uppercase p-2 italic">{t('filter_no_options')}</span>}
      </div>
    </div>
  );

  const renderCheckbox = (label: string, active: boolean, onClick: () => void) => (
    <button 
      onClick={onClick}
      className="flex items-center gap-3 group cursor-pointer"
    >
      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${active ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 group-hover:border-emerald-300'}`}>
        {active && <Check size={14} strokeWidth={4} />}
      </div>
      <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>{label}</span>
    </button>
  );

  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  return (
    <>
      <div className="relative space-y-6 notranslate mb-10" translate="no">
        {/* Navigation Categories */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 shrink-0">
          {(categories || []).map(cat => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory?.(selectedCategory === cat ? 'All' : cat)} 
              className={`px-2 py-2 sm:px-3 lg:px-6 lg:py-4 rounded-2xl text-[8px] sm:text-[9px] lg:text-[10px] font-black uppercase tracking-tight lg:tracking-widest transition-all shrink-0 text-center leading-tight max-w-[5.25rem] sm:max-w-[7rem] lg:max-w-[11rem] min-h-[2.75rem] lg:min-h-0 flex items-center justify-center hyphens-auto break-words whitespace-normal ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
            >
              {t(`cat_${cat}`)}
            </button>
          ))}
        </div>

        {/* Global Controls & Search */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:max-w-md group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery?.(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-xs font-black outline-none focus:border-emerald-400 shadow-sm transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {!(selectedProduct && (selectedProduct.category === 'Sæt' || (selectedProduct as any).category === 'Kits')) && (
              <button 
                onClick={() => setShowFilters(true)}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFiltersCount > 0 ? 'bg-emerald-500 text-white shadow-xl' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                <SlidersHorizontal size={14} />
                {t('filter_btn')} {activeFiltersCount > 0 && <span className="bg-white text-emerald-600 w-5 h-5 rounded-full flex items-center justify-center text-[8px] ml-1">{activeFiltersCount}</span>}
              </button>
            )}

             <select 
               value={sortBy}
               onChange={(e) => setSortBy?.(e.target.value as SortOption)}
               className="bg-white border-2 border-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 shadow-sm cursor-pointer transition-all"
             >
               <option value="newest">{t('sort_newest')}</option>
               <option value="price-asc">{t('sort_price_asc')}</option>
               <option value="price-desc">{t('sort_price_desc')}</option>
               <option value="rating">{t('sort_rating')}</option>
             </select>
          </div>
        </div>

        {/* Filter Sidebar (hidden when kit modal is open) */}
        {!(selectedProduct && (selectedProduct.category === 'Sæt' || (selectedProduct as any).category === 'Kits')) && (() => {
          const showFilterUi = showFilters;
          return (
            <div className={`fixed inset-0 z-[2000000] transition-all duration-500 ${showFilterUi ? 'visible' : 'invisible'}`}>
              <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${showFilterUi ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowFilters(false)} />
              <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-white shadow-3xl transition-transform duration-500 flex flex-col ${showFilterUi ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><Filter size={20}/></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{t('filter_btn')}</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('filter_sidebar_title')}</p>
                </div>
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Global Status */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-emerald-500 pl-4">{t('filter_status_section')}</h4>
                <div className="grid grid-cols-1 gap-6">
                  {renderCheckbox(t('filter_bestsellers'), showOnlyLeaders, () => setShowOnlyLeaders?.(!showOnlyLeaders))}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-amber-500 pl-4">{t('filter_panel_categories')}</h4>
                <div className="flex flex-wrap gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1">
                  {(categories || []).map(cat => (
                    <Marker 
                      key={cat} 
                      label={t(`cat_${cat}`)} 
                      active={selectedCategory === cat} 
                      onClick={() => setSelectedCategory?.(selectedCategory === cat ? 'All' : cat)} 
                      color="amber" 
                    />
                  ))}
                </div>
              </div>

              {/* Brand Search (Global) */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-blue-500 pl-4">{t('filter_panel_brand')}</h4>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1">
                  {(availableManufacturers || []).length > 0 ? (availableManufacturers || []).map(m => (
                    <Marker 
                      key={m} 
                      label={m} 
                      active={filterBrand === m} 
                      onClick={() => setFilterBrand!(filterBrand === m ? '' : m)} 
                      color="blue" 
                    />
                  )) : <span className="text-[9px] text-slate-300 font-bold uppercase">{t('filter_no_brands')}</span>}
                </div>
              </div>

              {/* Category Specific Filters */}
              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-amber-500 pl-4">
                  {t(`cat_${selectedCategory}`)} Filters
                </h4>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('filter_panel_model')}</label>
                    <div className="flex flex-wrap gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {!filterBrand ? (
                        <span className="text-[9px] text-slate-400 font-bold uppercase p-2 italic">{t('filter_select_brand_first')}</span>
                      ) : (availableModels || []).length > 0 ? (availableModels || []).map(m => (
                        <Marker 
                          key={m} 
                          label={m} 
                          active={filterModel === m} 
                          onClick={() => setFilterModel!(filterModel === m ? '' : m)} 
                          color="indigo" 
                        />
                      )) : <span className="text-[9px] text-slate-300 font-bold uppercase p-2">{t('filter_no_models')}</span>}
                    </div>
                  </div>

                  {selectedCategory === 'Batterier' && (
                    <>
                      {renderFilterField("Battery Type", filterBattType, setFilterBattType!, availableBattTypes, "slate")}
                      {renderFilterField("Capacity [kWh]", filterCapKwh, setFilterCapKwh!, availableCapKwh, "slate")}
                    </>
                  )}

                  {selectedCategory === 'Power Station' && (
                    <>
                      {renderFilterField("Charging Power [kW]", filterChgPwrKw, setFilterChgPwrKw!, availableChgPwrKw, "slate")}
                    </>
                  )}

                  {selectedCategory === 'Varmepumper' && (
                    <>
                      {renderFilterField("Heat Pump Type", filterHpType, setFilterHpType!, availableHpTypes, "slate")}
                      {renderFilterField("Phases", filterPhases1, setFilterPhases1!, availablePhases1, "slate")}
                      {renderFilterField("Refrigerant Type", filterRefrType, setFilterRefrType!, availableRefrTypes, "slate")}
                      {renderFilterField("Heating Capacity [kW]", filterHeatCapKw, setFilterHeatCapKw!, availableHeatCapKw, "slate")}
                    </>
                  )}

                  {selectedCategory === 'Invertere' && (
                    <>
                      {renderFilterField("Inverter Type", filterInvType, setFilterInvType!, availableInvTypes, "slate")}
                      {renderFilterField("Phases", filterPhases, setFilterPhases!, availablePhases, "slate")}
                      {renderFilterField("Number of MPPTs", filterNumMppts, setFilterNumMppts!, availableNumMppts, "slate")}
                    </>
                  )}

                  {selectedCategory === 'Solpaneler' && (
                    <>
                      {renderFilterField("Solar Panel Type", filterSolarPanelType, setFilterSolarPanelType!, availableSolarPanelTypes, "slate")}
                      {renderFilterField("Rated Power [Wp]", filterRatedPwrWp, setFilterRatedPwrWp!, availableRatedPwrWp, "slate")}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-slate-50 flex gap-4 shrink-0">
              <button onClick={() => { resetFilters?.(); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                <RotateCcw size={14}/> {t('filter_reset')}
              </button>
              <button 
                onClick={() => { applyFilters?.(); setShowFilters(false); }} 
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Search size={14}/> {t('filter_apply')}
              </button>
            </div>
              </div>
            </div>
          );
        })()}

        {catalogSelection.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-500 p-4 rounded-2xl shadow-xl">
                  <ListPlus size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{t('catalog_my_selection')}</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {catalogSelection.length} {t('catalog_selection_subtitle')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                <div className="text-left sm:text-right">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">{t('total')}</span>
                  <DualPrice
                    priceExVat={catalogSelectionTotal}
                    className="text-emerald-400"
                    secondaryClassName="text-emerald-400/70"
                  />
                </div>
                <button
                  type="button"
                  onClick={addAllCatalogSelectionToCart}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                >
                  <ShoppingBag size={16} /> {t('add_to_cart')}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('catalog_selection_list_heading')} — {catalogSelection.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catalogSelection.map((line) => (
                  <div
                    key={line.key}
                    className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden transition-all hover:border-emerald-300 shadow-sm"
                  >
                    <div className="flex gap-4 p-5">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center p-1.5">
                        <img
                          src={line.product.image || IMAGE_FALLBACK}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          {t(`cat_${line.product.category}`)}
                        </p>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-snug line-clamp-2">
                          {getLoc(line.product.name)}
                        </h3>
                        {line.quantity > 1 && (
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            ×{line.quantity}
                          </span>
                        )}
                        <DualPrice priceExVat={line.unitPrice * line.quantity} />
                      </div>
                    </div>
                    <div className="flex border-t border-slate-50">
                      <button
                        type="button"
                        onClick={() => removeCatalogSelectionLine(line.key)}
                        className="flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={13} /> {t('catalog_selection_remove')}
                      </button>
                      <div className="w-px bg-slate-50" />
                      <button
                        type="button"
                        onClick={() => addSingleCatalogLineToCart(line)}
                        className="flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        <ShoppingCart size={13} /> {t('add_to_cart')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-2 text-slate-900 border-b border-slate-100 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {t('catalog_results_prefix')} <span className="text-emerald-500">{filteredProducts.length}</span> {t('catalog_results_suffix')} <span className="text-slate-900">{t(`cat_${selectedCategory}`)}</span>
          </div>
        </div>

        {/* Product Grid */}
        {(filteredProducts || []).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-0 animate-fade-in">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelect={(prod) => {
                  setSelectedProduct(prod);
                  setKitSelectedAddons({});
                  setShowFilters(false);
                }}
                onAddToList={(e, prod) => {
                  e.stopPropagation();
                  addLineToCatalogSelection(prod, getDiscountedPrice(prod.price));
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-32 text-center space-y-6 bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto"><Package size={40} className="text-slate-200" /></div>
             <div className="space-y-2 px-6">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t('catalog_no_results_title')}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('catalog_no_results_hint')}</p>
             </div>
             <button onClick={() => resetFilters?.()} className="btn-action mx-auto">{t('filter_reset_all')}</button>
          </div>
        )}
      </div>

      {/* Product / Kit Detail Modal */}
      {selectedProduct && (() => {
        const isKit = selectedProduct.category === 'Sæt' || (selectedProduct as any).category === 'Kits';
        const allComponents: KitComponent[] = selectedProduct.kitComponents || [];
        const baseComponents = allComponents.filter(c => c.is_base !== false);
        const addonComponents = allComponents.filter(c => c.is_base === false);

        return (
        <div className="fixed inset-0 z-[1000000] flex items-end md:items-center justify-center md:p-10 bg-slate-900/95 backdrop-blur-xl animate-fade-in text-left">
          <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full md:max-w-7xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[3rem] md:rounded-[4rem] shadow-3xl flex flex-col overflow-hidden text-slate-900 border border-white/20">

            {/* Header */}
            <div className="px-8 md:px-12 py-8 border-b flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-6">
                <div className={`p-4 rounded-2xl text-white shadow-xl ring-4 ${isKit ? 'bg-amber-500 ring-amber-50 shadow-amber-500/20' : 'bg-emerald-600 ring-emerald-50 shadow-emerald-500/20'}`}>
                  {isKit ? <Layers size={24} /> : <Zap size={24} />}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase text-slate-900 leading-tight tracking-tighter flex items-center gap-3">
                    {isKit ? 'Kits' : getLoc(selectedProduct.name)}
                    {!isKit && selectedProduct.is_leader && <Crown size={24} className="text-amber-500 fill-amber-500 shrink-0" />}
                  </h2>
                  {!isKit && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">{t(`cat_${selectedProduct.category}`)}</span>
                      {selectedProduct.is_leader && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-amber-100 flex items-center gap-1"><Star size={10} fill="currentColor" /> {t('sales_leader')}</span>}
                      {!selectedProduct.is_active && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-rose-100">{t('inactive_status') || 'Inactive'}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleCopyProductLink(selectedProduct)} className={`p-4 rounded-2xl transition-all border flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${copiedLink ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'}`}>
                  {copiedLink ? <><CheckCheck size={18} /> {t('product_copied')}</> : <><Link2 size={18} /> {t('product_share')}</>}
                </button>
                <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><X size={32} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 text-slate-900">
              {isKit ? (
                /* ── KIT LAYOUT ─────────────────────────────────────────── */
                <div className="space-y-8">

                  {/* Kit name (body) */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                      {t('kit_name') || 'Kit name'}
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                      <div className="text-lg md:text-xl font-black uppercase text-slate-900 tracking-tight">
                        {getLoc(selectedProduct.name) || <span className="text-slate-300">{t('product_no_desc') || '—'}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Kit image + description */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4">
                      <div className="bg-slate-50 rounded-[2.5rem] p-8 flex items-center justify-center border border-slate-100 h-[280px] shadow-inner">
                        <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain drop-shadow-xl" alt="" />
                      </div>
                    </div>
                    <div className="lg:col-span-8 space-y-4">
                      {/* Description */}
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                        {t('kit_description') || 'Kit description'}
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 text-slate-600 italic font-medium leading-relaxed whitespace-pre-line break-words">
                        {getLoc(selectedProduct.description) || <span className="text-slate-300">{t('product_no_desc') || 'No description'}</span>}
                      </div>
                      {/* Base price */}
                      {(selectedProduct.base_price ?? 0) > 0 && (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4">
                          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">{t('kit_base_price') || 'Base kit price'}</span>
                          <DualPrice priceExVat={selectedProduct.base_price!} className="text-emerald-700" secondaryClassName="text-emerald-600/60" align="right" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional add-on components */}
                  {addonComponents.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em] flex items-center gap-2">
                        <Layers size={16} className="text-amber-500" /> {t('kit_optional_components') || 'Optional add-ons'}
                      </h4>
                      <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                        {addonComponents.map((c, i) => {
                          const selected = kitSelectedAddons[c.id] ?? 0;
                          return (
                            <div key={c.id} className={`flex items-center justify-between px-6 py-4 transition-colors ${selected > 0 ? 'bg-amber-50/60' : ''} ${i < addonComponents.length - 1 ? 'border-b border-slate-100' : ''}`}>
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${selected > 0 ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-slate-900 truncate block">{c.name}</span>
                                  {c.type_complect && <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">{c.type_complect}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0 ml-4">
                                <DualPrice priceExVat={c.price} className="text-slate-600" secondaryClassName="text-slate-400" showLabels={false} />
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                  <button type="button"
                                    onClick={() => setKitSelectedAddons(prev => {
                                      const next = { ...prev };
                                      if ((next[c.id] ?? 0) <= 1) delete next[c.id];
                                      else next[c.id] = (next[c.id] ?? 0) - 1;
                                      return next;
                                    })}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all font-black text-lg leading-none disabled:opacity-30"
                                    disabled={!selected}>−</button>
                                  <span className={`w-6 text-center text-sm font-black ${selected > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{selected}</span>
                                  <button type="button"
                                    onClick={() => setKitSelectedAddons(prev => ({ ...prev, [c.id]: (prev[c.id] ?? 0) + 1 }))}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 transition-all font-black text-lg leading-none">+</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Docs */}
                  {Array.isArray(selectedProduct.docs) && selectedProduct.docs.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><FileText size={14} className="text-emerald-500" /> {t('documentation_title')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.docs.map((d: any, i: number) => (
                          <a key={i} href={d.url} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors text-[9px] font-black uppercase border border-slate-100">
                            <Download size={12} className="text-emerald-500" /> {d.title || t('product_doc_default')}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── STANDARD PRODUCT LAYOUT ────────────────────────────── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-[3rem] p-12 flex items-center justify-center border border-slate-100 h-[350px] md:h-[450px] shadow-inner relative group overflow-hidden">
                        <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" alt="" />
                      </div>
                      {(() => {
                        const raw = (selectedProduct as any).images;
                        let extra: string[] = [];
                        if (Array.isArray(raw)) extra = raw;
                        else if (typeof raw === 'string') {
                          try {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed)) extra = parsed;
                          } catch { /* ignore */ }
                        }

                        const all = [selectedProduct.image, ...extra].filter(Boolean) as string[];
                        const unique = Array.from(new Set(all));
                        if (unique.length <= 1) return null;
                        return (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                          {unique.map((img, idx) => (
                            <div key={idx} className="w-24 h-24 shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-all snap-start"
                              onClick={() => { const el = document.querySelector('.lg\\:col-span-5 img') as HTMLImageElement; if (el) el.src = img; }}>
                              <img src={img} className="max-w-full max-h-full object-contain" alt="" />
                            </div>
                          ))}
                        </div>
                        );
                      })()}
                    </div>
                    {selectedProduct.video_url && (
                      <div className="bg-slate-900 rounded-[2rem] p-6 flex items-center justify-between text-white group cursor-pointer hover:bg-emerald-600 transition-all">
                        <div className="flex items-center gap-4"><PlayCircle className="text-emerald-400 group-hover:text-white" size={28} /><div className="text-[10px] font-black uppercase tracking-widest">{t('product_watch_review')}</div></div>
                        <ExternalLink size={18} className="opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-7 space-y-12">
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2"><Info size={16} /> {t('about_product')}</h4>
                      <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 leading-relaxed text-slate-600 italic font-medium">{getLoc(selectedProduct.description)}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Layers size={14} className="text-emerald-500" /> {t('specs_title')}</h4>
                        <CategorySpecs product={selectedProduct} />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><FileText size={14} className="text-emerald-500" /> {t('documentation_title')}</h4>
                        <div className="space-y-2">
                          {Array.isArray(selectedProduct.docs) && selectedProduct.docs.length > 0 ? selectedProduct.docs.map((d: any, i: number) => (
                            <a key={i} href={d.url} target="_blank" className="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors group">
                              <span className="text-[9px] font-black uppercase">{d.title || t('product_doc_default')}</span>
                              <Download size={14} className="text-slate-300 group-hover:text-emerald-500" />
                            </a>
                          )) : <p className="text-[10px] text-slate-400 italic">{t('product_no_docs')}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 md:px-12 py-8 md:py-10 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-white/5 sticky bottom-0 z-10">
              <div className="text-left scale-[2] origin-left ml-10">
                <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 tracking-widest">{t('total')}</span>
                <DualPrice priceExVat={currentTotal} className="text-emerald-400" secondaryClassName="text-emerald-400/60" />
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <DocExportButton
                  mode="product"
                  product={{
                    id: selectedProduct.id,
                    name: typeof selectedProduct.name === 'string' ? selectedProduct.name : (selectedProduct.name as any)?.en || (selectedProduct.name as any)?.da || '',
                    category: selectedProduct.category,
                    manufacturer: selectedProduct.manufacturer,
                    description: typeof selectedProduct.description === 'string' ? selectedProduct.description : (selectedProduct.description as any)?.en || (selectedProduct.description as any)?.da || '',
                    price: currentTotal,
                    stock: selectedProduct.stock,
                    specs: Array.isArray(selectedProduct.specs) ? selectedProduct.specs : [],
                    features: selectedProduct.features || [],
                  }}
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parts = isKit
                      ? buildKitPartsForCatalog(selectedProduct, kitSelectedAddons)
                      : undefined;
                    addLineToCatalogSelection(selectedProduct, currentTotal, parts);
                    setKitSelectedAddons({});
                    setSelectedProduct(null);
                  }}
                  className="flex-1 sm:flex-none px-16 py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 shadow-2xl transition-all"
                >
                  <ListPlus size={24} /> {t('catalog_add_to_list')}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </>
  );
};


import React, { useState, useEffect, useMemo } from 'react';
import { useProducts, SortOption } from '../../contexts/ProductsContext';

const MOBILE_MEDIA = '(max-width: 767px)';
const LANDSCAPE_MEDIA = '(orientation: landscape)';
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isMobile;
}
function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(LANDSCAPE_MEDIA).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(LANDSCAPE_MEDIA);
    const update = () => setIsLandscape(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isLandscape;
}
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { IMAGE_FALLBACK } from '../../utils/constants';
import { 
  ShoppingCart, X, Loader2, Zap, Download, FileText, Info, 
  ShoppingBag, CheckCircle2, PlayCircle, Heart, Percent,
  Layers, Package, ArrowRight, ShieldCheck, Star, Factory, Activity, Crown,
  Filter, RotateCcw, ChevronDown, ChevronLeft, Search, SlidersHorizontal, Check, Eye, ExternalLink,
  Link2, Copy, CheckCheck
} from 'lucide-react';
import { Product, Category, KitComponent } from '../../types';
import { Marker } from '../MarkerComponent.tsx';
import { DualPrice } from '../PriceDisplay';
import { DocExportButton } from '../DocExportButton';

export const ProductCard: React.FC<{ 
  product: Product; onSelect: (p: Product) => void; onAddToCart: (e: React.MouseEvent, p: Product) => void; 
}> = React.memo(({ product, onSelect, onAddToCart }) => {
  const { formatPrice, t, getLoc } = useLanguage();
  const { getDiscountedPrice, currentUser } = useUser();
  
  const discountedPrice = getDiscountedPrice(product.price);
  const hasDiscount = currentUser && currentUser.discount && currentUser.discount > 0;

  return (
    <div onClick={() => onSelect(product)} className="group bg-white rounded-[2rem] overflow-hidden cursor-pointer border border-slate-100 hover:border-emerald-400 transition-all duration-500 shadow-sm hover:shadow-xl flex flex-col h-full notranslate relative" translate="no">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {hasDiscount && (
          <div className="bg-rose-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-md">
            <Percent size={8}/> {currentUser.discount}%
          </div>
        )}
        {product.is_leader && (
          <div className="bg-amber-500 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-md">
            <Star size={8} fill="currentColor"/> {t('sales_leader')}
          </div>
        )}
        {!product.is_active && (
          <div className="bg-slate-400 text-white px-2 py-1 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 shadow-md">
            {t('inactive_status') || 'Inactive'}
          </div>
        )}
      </div>
      <div className="relative h-48 w-full p-6 flex items-center justify-center bg-slate-50/50">
        <img src={product.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110" alt="" />
        <div className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-2 rounded-2xl shadow-lg">
          <DualPrice priceExVat={discountedPrice} align="right" showLabels={false} className="text-white" secondaryClassName="text-white/70" />
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 text-left text-slate-900">
        <h3 className="text-[12px] font-black uppercase line-clamp-2 mb-4 leading-tight">{getLoc(product.name)}</h3>
        <div className="mt-auto space-y-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {product.manufacturer && (
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Factory size={10} /> {product.manufacturer}
              </div>
            )}
            {product.category === 'Invertere' && product.inverter_type && (
              <div className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} /> {product.inverter_type}
              </div>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onAddToCart(e, product); }} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-md">
            <ShoppingCart size={14}/> {t('add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  );
});

const MobileBsProductCard: React.FC<{
  product: Product;
  onSelect: (p: Product) => void;
  onAddToCart: (e: React.MouseEvent, p: Product) => void;
}> = React.memo(({ product, onSelect, onAddToCart }) => {
  const { formatPrice, t, getLoc } = useLanguage();
  const { getDiscountedPrice, currentUser } = useUser();

  const discountedPrice = getDiscountedPrice(product.price);
  const hasDiscount = currentUser && currentUser.discount && currentUser.discount > 0;

  return (
    <div className="card h-100 shadow-sm border-0" role="button" onClick={() => onSelect(product)}>
      <div className="ratio ratio-1x1 bg-light rounded-top overflow-hidden">
        <img src={product.image || IMAGE_FALLBACK} alt="" className="w-100 h-100 object-fit-contain p-2" />
      </div>
      <div className="card-body d-flex flex-column gap-2">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div className="fw-bold text-uppercase text-truncate" style={{ fontSize: 12, letterSpacing: '0.04em' }}>
              {getLoc(product.name)}
            </div>
            <div className="text-secondary text-truncate" style={{ fontSize: 12 }}>
              {product.manufacturer || t(`cat_${product.category}`)}
            </div>
          </div>
          {product.is_leader && (
            <span className="badge text-bg-warning text-uppercase" style={{ fontSize: 10, letterSpacing: '0.08em' }}>
              {t('sales_leader')}
            </span>
          )}
        </div>

        <div className="mt-auto">
          <div className="d-flex align-items-baseline justify-content-between">
            <div className="fw-bold text-success" style={{ fontSize: 16 }}>
              {formatPrice(discountedPrice)}
            </div>
            {hasDiscount && discountedPrice !== product.price && (
              <div className="text-secondary text-decoration-line-through" style={{ fontSize: 12 }}>
                {formatPrice(product.price)}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-dark w-100 mt-2" onClick={(e) => { e.stopPropagation(); onAddToCart(e, product); }}>
            {t('add_to_cart')}
          </button>
        </div>
      </div>
    </div>
  );
});

const CategorySpecs: React.FC<{ product: Product }> = ({ product }) => {
  const renderSpec = (label: string, value: any, suffix: string = '') => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex justify-between items-center py-2.5 md:py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs md:text-[9px] font-black text-slate-500 md:text-slate-400 uppercase tracking-wider md:tracking-widest">{label}</span>
        <span className="text-sm md:text-[10px] font-bold text-slate-900">{String(value)}{suffix}</span>
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

export const CatalogSection: React.FC = () => {
  const { t, formatPrice, getLoc } = useLanguage();
  const productsContext = useProducts();

  // Safe context extraction
  const { 
    filteredProducts = [], categories = [], selectedCategory = 'All' as (Category | 'All'), setSelectedCategory, isLoading = false,
    searchQuery = '', setSearchQuery, priceRange = [0, 100000], setPriceRange,
    selectedManufacturers = [], setSelectedManufacturers, selectedSubcategories = [], setSelectedSubcategories,
    selectedPowerMarkers = [], setSelectedPowerMarkers, showOnlyLeaders = false, setShowOnlyLeaders,
    sortBy = 'newest' as SortOption, setSortBy,
    availableManufacturers = [], availableModels = [], availableSubcategories = [], availablePowerMarkers = [], maxPossiblePrice = 100000, resetFilters,
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
  const { toggleWishlist, isInWishlist, setPendingEmail } = useWishlist();
  const { addNotification } = useNotification();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showLandscapeProductInfo, setShowLandscapeProductInfo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const [bookingEmailModal, setBookingEmailModal] = useState<Product | null>(null);
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingName, setBookingName] = useState('');

  const handleBookingClick = async (product: Product) => {
    if (isInWishlist(product.id)) {
      // Cancel — no email needed
      await toggleWishlist(product);
      return;
    }
    const email = currentUser?.email || '';
    if (email) {
      await toggleWishlist(product, email, currentUser?.name || '');
    } else {
      setBookingEmailModal(product);
      setBookingEmail('');
      setBookingName('');
    }
  };

  const handleBookingSubmit = async () => {
    if (!bookingEmailModal || !bookingEmail.includes('@')) {
      addNotification(t('err_email_invalid'), 'error');
      return;
    }
    setPendingEmail(bookingEmail);
    await toggleWishlist(bookingEmailModal, bookingEmail, bookingName);
    setBookingEmailModal(null);
  };

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

  useEffect(() => {
    if (!selectedProduct) setShowLandscapeProductInfo(false);
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

  const toggleArray = (arr: string[], val: string, setter: (v: string[]) => void) => {
    const currentArr = Array.isArray(arr) ? arr : [];
    setter(currentArr.includes(val) ? currentArr.filter(x => x !== val) : [...currentArr, val]);
  };

  const currentTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return getDiscountedPrice(selectedProduct.price);
  }, [selectedProduct, getDiscountedPrice]);

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
        {isMobile ? (
          <div className="container-fluid px-3">
            <div className="d-flex gap-2 overflow-auto pb-2">
              {(categories || []).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory?.(selectedCategory === cat ? 'All' : cat)}
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-dark' : 'btn-outline-secondary'}`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {t(`cat_${cat}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 shrink-0">
            {(categories || []).map(cat => (
              <button 
                key={cat} 
                onClick={() => setSelectedCategory?.(selectedCategory === cat ? 'All' : cat)} 
                className={`px-3 py-2 lg:px-8 lg:py-4 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-tight lg:tracking-widest transition-all shrink-0 text-center leading-tight max-w-[64px] lg:max-w-none ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
              >
                {t(`cat_${cat}`)}
              </button>
            ))}
          </div>
        )}

        {/* Global Controls & Search */}
        {isMobile ? (
          <div className="container-fluid px-3">
            <div className="row g-2 align-items-center">
              <div className="col-12">
                <div className="input-group">
                  <span className="input-group-text bg-white"><Search size={16} /></span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery?.(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-6">
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className={`btn w-100 ${activeFiltersCount > 0 ? 'btn-success' : 'btn-outline-secondary'}`}
                >
                  <span className="d-inline-flex align-items-center gap-2">
                    <SlidersHorizontal size={16} />
                    {t('filter_btn')}
                    {activeFiltersCount > 0 && (
                      <span className="badge text-bg-light text-success">{activeFiltersCount}</span>
                    )}
                  </span>
                </button>
              </div>
              <div className="col-6">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy?.(e.target.value as SortOption)}
                  className="form-select"
                >
                  <option value="newest">{t('sort_newest')}</option>
                  <option value="price-asc">{t('sort_price_asc')}</option>
                  <option value="price-desc">{t('sort_price_desc')}</option>
                  <option value="rating">{t('sort_rating')}</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
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
              <button 
                onClick={() => setShowFilters(true)}
                className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFiltersCount > 0 ? 'bg-emerald-500 text-white shadow-xl' : 'bg-white text-slate-600 border border-slate-100'}`}
              >
                <SlidersHorizontal size={14} />
                {t('filter_btn')} {activeFiltersCount > 0 && <span className="bg-white text-emerald-600 w-5 h-5 rounded-full flex items-center justify-center text-[8px] ml-1">{activeFiltersCount}</span>}
              </button>

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
        )}

        {/* Filter Sidebar */}
        {isMobile ? (
          <div className={`position-fixed top-0 start-0 w-100 h-100 z-[2000000] ${showFilters ? '' : 'd-none'}`}>
            <div className="modal-backdrop fade show" onClick={() => setShowFilters(false)} aria-hidden />
            <div className="offcanvas offcanvas-end show d-block" role="dialog" aria-modal="true" aria-label="Filters">
              <div className="offcanvas-header border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <Filter size={18} />
                  <strong>{t('filter_btn')}</strong>
                </div>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowFilters(false)} />
              </div>
              <div className="offcanvas-body">
                <div className="d-flex flex-column gap-3">
                  <div className="alert alert-secondary py-2 mb-0" role="note">
                    <small>{t('filter_sidebar_title')}</small>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary w-100" onClick={() => resetFilters?.()}>
                      {t('filter_reset')}
                    </button>
                    <button type="button" className="btn btn-success w-100" onClick={() => { applyFilters?.(); setShowFilters(false); }}>
                      {t('filter_apply')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`fixed inset-0 z-[2000000] transition-all duration-500 ${showFilters ? 'visible' : 'invisible'}`}>
            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${showFilters ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowFilters(false)} />
            <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-white shadow-3xl transition-transform duration-500 flex flex-col ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
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
        )}

        {isMobile ? (
          <div className="container-fluid px-3">
            <div className="d-flex align-items-center justify-content-between border-bottom py-2">
              <small className="text-secondary text-uppercase fw-bold" style={{ letterSpacing: '0.14em' }}>
                {t('catalog_results_prefix')} <span className="text-success">{filteredProducts.length}</span> {t('catalog_results_suffix')}
              </small>
              <small className="fw-bold">{t(`cat_${selectedCategory}`)}</small>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 text-slate-900 border-b border-slate-100 pb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {t('catalog_results_prefix')} <span className="text-emerald-500">{filteredProducts.length}</span> {t('catalog_results_suffix')} <span className="text-slate-900">{t(`cat_${selectedCategory}`)}</span>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {(filteredProducts || []).length > 0 ? (
          isMobile ? (
            <div className="container-fluid px-3 py-3">
              <div className="row row-cols-2 g-3">
                {filteredProducts.map((p) => (
                  <div key={p.id} className="col">
                    <MobileBsProductCard
                      product={p}
                      onSelect={setSelectedProduct}
                      onAddToCart={(e, prod) => {
                        e.stopPropagation();
                        addItem({ ...prod, price: getDiscountedPrice(prod.price) });
                        addNotification(t('item_added'), 'success');
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-0 animate-fade-in">
              {filteredProducts.map((p) => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onSelect={setSelectedProduct} 
                  onAddToCart={(e, prod) => {
                    e.stopPropagation();
                    addItem({ ...prod, price: getDiscountedPrice(prod.price) });
                    addNotification(t('item_added'), 'success');
                  }} 
                />
              ))}
            </div>
          )
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

      {/* Mobile landscape: bar with thumbnail, "Info about product" button; modal with gallery. */}
      {selectedProduct && isMobile && isLandscape && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-[1000000] flex items-center gap-3 px-3 py-2.5 bg-white border-t-2 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
            {/* Thumbnail */}
            <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              <img
                src={selectedProduct.image || IMAGE_FALLBACK}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 truncate">{getLoc(selectedProduct.name)}</div>
              <div className="text-xs text-slate-500 truncate">{selectedProduct.manufacturer || t(`cat_${selectedProduct.category}`)}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowLandscapeProductInfo(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold uppercase tracking-wide shadow-md active:scale-95"
            >
              <Info size={18} />
              {t('about_product') || 'Info'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="shrink-0 p-2 rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {showLandscapeProductInfo && (
            <div className="fixed inset-0 z-[1000001] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                  <span className="text-sm font-bold text-slate-900 truncate">{getLoc(selectedProduct.name)}</span>
                  <button
                    type="button"
                    onClick={() => setShowLandscapeProductInfo(false)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 shrink-0"
                    aria-label="Close"
                  >
                    <X size={22} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex justify-center">
                    <img
                      src={selectedProduct.image || IMAGE_FALLBACK}
                      alt=""
                      className="max-h-32 w-auto object-contain"
                    />
                  </div>
                  {/* Gallery */}
                  {selectedProduct.images && selectedProduct.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {[selectedProduct.image, ...selectedProduct.images].filter(Boolean).map((img, idx) => (
                        <div key={idx} className="w-14 h-14 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          <img src={img} alt="" className="w-full h-full object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-black uppercase text-emerald-600 tracking-wider mb-2">{t('about_product') || 'Description'}</h3>
                    <p className="text-slate-700 text-sm leading-relaxed">{getLoc(selectedProduct.description) || '—'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider mb-2">{t('specs_title') || 'Technical specs'}</h3>
                    <CategorySpecs product={selectedProduct} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mobile portrait: full-screen product page. */}
      {selectedProduct && isMobile && !isLandscape && (
        <div className="position-fixed top-0 start-0 w-100 h-100 z-[1000000] bg-white animate-fade-in d-flex flex-column">
          <div className="border-bottom position-sticky top-0 bg-white z-3 flex-shrink-0">
            <div className="container-fluid px-3 py-2">
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedProduct(null)}>
                  <span className="d-inline-flex align-items-center gap-1">
                    <ChevronLeft size={18} />
                    {t('back') || 'Back'}
                  </span>
                </button>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="fw-bold text-truncate">{getLoc(selectedProduct.name)}</div>
                  <small className="text-secondary text-truncate d-block">{selectedProduct.manufacturer || t(`cat_${selectedProduct.category}`)}</small>
                </div>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setSelectedProduct(null)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-2 d-flex flex-wrap gap-2">
                <span className="badge text-bg-success text-uppercase" style={{ letterSpacing: '0.08em' }}>{t(`cat_${selectedProduct.category}`)}</span>
                {selectedProduct.manufacturer && <span className="badge text-bg-primary text-uppercase" style={{ letterSpacing: '0.08em' }}>{selectedProduct.manufacturer}</span>}
                {selectedProduct.is_leader && <span className="badge text-bg-warning text-uppercase" style={{ letterSpacing: '0.08em' }}>{t('sales_leader')}</span>}
                {!selectedProduct.is_active && <span className="badge text-bg-secondary text-uppercase" style={{ letterSpacing: '0.08em' }}>{t('inactive_status') || 'Inactive'}</span>}
              </div>
            </div>
          </div>
          <div className="flex-grow-1 min-h-0 overflow-auto">
            <div className="container-fluid px-3 pt-3 pb-3">
              <div className="card border-0 shadow-sm mb-3">
                <div className="ratio ratio-1x1 bg-light rounded-top overflow-hidden">
                  <img src={selectedProduct.image || IMAGE_FALLBACK} className="w-100 h-100 object-fit-contain p-3" alt="" />
                </div>
              </div>
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="d-flex gap-2 overflow-auto pb-2 mb-3">
                  {[selectedProduct.image, ...selectedProduct.images].filter(Boolean).map((img, idx) => (
                    <div key={idx} className="border rounded bg-light flex-shrink-0" style={{ width: 72, height: 72 }}>
                      <img src={img} className="w-100 h-100 object-fit-contain p-2" alt="" />
                    </div>
                  ))}
                </div>
              )}
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="card-title mb-2">
                    <span className="d-inline-flex align-items-center gap-2 text-success text-uppercase" style={{ letterSpacing: '0.12em', fontWeight: 800, fontSize: 12 }}>
                      <Info size={16} /> {t('about_product') || 'Asset Details'}
                    </span>
                  </h6>
                  <p className="card-text mb-0" style={{ fontSize: 16, lineHeight: 1.5 }}>{getLoc(selectedProduct.description) || '—'}</p>
                </div>
              </div>
              <div className="card mb-3 bg-light">
                <div className="card-body">
                  <h6 className="card-title mb-2">
                    <span className="d-inline-flex align-items-center gap-2 text-uppercase text-secondary" style={{ letterSpacing: '0.12em', fontWeight: 800, fontSize: 12 }}>
                      <Layers size={16} /> {t('specs_title') || 'Technical specs'}
                    </span>
                  </h6>
                  <CategorySpecs product={selectedProduct} />
                </div>
              </div>
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="card-title mb-3">
                    <span className="d-inline-flex align-items-center gap-2 text-uppercase text-secondary" style={{ letterSpacing: '0.12em', fontWeight: 800, fontSize: 12 }}>
                      <FileText size={16} /> {t('documentation_title') || 'Documentation'}
                    </span>
                  </h6>
                  {Array.isArray(selectedProduct.docs) && selectedProduct.docs.length > 0 ? (
                    <div className="list-group">
                      {selectedProduct.docs.map((d: any, i: number) => (
                        <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{d.title || 'Tech Sheet'}</span>
                          <Download size={16} className="text-success" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-secondary fst-italic">{t('product_no_docs')}</div>
                  )}
                </div>
              </div>
              {selectedProduct.video_url && (
                <a href={selectedProduct.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-dark w-100 d-flex align-items-center justify-content-between mb-5">
                  <span className="d-inline-flex align-items-center gap-2 text-uppercase fw-bold" style={{ letterSpacing: '0.08em' }}>
                    <PlayCircle size={18} /> {t('product_watch_review')}
                  </span>
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>
          <div className="border-top position-sticky bottom-0 bg-dark flex-shrink-0 z-3">
            <div className="container-fluid px-3 py-3 text-white">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div>
                  <small className="text-white-50 text-uppercase fw-bold" style={{ letterSpacing: '0.16em' }}>{t('total')}</small>
                  <DualPrice priceExVat={currentTotal} className="text-emerald-400 text-xl" secondaryClassName="text-emerald-400/60" />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button type="button" onClick={() => handleBookingClick(selectedProduct)} className={`btn btn-sm ${isInWishlist(selectedProduct.id) ? 'btn-outline-danger' : 'btn-outline-light'}`} aria-label={t('nav_wishlist')}>
                    <Heart size={18} fill={isInWishlist(selectedProduct.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={() => { addItem({ ...selectedProduct, price: currentTotal }); addNotification(t('item_added'), 'success'); setSelectedProduct(null); }} className="btn btn-success">
                    <span className="d-inline-flex align-items-center gap-2 text-uppercase fw-bold" style={{ letterSpacing: '0.08em' }}>
                      <ShoppingCart size={18} /> {t('add_to_cart')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: modal (option B kept for md+) */}
      {selectedProduct && !isMobile && (
        <div className="fixed inset-0 z-[1000000] flex flex-col md:flex-row md:items-center justify-end md:justify-center md:p-10 bg-slate-900/95 backdrop-blur-xl animate-fade-in text-left md:overflow-y-auto">
          <div className="absolute inset-0 z-0" onClick={() => setSelectedProduct(null)} aria-hidden />
          <div 
            className="relative z-10 bg-white w-full md:max-w-7xl md:max-h-[90vh] rounded-t-[2rem] md:rounded-[4rem] shadow-3xl flex flex-col overflow-hidden text-slate-900 border border-white/20 min-h-0 flex-1 md:flex-none max-h-[95vh] md:max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
             {/* Header — compact on mobile */}
             <div className="px-4 md:px-12 py-4 md:py-8 border-b flex items-center justify-between bg-white shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3 md:gap-6 min-w-0">
                   <div className="bg-emerald-600 p-2.5 md:p-4 rounded-xl md:rounded-2xl text-white shadow-lg shrink-0"><Zap size={20} className="md:w-6 md:h-6" /></div>
                   <div className="min-w-0">
                     <h2 className="text-lg md:text-3xl font-black uppercase text-slate-900 leading-tight tracking-tighter truncate flex items-center gap-2">
                       {getLoc(selectedProduct.name)}
                       {selectedProduct.is_leader && <Crown size={18} className="text-amber-500 fill-amber-500 shrink-0 md:w-6 md:h-6" />}
                     </h2>
                     <div className="flex flex-wrap gap-2 mt-1 md:mt-2">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-emerald-100">{t(`cat_${selectedProduct.category}`)}</span>
                        {selectedProduct.manufacturer && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase border border-blue-100">{selectedProduct.manufacturer}</span>}
                        {selectedProduct.is_leader && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 flex items-center gap-1"><Star size={10} fill="currentColor" /> {t('sales_leader')}</span>}
                        {!selectedProduct.is_active && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">{t('inactive_status') || 'Inactive'}</span>}
                     </div>
                   </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                   <button onClick={() => handleBookingClick(selectedProduct)} className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all border ${isInWishlist(selectedProduct.id) ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`} aria-label={t('nav_wishlist')}><Heart size={18} className="md:w-5 md:h-5" fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} /></button>
                   <button onClick={() => handleCopyProductLink(selectedProduct)} className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl border flex items-center gap-1.5 text-[9px] font-black uppercase ${copiedLink ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}><Link2 size={16} className="md:w-[18px] md:h-[18px]" /> {copiedLink ? t('product_copied') : t('product_share')}</button>
                   <button onClick={() => setSelectedProduct(null)} className="p-2.5 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl text-slate-400"><X size={24} className="md:w-8 md:h-8" /></button>
                </div>
             </div>

             {/* Mobile: single full-height scrollable column with readable text */}
             <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:hidden">
               <div className="p-4 pb-32 space-y-6">
                 <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center border border-slate-100 min-h-[220px]">
                   <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-[200px] object-contain" alt="" />
                 </div>
                 {selectedProduct.images && selectedProduct.images.length > 0 && (
                   <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                     {[selectedProduct.image, ...selectedProduct.images].filter(Boolean).map((img, idx) => (
                       <div key={idx} className="w-16 h-16 shrink-0 bg-slate-50 rounded-xl border border-slate-100 p-1.5 flex items-center justify-center snap-start">
                         <img src={img} className="max-w-full max-h-full object-contain" alt="" />
                       </div>
                     ))}
                   </div>
                 )}
                 <section className="bg-white border border-slate-100 rounded-2xl p-5">
                   <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest mb-3 flex items-center gap-2"><Info size={14} /> {t('about_product') || 'Asset Details'}</h3>
                   <p className="text-slate-700 text-base leading-relaxed font-medium">{getLoc(selectedProduct.description) || '—'}</p>
                 </section>
                 <section className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                   <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest mb-3 flex items-center gap-2"><Layers size={14} className="text-emerald-500" /> {t('specs_title') || 'Technical specs'}</h3>
                   <CategorySpecs product={selectedProduct} />
                 </section>
                 <section className="bg-white border border-slate-100 rounded-2xl p-5">
                   <h3 className="text-xs font-black uppercase text-slate-700 tracking-widest mb-3 flex items-center gap-2"><FileText size={14} className="text-emerald-500" /> {t('documentation_title') || 'Documentation'}</h3>
                   {Array.isArray(selectedProduct.docs) && selectedProduct.docs.length > 0 ? (
                     <div className="space-y-2">
                       {selectedProduct.docs.map((d: any, i: number) => (
                         <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-slate-800 text-sm font-bold">
                           {d.title || 'Tech Sheet'} <Download size={16} className="text-emerald-500 shrink-0" />
                         </a>
                       ))}
                     </div>
                   ) : (
                     <p className="text-slate-500 text-sm italic">{t('product_no_docs')}</p>
                   )}
                 </section>
                 {selectedProduct.video_url && (
                   <a href={selectedProduct.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
                     <span className="text-sm font-black uppercase flex items-center gap-2"><PlayCircle size={20} className="text-emerald-400" /> {t('product_watch_review')}</span>
                     <ExternalLink size={18} />
                   </a>
                 )}
               </div>
             </div>

             {/* Desktop: grid body (unchanged) — hidden on mobile */}
             <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-12 text-slate-900 hidden md:block">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-[3rem] p-12 flex items-center justify-center border border-slate-100 h-[350px] lg:h-[450px] shadow-inner relative group overflow-hidden">
                        <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" alt="" />
                      </div>
                      {selectedProduct.images && selectedProduct.images.length > 0 && (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                          {[selectedProduct.image, ...selectedProduct.images].filter(Boolean).map((img, idx) => (
                            <div key={idx} className="w-24 h-24 shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-all snap-start"
                              onClick={() => { const mainImg = document.querySelector('.lg\\:col-span-5 img') as HTMLImageElement; if (mainImg) mainImg.src = img; }}>
                              <img src={img} className="max-w-full max-h-full object-contain" alt="" />
                            </div>
                          ))}
                        </div>
                      )}
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
                      <h4 className="text-[11px] font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2"><Info size={16} /> Asset Details</h4>
                      <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 leading-relaxed text-slate-600 italic font-medium">
                        {getLoc(selectedProduct.description)}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><Layers size={14} className="text-emerald-500" /> Technical Filters</h4>
                          <CategorySpecs product={selectedProduct} />
                       </div>
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><FileText size={14} className="text-emerald-500" /> Documentation</h4>
                          <div className="space-y-2">
                             {Array.isArray(selectedProduct.docs) && selectedProduct.docs.length > 0 ? selectedProduct.docs.map((d: any, i: number) => (
                               <a key={i} href={d.url} target="_blank" className="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors group">
                                 <span className="text-[9px] font-black uppercase">{d.title || 'Tech Sheet'}</span>
                                 <Download size={14} className="text-slate-300 group-hover:text-emerald-500" />
                               </a>
                             )) : <p className="text-[10px] text-slate-400 italic">{t('product_no_docs')}</p>}
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
             </div>

             {/* Footer — sticky; height reduced ~40% on mobile (py-2) and desktop (py-6), text/button unchanged */}
             <div className="px-4 md:px-12 py-2 md:py-6 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-6 border-t border-white/5 shrink-0 sticky bottom-0 z-20">
                <div className="text-left">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-0.5 tracking-widest">{t('total')}</span>
                  <DualPrice priceExVat={currentTotal} className="text-emerald-400 text-xl md:text-3xl" secondaryClassName="text-emerald-400/60" />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
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
                    className="shrink-0 hidden sm:block"
                  />
                  <button 
                    onClick={() => { addItem({ ...selectedProduct, price: currentTotal }); addNotification(t('item_added'), 'success'); setSelectedProduct(null); }} 
                    className="flex-1 sm:flex-none px-6 md:px-16 py-4 md:py-6 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-2xl"
                  >
                    <ShoppingBag size={22} className="md:w-6 md:h-6" /> {t('add_to_cart')}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Booking Email Modal */}
      {bookingEmailModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}
          onClick={() => setBookingEmailModal(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl space-y-6"
            onClick={e => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-2">
                <Heart size={24} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('booking_modal_title')}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('booking_modal_subtitle')}</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
              <img src={bookingEmailModal.image || IMAGE_FALLBACK} alt="" className="w-12 h-12 object-contain rounded-xl bg-white p-1" />
              <div>
                <div className="text-[10px] font-black text-slate-900 uppercase">
                  {typeof bookingEmailModal.name === 'string' ? bookingEmailModal.name : (bookingEmailModal.name as any)?.en || ''}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold uppercase">{bookingEmailModal.category}</div>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('booking_name_placeholder')}
                value={bookingName}
                onChange={e => setBookingName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all"
              />
              <input
                type="email"
                placeholder={t('booking_email_placeholder')}
                value={bookingEmail}
                onChange={e => setBookingEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBookingSubmit()}
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setBookingEmailModal(null)}
                className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-slate-300 transition-all">
                {t('booking_cancel')}
              </button>
              <button onClick={handleBookingSubmit}
                className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                <Heart size={14} fill="white" /> {t('booking_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

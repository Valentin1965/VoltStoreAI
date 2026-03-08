
import React, { useState, useEffect, useMemo } from 'react';
import { useProducts, SortOption } from '../../contexts/ProductsContext';
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
  Filter, RotateCcw, ChevronDown, Search, SlidersHorizontal, Check, Eye, ExternalLink,
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

const CategorySpecs: React.FC<{ product: Product }> = ({ product }) => {
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
           )) : <p className="text-[10px] text-slate-400 italic">Specifications unassigned</p>}
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
  const [copiedLink, setCopiedLink] = useState(false);
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
      addNotification('Please enter a valid email', 'error');
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
        )) : <span className="text-[9px] text-slate-300 font-bold uppercase p-2 italic">No options available</span>}
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
              className={`px-3 py-2 lg:px-8 lg:py-4 rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-tight lg:tracking-widest transition-all shrink-0 text-center leading-tight max-w-[64px] lg:max-w-none ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
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
             <button 
              onClick={() => setShowFilters(true)}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFiltersCount > 0 ? 'bg-emerald-500 text-white shadow-xl' : 'bg-white text-slate-600 border border-slate-100'}`}
             >
               <SlidersHorizontal size={14} />
               Filter {activeFiltersCount > 0 && <span className="bg-white text-emerald-600 w-5 h-5 rounded-full flex items-center justify-center text-[8px] ml-1">{activeFiltersCount}</span>}
             </button>

             <select 
               value={sortBy}
               onChange={(e) => setSortBy?.(e.target.value as SortOption)}
               className="bg-white border-2 border-slate-100 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 shadow-sm cursor-pointer transition-all"
             >
               <option value="newest">Newest</option>
               <option value="price-asc">Price: Low-High</option>
               <option value="price-desc">Price: High-Low</option>
               <option value="rating">Rating: Top</option>
             </select>
          </div>
        </div>

        {/* Filter Sidebar */}
        <div className={`fixed inset-0 z-[2000000] transition-all duration-500 ${showFilters ? 'visible' : 'invisible'}`}>
          <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${showFilters ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowFilters(false)} />
          <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-white shadow-3xl transition-transform duration-500 flex flex-col ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center"><Filter size={20}/></div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Filter</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Global Asset Filtering System</p>
                </div>
              </div>
              <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {/* Global Status */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-emerald-500 pl-4">Asset Status</h4>
                <div className="grid grid-cols-1 gap-6">
                  {renderCheckbox("Bestsellers", showOnlyLeaders, () => setShowOnlyLeaders?.(!showOnlyLeaders))}
                </div>
              </div>

              {/* Category Selection */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-amber-500 pl-4">Category Selection</h4>
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
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-blue-500 pl-4">Brand (Producer)</h4>
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1">
                  {(availableManufacturers || []).length > 0 ? (availableManufacturers || []).map(m => (
                    <Marker 
                      key={m} 
                      label={m} 
                      active={filterBrand === m} 
                      onClick={() => setFilterBrand!(filterBrand === m ? '' : m)} 
                      color="blue" 
                    />
                  )) : <span className="text-[9px] text-slate-300 font-bold uppercase">No brands identified</span>}
                </div>
              </div>

              {/* Category Specific Filters */}
              <div className="space-y-8">
                <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] border-l-4 border-amber-500 pl-4">
                  {t(`cat_${selectedCategory}`)} Filters
                </h4>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Model Name</label>
                    <div className="flex flex-wrap gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                      {!filterBrand ? (
                        <span className="text-[9px] text-slate-400 font-bold uppercase p-2 italic">Select a brand to see models</span>
                      ) : (availableModels || []).length > 0 ? (availableModels || []).map(m => (
                        <Marker 
                          key={m} 
                          label={m} 
                          active={filterModel === m} 
                          onClick={() => setFilterModel!(filterModel === m ? '' : m)} 
                          color="indigo" 
                        />
                      )) : <span className="text-[9px] text-slate-300 font-bold uppercase p-2">No models identified for this brand</span>}
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
                <RotateCcw size={14}/> Reset
              </button>
              <button 
                onClick={() => { applyFilters?.(); setShowFilters(false); }} 
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Search size={14}/> Search Assets
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-slate-900 border-b border-slate-100 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Scanning results: <span className="text-emerald-500">{filteredProducts.length}</span> assets identified in <span className="text-slate-900">{t(`cat_${selectedCategory}`)}</span>
          </div>
        </div>

        {/* Product Grid */}
        {(filteredProducts || []).length > 0 ? (
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
        ) : (
          <div className="py-32 text-center space-y-6 bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto"><Package size={40} className="text-slate-200" /></div>
             <div className="space-y-2 px-6">
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No products found matching your criteria</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Try changing your search parameters or resetting filters.</p>
             </div>
             <button onClick={() => resetFilters?.()} className="btn-action mx-auto">Reset All Filters</button>
          </div>
        )}
      </div>

      {/* Modern Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[1000000] flex items-end md:items-center justify-center md:p-10 bg-slate-900/95 backdrop-blur-xl animate-fade-in text-left">
          <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white w-full md:max-w-7xl h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[3rem] md:rounded-[4rem] shadow-3xl flex flex-col overflow-hidden text-slate-900 border border-white/20">
             
             {/* Header */}
             <div className="px-8 md:px-12 py-8 border-b flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-6">
                   <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-50"><Zap size={24} /></div>
                   <div>
                     <h2 className="text-2xl md:text-3xl font-black uppercase text-slate-900 leading-tight tracking-tighter truncate max-w-[200px] sm:max-w-none flex items-center gap-3">
                       {getLoc(selectedProduct.name)}
                       {selectedProduct.is_leader && <Crown size={24} className="text-amber-500 fill-amber-500 shrink-0" />}
                     </h2>
                     <div className="flex flex-wrap gap-3 mt-2">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">{t(`cat_${selectedProduct.category}`)}</span>
                        {selectedProduct.manufacturer && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-blue-100">{selectedProduct.manufacturer}</span>}
                        {selectedProduct.is_leader && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-amber-100 flex items-center gap-1"><Star size={10} fill="currentColor" /> {t('sales_leader')}</span>}
                        {!selectedProduct.is_active && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-lg uppercase tracking-widest border border-rose-100">{t('inactive_status') || 'Inactive'}</span>}
                     </div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <button 
                    onClick={() => handleBookingClick(selectedProduct)} 
                    className={`p-4 rounded-2xl transition-all border ${isInWishlist(selectedProduct.id) ? 'bg-rose-50 border-rose-100 text-rose-500 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-300'}`}
                   >
                     <Heart size={20} fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} />
                   </button>
                   {/* Share / Copy link button */}
                   <button
                     onClick={() => handleCopyProductLink(selectedProduct)}
                     title="Copy product link"
                     className={`p-4 rounded-2xl transition-all border flex items-center gap-2 text-[9px] font-black uppercase tracking-widest
                       ${copiedLink
                         ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                         : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-emerald-200 hover:text-emerald-500'
                       }`}
                   >
                     {copiedLink ? <><CheckCheck size={18} /> Copied!</> : <><Link2 size={18} /> Share</>}
                   </button>
                   <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><X size={32} /></button>
                </div>
             </div>
             
             {/* Body */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12 text-slate-900">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                 <div className="lg:col-span-5 space-y-8">
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-[3rem] p-12 flex items-center justify-center border border-slate-100 h-[350px] md:h-[450px] shadow-inner relative group overflow-hidden">
                        <img 
                          src={selectedProduct.image || IMAGE_FALLBACK} 
                          className="max-w-full max-h-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" 
                          alt="" 
                        />
                      </div>
                      
                      {/* Image Scrolling / Gallery */}
                      {selectedProduct.images && selectedProduct.images.length > 0 && (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                          {[selectedProduct.image, ...selectedProduct.images].filter(Boolean).map((img, idx) => (
                            <div 
                              key={idx} 
                              className="w-24 h-24 shrink-0 bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-all snap-start"
                              onClick={() => {
                                const mainImg = document.querySelector('.lg\\:col-span-5 img') as HTMLImageElement;
                                if (mainImg) mainImg.src = img;
                              }}
                            >
                              <img src={img} className="max-w-full max-h-full object-contain" alt="" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedProduct.video_url && (
                      <div className="bg-slate-900 rounded-[2rem] p-6 flex items-center justify-between text-white group cursor-pointer hover:bg-emerald-600 transition-all">
                        <div className="flex items-center gap-4">
                          <PlayCircle className="text-emerald-400 group-hover:text-white" size={28} />
                          <div className="text-[10px] font-black uppercase tracking-widest">Watch Review</div>
                        </div>
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
                             )) : <p className="text-[10px] text-slate-400 italic">Registry docs unavailable</p>}
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
             </div>

             {/* Footer */}
             <div className="px-8 md:px-12 py-8 md:py-10 bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-white/5 sticky bottom-0 z-10">
                <div className="text-left scale-[2] origin-left ml-10">
                  <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 tracking-widest">{t('total')}</span>
                  <DualPrice 
                    priceExVat={currentTotal} 
                    className="text-emerald-400" 
                    secondaryClassName="text-emerald-400/60"
                  />
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
                    onClick={() => { 
                      addItem({ ...selectedProduct, price: currentTotal }); 
                      addNotification(t('item_added'), 'success'); 
                      setSelectedProduct(null); 
                    }} 
                    className="flex-1 sm:flex-none px-16 py-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 shadow-2xl transition-all"
                  >
                    <ShoppingBag size={24} /> {t('add_to_cart')}
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
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Book This Product</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reserved for 48 hours · Free · No payment required</p>
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
                placeholder="Your name (optional)"
                value={bookingName}
                onChange={e => setBookingName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all"
              />
              <input
                type="email"
                placeholder="your@email.com *"
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
                Cancel
              </button>
              <button onClick={handleBookingSubmit}
                className="flex-1 py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                <Heart size={14} fill="white" /> Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

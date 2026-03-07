import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Category } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useNotification } from './NotificationContext';
import { useLanguage } from './LanguageContext';
import { MOCK_PRODUCTS } from '../utils/constants';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating';

export interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  categories: (Category | 'All')[];
  selectedCategory: Category | 'All';
  setSelectedCategory: (category: Category | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  selectedManufacturers: string[];
  setSelectedManufacturers: (m: string[]) => void;
  selectedSubcategories: string[];
  setSelectedSubcategories: (s: string[]) => void;
  selectedPowerMarkers: string[];
  setSelectedPowerMarkers: (p: string[]) => void;
  
  // New specific filters
  filterBrand: string;
  setFilterBrand: (v: string) => void;
  filterModel: string;
  setFilterModel: (v: string) => void;
  filterBattType: string;
  setFilterBattType: (v: string) => void;
  filterCapKwh: string;
  setFilterCapKwh: (v: string) => void;
  filterChgPwrKw: string;
  setFilterChgPwrKw: (v: string) => void;
  filterHpType: string;
  setFilterHpType: (v: string) => void;
  filterPhases1: string;
  setFilterPhases1: (v: string) => void;
  filterRefrType: string;
  setFilterRefrType: (v: string) => void;
  filterHeatCapKw: string;
  setFilterHeatCapKw: (v: string) => void;
  filterInvType: string;
  setFilterInvType: (v: string) => void;
  filterPhases: string;
  setFilterPhases: (v: string) => void;
  filterNumMppts: string;
  setFilterNumMppts: (v: string) => void;
  filterSolarPanelType: string;
  setFilterSolarPanelType: (v: string) => void;
  filterRatedPwrWp: string;
  setFilterRatedPwrWp: (v: string) => void;

  showOnlyLeaders: boolean;
  setShowOnlyLeaders: (v: boolean) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  
  availableManufacturers: string[];
  availableModels: string[];
  availableSubcategories: string[];
  availablePowerMarkers: string[];
  
  // New available values for technical filters
  availableBattTypes: string[];
  availableCapKwh: string[];
  availableChgPwrKw: string[];
  availableHpTypes: string[];
  availablePhases1: string[];
  availableRefrTypes: string[];
  availableHeatCapKw: string[];
  availableInvTypes: string[];
  availablePhases: string[];
  availableNumMppts: string[];
  availableSolarPanelTypes: string[];
  availableRatedPwrWp: string[];

  maxPossiblePrice: number;
  
  filteredProducts: Product[];
  applyFilters: () => void;
  fetchProducts: () => Promise<void>;
  resetFilters: () => void;

  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

const safeJsonParse = (data: any, type: 'specs' | 'docs' | 'kit' = 'specs'): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'string') return [data];
  
  const trimmed = data.trim();
  if (!trimmed) return [];

  const isJsonLike = (trimmed.startsWith('[') && trimmed.endsWith(']')) || 
                     (trimmed.startsWith('{') && trimmed.endsWith('}'));

  if (isJsonLike) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {}
  }

  if (type === 'specs') return [{ label: 'Info', value: trimmed }];
  if (type === 'docs') {
    // If it's a URL string, convert to object
    if (trimmed.startsWith('http')) {
      return [{ title: 'Document', url: trimmed }];
    }
  }
  return [];
};

export const ProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const categoriesList: Category[] = ['Power Station', 'Invertere', 'Batterier', 'Solpaneler', 'Sæt', 'Varmepumper', 'Monteringssystemer'];
  const allCategoriesList = ['All', ...categoriesList];
  
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedPowerMarkers, setSelectedPowerMarkers] = useState<string[]>([]);
  const [showOnlyLeaders, setShowOnlyLeaders] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter states
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterBattType, setFilterBattType] = useState('');
  const [filterCapKwh, setFilterCapKwh] = useState('');
  const [filterChgPwrKw, setFilterChgPwrKw] = useState('');
  const [filterHpType, setFilterHpType] = useState('');
  const [filterPhases1, setFilterPhases1] = useState('');
  const [filterRefrType, setFilterRefrType] = useState('');
  const [filterHeatCapKw, setFilterHeatCapKw] = useState('');
  const [filterInvType, setFilterInvType] = useState('');
  const [filterPhases, setFilterPhases] = useState('');
  const [filterNumMppts, setFilterNumMppts] = useState('');
  const [filterSolarPanelType, setFilterSolarPanelType] = useState('');
  const [filterRatedPwrWp, setFilterRatedPwrWp] = useState('');

  const { language } = useLanguage();

  // Reset sub-filters when category changes to ensure sequential integrity
  useEffect(() => {
    setFilterBrand('');
    setFilterModel('');
    setFilterBattType('');
    setFilterCapKwh('');
    setFilterChgPwrKw('');
    setFilterHpType('');
    setFilterPhases1('');
    setFilterRefrType('');
    setFilterHeatCapKw('');
    setFilterInvType('');
    setFilterPhases('');
    setFilterNumMppts('');
    setFilterSolarPanelType('');
    setFilterRatedPwrWp('');
  }, [selectedCategory]);

  // Reset model and spec filters when brand changes
  useEffect(() => {
    setFilterModel('');
    setFilterBattType('');
    setFilterCapKwh('');
    setFilterChgPwrKw('');
    setFilterHpType('');
    setFilterPhases1('');
    setFilterRefrType('');
    setFilterHeatCapKw('');
    setFilterInvType('');
    setFilterPhases('');
    setFilterNumMppts('');
    setFilterSolarPanelType('');
    setFilterRatedPwrWp('');
  }, [filterBrand]);

  const fetchProducts = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      // Fallback to mock products so UI is never empty
      setDbProducts(MOCK_PRODUCTS as any);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch from all specialized tables in parallel with individual error handling
      const fetchTable = async (tableName: string) => {
        try {
          const { data, error } = await supabase.from(tableName).select('*');
          if (error) {
            console.warn(`[ProductsContext] Error fetching ${tableName}:`, error.message);
            return [];
          }
          return data || [];
        } catch (e: any) {
          console.warn(`[ProductsContext] Exception fetching ${tableName}:`, e.message);
          return [];
        }
      };

      const [
        bats,
        invs,
        panels,
        chargers,
        pumps,
        prods,
      ] = await Promise.all([
        fetchTable('batteries'),
        fetchTable('inverters'),
        fetchTable('solar_panels'),
        fetchTable('ev_chargers'),
        fetchTable('heat_pumps'),
        fetchTable('products'),   // ← re-enabled: main product table
      ]);

      // Debug: log counts from each table
      console.log('[Products] Loaded from Supabase:',{
        batteries: bats?.length ?? 0,
        inverters: invs?.length ?? 0,
        solar_panels: panels?.length ?? 0,
        ev_chargers: chargers?.length ?? 0,
        heat_pumps: pumps?.length ?? 0,
        products: prods?.length ?? 0,
      });

      const mapProduct = (p: any, category: Category): Product => {
        const name = p.name || (p.BrandProd && p.ModelName ? `${p.BrandProd} ${p.ModelName}` : p.ModelName || p.BrandProd || 'Unnamed Asset');
        return {
          ...p,
          id: `${category}-${p.id}`,
          name: typeof name === 'string' ? { da: name, en: name } : name,
          description: p.description || { da: '', en: '' },
          price: p.PriceEurExVat || p.price || 0,
          category: p.category || category,
          image: p.image || (p.images?.[0] || ''),
          images: p.images || (p.image ? [p.image] : []),
          stock: p.StockLvl ?? p.stock ?? 0,
          specs: safeJsonParse(p.specs, 'specs'),
          docs: safeJsonParse(p.docs, 'docs'),
          kitComponents: safeJsonParse(p.kit_components, 'kit'),
          is_active: p.is_active ?? true,   // default true if column missing
          is_leader: p.is_leader ?? false,
        };
      };

      const allUnified: Product[] = [
        ...(bats   || []).map(p => mapProduct(p, 'Batterier')),
        ...(invs   || []).map(p => mapProduct(p, 'Invertere')),
        ...(panels || []).map(p => mapProduct(p, 'Solpaneler')),
        ...(chargers || []).map(p => mapProduct(p, 'Power Station')),
        ...(pumps  || []).map(p => mapProduct(p, 'Varmepumper')),
        ...(prods  || []).map(p => mapProduct(p, (p.category as Category) || 'Power Station')),
      ];

      console.log('[Products] Total unified:', allUnified.length);

      setDbProducts(allUnified);
    } catch (err: any) {
      console.warn('[ProductsContext] Sync notice:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const getTableForCategory = (category: Category): string => {
    switch (category) {
      case 'Batterier': return 'batteries';
      case 'Invertere': return 'inverters';
      case 'Solpaneler': return 'solar_panels';
      case 'Power Station': return 'ev_chargers';
      case 'Varmepumper': return 'heat_pumps';
      default: return 'products';
    }
  };

  const filterPayload = (payload: any, category: Category) => {
    const commonFields = [
      'name', 'description', 'price', 'category', 'image', 'images', 
      'stock', 'is_active', 'is_leader', 'specs', 'docs', 'kit_components',
      'BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl',
      'sub_category', 'video_url', 'rating', 'reviews_count', 'features'
    ];
    
    const categoryFields: Record<string, string[]> = {
      'Batterier': ['BattType', 'BattChem', 'CapKwh', 'NomVoltV', 'CycleLife', 'MaxChgDchgCur_A', 'Scalab', 'OpTempC', 'BmsInt', 'BattCert', 'DimsMm', 'WgtKg'],
      'Power Station': ['ChgPwrKw', 'ConnType', 'AuthMeth', 'OcppVer', 'DynLoadMng', 'V2gSupp', 'ChgProtRcd', 'MidMet'],
      'Varmepumper': ['HpType', 'Phases1', 'RefrType', 'HeatCapKw', 'Scop35C', 'MaxFlowTempC', 'SndPwrDba'],
      'Invertere': ['InvType', 'Phases', 'MaxEffPerc', 'NumMppts', 'MpptVoltRangeV', 'MaxPvInVoltV', 'CommProt', 'IntProt', 'IpRating', 'inverter_type'],
      'Solpaneler': ['SolarPanelType', 'CellTech', 'RatedPwrWp', 'ModEffPerc', 'TempCoeffPmax', 'GlassType', 'ProdWarrYrs', 'PerfWarrYrs']
    };

    const allowed = [...commonFields, ...(categoryFields[category] || [])];
    const filtered: any = {};
    Object.keys(payload).forEach(key => {
      if (allowed.includes(key)) filtered[key] = payload[key];
    });
    return filtered;
  };

  const addProduct = useCallback(async (product: Partial<Product>) => {
    const table = getTableForCategory(product.category as Category);
    let dbPayload: any = { ...product };
    
    // Clean up payload for DB
    if (dbPayload.subcategory !== undefined) { dbPayload.sub_category = dbPayload.subcategory; delete dbPayload.subcategory; }
    if (dbPayload.kitComponents !== undefined) { dbPayload.kit_components = JSON.stringify(dbPayload.kitComponents); delete dbPayload.kitComponents; }
    if (dbPayload.specs !== undefined) { dbPayload.specs = JSON.stringify(dbPayload.specs); }
    if (dbPayload.docs !== undefined) { dbPayload.docs = JSON.stringify(dbPayload.docs); }
    
    dbPayload = filterPayload(dbPayload, product.category as Category);
    
    try {
      const { error } = await supabase.from(table).insert([dbPayload]);
      if (error) throw error;
      await fetchProducts();
    } catch (err: any) { throw err; }
  }, [fetchProducts]);

  const updateProduct = useCallback(async (product: Product) => {
    const table = getTableForCategory(product.category);
    let dbPayload: any = { ...product };
    // Strip the prefix from the ID (e.g., "Batterier-1" -> "1")
    const realId = product.id.includes('-') ? product.id.split('-').slice(1).join('-') : product.id;
    delete dbPayload.id;

    if (dbPayload.subcategory !== undefined) { dbPayload.sub_category = dbPayload.subcategory; delete dbPayload.subcategory; }
    if (dbPayload.kitComponents !== undefined) { dbPayload.kit_components = JSON.stringify(dbPayload.kitComponents); delete dbPayload.kitComponents; }
    if (dbPayload.specs !== undefined) { dbPayload.specs = JSON.stringify(dbPayload.specs); }
    if (dbPayload.docs !== undefined) { dbPayload.docs = JSON.stringify(dbPayload.docs); }
    
    dbPayload = filterPayload(dbPayload, product.category);
    
    try {
      const { error } = await supabase.from(table).update(dbPayload).eq('id', realId);
      if (error) throw error;
      await fetchProducts();
    } catch (err: any) { throw err; }
  }, [fetchProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    // Strip the prefix from the ID (e.g., "Batterier-1" -> "1")
    const realId = id.includes('-') ? id.split('-').slice(1).join('-') : id;
    const tables = ['batteries', 'inverters', 'solar_panels', 'ev_chargers', 'heat_pumps'];
    try {
      await Promise.all(tables.map(table => 
        supabase.from(table).delete().eq('id', realId)
      ));
      await fetchProducts();
    } catch (err: any) { throw err; }
  }, [fetchProducts]);

  const allProducts = useMemo(() => dbProducts, [dbProducts]);

  const categoryProducts = useMemo(() => {
    if (selectedCategory === 'All') return allProducts;
    return allProducts.filter(p => p.category === selectedCategory);
  }, [allProducts, selectedCategory]);

  const availableManufacturers = useMemo(() => 
    Array.from(new Set(categoryProducts.map(p => p.manufacturer || p.BrandProd).filter(Boolean) as string[])).sort(), [categoryProducts]);
  
  const availableModels = useMemo(() => {
    // Show models only if a brand is selected, and they must match the current category
    if (!filterBrand) return [];
    
    const pool = categoryProducts.filter(p => (p.BrandProd || p.manufacturer || "").toLowerCase().includes(filterBrand.toLowerCase()));
    return Array.from(new Set(pool.map(p => p.ModelName).filter(Boolean) as string[])).sort();
  }, [categoryProducts, filterBrand]);

  const availableSubcategories = useMemo(() => 
    Array.from(new Set(categoryProducts.map(p => p.subcategory).filter(Boolean) as string[])).sort(), [categoryProducts]);

  const brandFilteredProducts = useMemo(() => {
    if (!filterBrand) return categoryProducts;
    return categoryProducts.filter(p => (p.BrandProd || p.manufacturer || "").toLowerCase().includes(filterBrand.toLowerCase()));
  }, [categoryProducts, filterBrand]);

  const availableBattTypes = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Batterier').map(p => p.BattType).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);
  
  const availableCapKwh = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Batterier').map(p => String(p.CapKwh)).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableChgPwrKw = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Power Station').map(p => String(p.ChgPwrKw)).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableHpTypes = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Varmepumper').map(p => p.HpType).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availablePhases1 = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Varmepumper').map(p => p.Phases1).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableRefrTypes = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Varmepumper').map(p => p.RefrType).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableHeatCapKw = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Varmepumper').map(p => String(p.HeatCapKw)).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableInvTypes = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Invertere').map(p => p.InvType).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availablePhases = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Invertere').map(p => p.Phases).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableNumMppts = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Invertere').map(p => String(p.NumMppts)).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableSolarPanelTypes = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Solpaneler').map(p => p.SolarPanelType).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availableRatedPwrWp = useMemo(() => 
    Array.from(new Set(brandFilteredProducts.filter(p => p.category === 'Solpaneler').map(p => String(p.RatedPwrWp)).filter(Boolean) as string[])).sort(), [brandFilteredProducts]);

  const availablePowerMarkers = useMemo(() => {
    const powers = new Set<string>();
    categoryProducts.forEach(p => {
      const specs = Array.isArray(p.specs) ? p.specs : [];
      specs.forEach((s: any) => {
        const label = String(s?.label || '').toLowerCase();
        if (label.includes('power') || label.includes('effekt') || label.includes('kapacitet') || label.includes('kw')) {
          powers.add(s.value);
        }
      });
    });
    return Array.from(powers).sort();
  }, [categoryProducts]);

  const maxPossiblePrice = useMemo(() => 
    categoryProducts.length === 0 ? 10000 : Math.max(...categoryProducts.map(p => p.price || 0)), [categoryProducts]);

  const applyFilters = useCallback(() => {
    // No-op now as filters are immediate, but kept for interface compatibility
  }, []);

  const filteredProducts = useMemo(() => {
    let result = allProducts;

    // 1. Brand Filter Logic (Global if selected)
    // If a brand is selected, we show that brand's products. 
    // If a category is also selected, we show that brand's products WITHIN that category.
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(p => p.category === selectedCategory);
    }

    result = result.filter(p => {
      // Hide only explicitly deactivated products (null/undefined = visible)
      if (p.is_active === false) return false;

      const productName = (typeof p.name === 'string' ? p.name : (p.name as any)[language || 'da'] || "").toLowerCase();
      const pBrand = (p.BrandProd || p.manufacturer || "").toLowerCase();
      const pModel = (p.ModelName || "").toLowerCase();

      // Global Search Bar
      if (searchQuery && !productName.includes(searchQuery.toLowerCase()) && !pBrand.includes(searchQuery.toLowerCase())) return false;
      
      // Status & Price
      if (showOnlyLeaders && !p.is_leader) return false;
      if (p.price > priceRange[1]) return false;

      // Brand & Model Markers
      if (filterBrand && !pBrand.includes(filterBrand.toLowerCase())) return false;
      if (filterModel && !pModel.includes(filterModel.toLowerCase())) return false;

      // Category specific technical filters
      if (p.category === 'Batterier') {
        if (filterBattType && p.BattType !== filterBattType) return false;
        if (filterCapKwh && String(p.CapKwh) !== filterCapKwh) return false;
      } 
      
      if (p.category === 'Power Station') {
        if (filterChgPwrKw && String(p.ChgPwrKw) !== filterChgPwrKw) return false;
      } 
      
      if (p.category === 'Varmepumper') {
        if (filterHpType && p.HpType !== filterHpType) return false;
        if (filterPhases1 && p.Phases1 !== filterPhases1) return false;
        if (filterRefrType && p.RefrType !== filterRefrType) return false;
        if (filterHeatCapKw && String(p.HeatCapKw) !== filterHeatCapKw) return false;
      } 
      
      if (p.category === 'Invertere') {
        if (filterInvType && p.InvType !== filterInvType) return false;
        if (filterPhases && p.Phases !== filterPhases) return false;
        if (filterNumMppts && String(p.NumMppts) !== filterNumMppts) return false;
      } 
      
      if (p.category === 'Solpaneler') {
        if (filterSolarPanelType && p.SolarPanelType !== filterSolarPanelType) return false;
        if (filterRatedPwrWp && String(p.RatedPwrWp) !== filterRatedPwrWp) return false;
      }

      return true;
    });

    console.log('[Products] filteredProducts count:', result.length);
    if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return result;
  }, [allProducts, selectedCategory, searchQuery, priceRange, showOnlyLeaders, sortBy, language, filterBrand, filterModel, filterBattType, filterCapKwh, filterChgPwrKw, filterHpType, filterPhases1, filterRefrType, filterHeatCapKw, filterInvType, filterPhases, filterNumMppts, filterSolarPanelType, filterRatedPwrWp]);

  const resetFilters = useCallback(() => {
    setPriceRange([0, 100000]);
    setSelectedManufacturers([]);
    setSelectedSubcategories([]);
    setSelectedPowerMarkers([]);
    setShowOnlyLeaders(false);
    setSortBy('newest');
    setSearchQuery('');
    
    setFilterBrand('');
    setFilterModel('');
    setFilterBattType('');
    setFilterCapKwh('');
    setFilterChgPwrKw('');
    setFilterHpType('');
    setFilterPhases1('');
    setFilterRefrType('');
    setFilterHeatCapKw('');
    setFilterInvType('');
    setFilterPhases('');
    setFilterNumMppts('');
    setFilterSolarPanelType('');
    setFilterRatedPwrWp('');
  }, []);

  return (
    <ProductsContext.Provider value={{
      products: allProducts, isLoading, categories: allCategoriesList as (Category | 'All')[],
      selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, filteredProducts,
      priceRange, setPriceRange, selectedManufacturers, setSelectedManufacturers,
      selectedSubcategories, setSelectedSubcategories, selectedPowerMarkers, setSelectedPowerMarkers,
      showOnlyLeaders, setShowOnlyLeaders, sortBy, setSortBy,
      availableManufacturers, availableModels, availableSubcategories, availablePowerMarkers, maxPossiblePrice,
      
      availableBattTypes, availableCapKwh, availableChgPwrKw, availableHpTypes, availablePhases1, availableRefrTypes, availableHeatCapKw,
      availableInvTypes, availablePhases, availableNumMppts, availableSolarPanelTypes, availableRatedPwrWp,

      applyFilters, fetchProducts, resetFilters,
      addProduct, updateProduct, deleteProduct,
      
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
      filterRatedPwrWp, setFilterRatedPwrWp
    }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within a ProductsProvider');
  return context;
};
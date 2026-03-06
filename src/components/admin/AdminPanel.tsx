import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, Edit, Trash2, X, Save, Cpu, Crown, RefreshCcw, LogOut,
  Package, ExternalLink, Globe, TrendingUp, DollarSign,
  Users, Percent, ToggleLeft, ToggleRight, ImageIcon, 
  FileText, Video, ListPlus, Minus, Layers, Search, Factory, Activity,
  Settings, Database, Image as ImageIconLucide, ChevronRight,
  ShieldCheck, FileDown, PlusCircle, UserCheck, LayoutGrid, Filter as FilterIcon, 
  ChevronDown, MessageSquare, Mail, Calendar, Hash, Shield
} from 'lucide-react';
import { Marker } from '../MarkerComponent.tsx';
import { DualPrice } from '../PriceDisplay';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Product, Category, Order, ProductSpec, ProductDoc, KitComponent } from '../../types';
import { supabase } from '../../services/supabase';
import { DbStatus } from './DbStatus';

// Category → Supabase table mapping
const categoryToTable: Record<string, string> = {
  'Batterier': 'batteries',
  'Invertere': 'inverters',
  'Solpaneler': 'solar_panels',
  'Power Station': 'ev_chargers',
  'Varmepumper': 'heat_pumps',
  'Sæt': 'kits'
};

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';
const emptyLoc = () => ({ da: '', en: '', no: '', se: '' });

const ProductRow = React.memo(({ product, onEdit, onDelete, formatPrice, getLoc }: any) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="p-6 flex items-center gap-4 text-left">
      <img
        src={product.image || IMAGE_FALLBACK}
        className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm"
        loading="lazy"
        alt=""
      />
      <div>
        <div className="text-[11px] font-black uppercase flex items-center gap-2 text-slate-900">
          {product.ModelName || getLoc(product.name)}
          {product.is_leader && <Crown size={12} className="text-amber-500 fill-amber-500" />}
        </div>
        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 flex-wrap">
          ID: {String(product.id).slice(0, 8)} | {product.category}
          {product.BrandProd && ` | ${product.BrandProd}`}
        </div>
      </div>
    </td>
    <td className="p-6 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
        <Package size={12} className="text-slate-400" />
        <span className="text-[11px] font-black text-slate-700">{product.StockLvl || product.stock || 0}</span>
      </div>
    </td>
    <td className="p-6 text-center font-black text-xs text-slate-700">
      <DualPrice priceExVat={product.PriceEurExVat || product.price} align="center" />
    </td>
    <td className="p-6 text-center">
      <div className={`w-2 h-2 rounded-full mx-auto ${product.is_active !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
    </td>
    <td className="p-6 text-right space-x-2">
      <button onClick={() => onEdit(product)} className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
        <Edit size={14} />
      </button>
      <button onClick={() => onDelete(product.id, product.category)} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
        <Trash2 size={14} />
      </button>
    </td>
  </tr>
));

export const AdminPanel: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'kits' | 'products' | 'clients' | 'bookings'>('products');
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<'main' | 'media' | 'specs' | 'kit_builder'>('main');
  
  const { categories, products } = useProducts();
  const { addNotification } = useNotification();
  const { formatPrice, getLoc, t, rates, updateRates } = useLanguage();
  const { users, updateUserDiscount } = useUser();
  
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [localRates, setLocalRates] = useState(rates);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [editLang, setEditLang] = useState<Language>('en');

  // Modal Local States
  const [localImages, setLocalImages] = useState<string[]>(['']);
  const [localSpecs, setLocalSpecs] = useState<ProductSpec[]>([{ label: '', value: '' }]);
  const [localDocs, setLocalDocs] = useState<any[]>([{ title: '', url: '' }]);
  const [localKitComponents, setLocalKitComponents] = useState<KitComponent[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [compCategoryFilter, setCompCategoryFilter] = useState<Category | 'All'>('All');
  const [compBrandFilter, setCompBrandFilter] = useState('');
  const [compModelFilter, setCompModelFilter] = useState('');
  const [compBattTypeFilter, setCompBattTypeFilter] = useState('');
  const [compCapKwhFilter, setCompCapKwhFilter] = useState('');
  const [compInvTypeFilter, setCompInvTypeFilter] = useState('');
  const [compPhasesFilter, setCompPhasesFilter] = useState('');
  const [compNumMpptsFilter, setCompNumMpptsFilter] = useState('');
  const [compHpTypeFilter, setCompHpTypeFilter] = useState('');
  const [compPhases1Filter, setCompPhases1Filter] = useState('');
  const [compRefrTypeFilter, setCompRefrTypeFilter] = useState('');
  const [compHeatCapKwFilter, setCompHeatCapKwFilter] = useState('');
  const [compSolarPanelTypeFilter, setCompSolarPanelTypeFilter] = useState('');
  const [compRatedPwrWpFilter, setCompRatedPwrWpFilter] = useState('');
  const [compChgPwrKwFilter, setCompChgPwrKwFilter] = useState('');
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);

  const [adminCategoryFilter, setAdminCategoryFilter] = useState<Category | 'All'>('All');
  const [adminManufacturerFilter, setAdminManufacturerFilter] = useState('');

  const filteredAdminProducts = useMemo(() => {
    return allProducts.filter(p => {
      if (adminCategoryFilter !== 'All' && p.category !== adminCategoryFilter) return false;
      if (adminManufacturerFilter && !(p.BrandProd || p.manufacturer || "").toLowerCase().includes(adminManufacturerFilter.toLowerCase())) return false;
      return true;
    });
  }, [allProducts, adminCategoryFilter, adminManufacturerFilter]);

  const [formData, setFormData] = useState<any>({
    category: 'Invertere',
    BrandProd: '',
    ModelName: '',
    PriceEurExVat: 0,
    StockLvl: 0,
    is_active: true,
    is_leader: false
  });

  const fetchAllData = useCallback(async () => {
    try {
      const tables = ['batteries', 'inverters', 'solar_panels', 'ev_chargers', 'heat_pumps', 'kits'];
      const results = await Promise.all(tables.map(table => supabase.from(table).select('*')));
      
      const combined = results.flatMap((res, index) => {
        const categoriesList = ['Batterier', 'Invertere', 'Solpaneler', 'Power Station', 'Varmepumper', 'Sæt'];
        const category = categoriesList[index];
        return (res.data || []).map(item => ({
          ...item,
          category: category,
          id: `${category}-${item.id}`,
          realId: item.id,
          price: item.PriceEurExVat || item.price || item.total_price || 0,
          stock: item.StockLvl || item.stock || 0,
          name: item.name || { en: item.ModelName || '' },
          kitComponents: (item.components || item.kit_components || []).map((c: any) => ({
            ...c,
            id: c.component_id || c.id,
            name: typeof c.name === 'object' ? (c.name.en || c.name.da || '') : c.name
          }))
        }));
      });
      setAllProducts(combined);
    } catch (err) {
      addNotification("Error loading registry", "error");
    }
  }, [addNotification]);

  useEffect(() => {
    setIsMounted(true);
    fetchAllData();
  }, [fetchAllData]);

  const fetchOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      addNotification?.(err.message, 'error');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [addNotification]);

  useEffect(() => {
    if (isMounted && activeTab === 'orders') fetchOrders();
    if (isMounted && activeTab === 'bookings') fetchBookings();
  }, [activeTab, isMounted, fetchOrders]);

  const fetchBookings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAdminBookings(data || []);
    } catch (e: any) {
      console.warn('[Admin] bookings fetch:', e.message);
    }
  }, []);

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    setAdminBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const handleOpenModal = (product?: any, forcedCategory?: Category) => {
    setModalTab('main');
    setCompCategoryFilter('All');
    setCompBrandFilter('');
    setCompModelFilter('');
    setCompBattTypeFilter('');
    setCompCapKwhFilter('');
    setCompInvTypeFilter('');
    setCompPhasesFilter('');
    setCompNumMpptsFilter('');
    setCompHpTypeFilter('');
    setCompPhases1Filter('');
    setCompRefrTypeFilter('');
    setCompHeatCapKwFilter('');
    setCompSolarPanelTypeFilter('');
    setCompRatedPwrWpFilter('');
    setCompChgPwrKwFilter('');
    setCompSearch('');
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        name: typeof product.name === 'string' ? { da: product.name, en: product.name, no: product.name, se: product.name } : { ...emptyLoc(), ...(product.name || {}) },
        description: typeof product.description === 'string' ? { da: product.description, en: product.description, no: product.description, se: product.description } : { ...emptyLoc(), ...(product.description || {}) },
      });
      const parseJSON = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : fallback;
        } catch {
          return fallback;
        }
      };
      setLocalImages(product.images && product.images.length > 0 ? product.images : [product.image || '']);
      setLocalSpecs(parseJSON(product.specs, [{ label: '', value: '' }]));
      setLocalDocs(parseJSON(product.docs, [{ title: '', url: '' }]));
      setLocalKitComponents(Array.isArray(product.kitComponents) ? product.kitComponents : []);
    } else {
      setEditingProduct(null);
      setFormData({ 
        category: forcedCategory || 'Invertere', 
        is_active: true, 
        is_leader: false,
        StockLvl: 10,
        BrandProd: '',
        ModelName: '',
        PriceEurExVat: 0,
        name: emptyLoc(),
        description: emptyLoc(),
        power_kw: 0,
        phases: 3
      });
      setLocalImages(['']);
      setLocalSpecs([{ label: '', value: '' }]);
      setLocalDocs([{ title: '', url: '' }]);
      setLocalKitComponents([]);
      if (forcedCategory === 'Sæt') setModalTab('kit_builder');
    }
    setIsModalOpen(true);
  };

  const handleOpenRatesModal = () => {
    setLocalRates(rates);
    setIsRatesModalOpen(true);
  };

  const handleDelete = async (id: string | number, category: string) => {
    if (!window.confirm("Confirm deletion?")) return;
    const targetTable = categoryToTable[category] || 'products';
    const realId = typeof id === 'string' && id.includes('-') ? id.split('-')[1] : id;
    try {
      const { error } = await supabase.from(targetTable).delete().eq('id', realId);
      if (error) throw error;
      addNotification("Asset Removed", "success");
      fetchAllData();
    } catch (err: any) {
      addNotification(err.message, "error");
    }
  };

  const uploadFileToSupabase = async (file: File, folder: string): Promise<string | null> => {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('product-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error("FULL UPLOAD ERROR:", error); 
        addNotification(`Error uploading ${file.name}: ${error.message}`, 'error');
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from('product-assets').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("CATCH ERROR:", err);
      addNotification(`Error uploading ${file.name}: ${err.message}`, 'error');
      return null;
    }
  };

  const uploadFilesAndGetUrls = async (files: File[], folder: string): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadFileToSupabase(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls.filter(url => url !== null) as string[];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = formData.category;
    const targetTable = categoryToTable[category] || 'products';

    let finalImageUrls: string[] = [];
    if (selectedImageFiles.length > 0) {
      finalImageUrls = await uploadFilesAndGetUrls(selectedImageFiles, 'images');
    } else {
      finalImageUrls = localImages.filter(url => url && url.trim() !== '');
    }

    let finalDocObjects: ProductDoc[] = [];
    for (const doc of localDocs) {
      if (doc.file) {
        const url = await uploadFileToSupabase(doc.file, 'docs');
        if (url) {
          finalDocObjects.push({ title: doc.title || doc.file.name, url });
        }
      } else if (doc.url && doc.url.trim() !== '') {
        finalDocObjects.push({ title: doc.title || 'Document', url: doc.url });
      }
    }
    
    const tableFields: Record<string, string[]> = {
      'batteries': ['BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl', 'BattType', 'BattChem', 'CapKwh', 'NomVoltV', 'CycleLife', 'MaxChgDchgCur_A', 'Scalab', 'OpTempC', 'BmsInt', 'BattCert', 'DimsMm', 'WgtKg', 'name', 'description', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'inverters': ['BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl', 'InvType', 'Phases', 'MaxEffPerc', 'NumMppts', 'MpptVoltV', 'MaxPvInVoltV', 'CommProt', 'IntProt', 'IpRating', 'DimsMm', 'WgtKg', 'name', 'description', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'solar_panels': ['BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl', 'SolarPanelType', 'CellTech', 'RatedPwrWp', 'ModEffPerc', 'TempCoeffPmax', 'GlassType', 'ProdWarrYrs', 'PerfWarrYrs', 'DimsMm', 'WgtKg', 'name', 'description', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'ev_chargers': ['BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl', 'ChgPwrKw', 'ConnType', 'AuthMeth', 'OcppVer', 'DynLoadMng', 'V2gSupp', 'ChgProtRcd', 'MidMet', 'DimsMm', 'WgtKg', 'name', 'description', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'heat_pumps': ['BrandProd', 'ModelName', 'SkuShopId', 'PriceEurExVat', 'StockLvl', 'HpType', 'Phases1', 'RefrType', 'HeatCapKw', 'Scop35C', 'MaxFlowTempC', 'SndPwrDba', 'DimsMm', 'WgtKg', 'name', 'description', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'kits': ['name', 'power_kw', 'phases', 'description', 'components', 'total_price', 'image', 'images', 'docs', 'specs', 'is_active', 'is_leader'],
      'products': ['name', 'description', 'category', 'price', 'stock', 'image', 'images', 'specs', 'docs', 'is_active', 'is_leader']
    };

    const allowedFields = tableFields[targetTable] || [];
    const cleanPayload: any = {};

    allowedFields.forEach(field => {
      if (formData[field] !== undefined) cleanPayload[field] = formData[field];
    });

    cleanPayload.name = formData.name || { en: formData.ModelName || '' };
    cleanPayload.description = formData.description || emptyLoc();
    cleanPayload.image = finalImageUrls[0] || null;
    cleanPayload.images = finalImageUrls;
    cleanPayload.docs = finalDocObjects;
    cleanPayload.specs = localSpecs.filter(s => s.label && s.label.trim() !== '');

    if (targetTable === 'kits') {
      cleanPayload.components = localKitComponents.map(c => ({
        component_id: c.id,
        name: c.name,
        price: c.price,
        quantity: c.quantity
      }));
      cleanPayload.total_price = localKitComponents.reduce((s, c) => s + (c.price * c.quantity), 0);
    }

    try {
      if (editingProduct) {
        const rawId = editingProduct.realId || editingProduct.id;
        const finalId = typeof rawId === 'string' && rawId.includes('-') ? rawId.split('-')[1] : rawId;
        const { error } = await supabase.from(targetTable).update(cleanPayload).eq('id', finalId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(targetTable).insert([cleanPayload]);
        if (error) throw error;
      }
      addNotification("Registry Updated", "success");
      setIsModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      console.error("Supabase Save Error:", err);
      addNotification(err.message || "DB Sync Error", "error");
    }
  };

  const addComponentToKit = (p: any) => {
    const exists = localKitComponents.find(c => c.id === p.id);
    if (exists) return;
    setLocalKitComponents([...localKitComponents, { 
      id: p.id, 
      name: p.ModelName || getLoc(p.name), 
      price: p.PriceEurExVat || p.price, 
      quantity: 1 
    }]);
  };

  const removeComponentFromKit = (id: string) => {
    setLocalKitComponents(localKitComponents.filter(c => c.id !== id));
  };

  // Kit Builder Filtering Logic
  const compCategoryProducts = useMemo(() => {
    if (compCategoryFilter === 'All') return allProducts.filter(p => p.category !== 'Sæt');
    return allProducts.filter(p => p.category === compCategoryFilter);
  }, [allProducts, compCategoryFilter]);

  const compAvailableBrands = useMemo(() => 
    Array.from(new Set(compCategoryProducts.map(p => p.manufacturer || p.BrandProd).filter(Boolean) as string[])).sort(), [compCategoryProducts]);

  const compBrandFilteredProducts = useMemo(() => {
    if (!compBrandFilter) return compCategoryProducts;
    return compCategoryProducts.filter(p => (p.BrandProd || p.manufacturer || "").toLowerCase().includes(compBrandFilter.toLowerCase()));
  }, [compCategoryProducts, compBrandFilter]);

  const compAvailableModels = useMemo(() => {
    if (!compBrandFilter) return [];
    return Array.from(new Set(compBrandFilteredProducts.map(p => p.ModelName).filter(Boolean) as string[])).sort();
  }, [compBrandFilteredProducts, compBrandFilter]);

  const compAvailableBattTypes = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.BattType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableCapKwh = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.CapKwh).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableInvTypes = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.InvType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailablePhases = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.Phases).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableNumMppts = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.NumMppts).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableHpTypes = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.HpType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailablePhases1 = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.Phases1).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableRefrType = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.RefrType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableHeatCapKw = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.HeatCapKw).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableSolarPanelTypes = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.SolarPanelType).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableRatedPwrWp = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.RatedPwrWp).filter(Boolean) as string[])).sort(), [compCategoryProducts]);
  const compAvailableChgPwrKw = useMemo(() => Array.from(new Set(compCategoryProducts.map(p => p.ChgPwrKw).filter(Boolean) as string[])).sort(), [compCategoryProducts]);

  const filteredCompProducts = useMemo(() => {
    return compBrandFilteredProducts.filter(p => {
      if (p.id === editingProduct?.id) return false;
      if (compSearch && !(p.ModelName || getLoc(p.name)).toLowerCase().includes(compSearch.toLowerCase())) return false;
      if (compModelFilter && p.ModelName !== compModelFilter) return false;
      
      if (compCategoryFilter === 'Batterier') {
        if (compBattTypeFilter && p.BattType !== compBattTypeFilter) return false;
        if (compCapKwhFilter && String(p.CapKwh) !== String(compCapKwhFilter)) return false;
      }
      if (compCategoryFilter === 'Invertere') {
        if (compInvTypeFilter && p.InvType !== compInvTypeFilter) return false;
        if (compPhasesFilter && String(p.Phases) !== String(compPhasesFilter)) return false;
        if (compNumMpptsFilter && String(p.NumMppts) !== String(compNumMpptsFilter)) return false;
      }
      if (compCategoryFilter === 'Varmepumper') {
        if (compHpTypeFilter && p.HpType !== compHpTypeFilter) return false;
        if (compPhases1Filter && String(p.Phases1) !== String(compPhases1Filter)) return false;
        if (compRefrTypeFilter && p.RefrType !== compRefrTypeFilter) return false;
        if (compHeatCapKwFilter && String(p.HeatCapKw) !== String(compHeatCapKwFilter)) return false;
      }
      if (compCategoryFilter === 'Solpaneler') {
        if (compSolarPanelTypeFilter && p.SolarPanelType !== compSolarPanelTypeFilter) return false;
        if (compRatedPwrWpFilter && String(p.RatedPwrWp) !== String(compRatedPwrWpFilter)) return false;
      }
      if (compCategoryFilter === 'Power Station') {
        if (compChgPwrKwFilter && String(p.ChgPwrKw) !== String(compChgPwrKwFilter)) return false;
      }

      return true;
    });
  }, [compBrandFilteredProducts, editingProduct, compSearch, getLoc, compModelFilter, compCategoryFilter, compBattTypeFilter, compCapKwhFilter, compInvTypeFilter, compPhasesFilter, compNumMpptsFilter, compHpTypeFilter, compPhases1Filter, compRefrTypeFilter, compHeatCapKwFilter, compSolarPanelTypeFilter, compRatedPwrWpFilter, compChgPwrKwFilter]);

  if (!isMounted) return null;

  return (
    <div className="space-y-8 text-left min-h-screen pb-20 px-8 max-w-[1600px] mx-auto notranslate" translate="no">
      
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-white/5">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center shadow-lg">
            <Cpu size={32} className="text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              Terminal <span className="text-emerald-500">v5.0</span>
            </h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">
              Multi-Table Asset Management
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-white/5 p-2 rounded-[2rem]">
          {(['products', 'orders', 'bookings', 'kits', 'clients'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
          <div className="w-[1px] h-8 bg-white/10 mx-2 hidden sm:block"></div>
          <button onClick={handleOpenRatesModal} className="px-6 py-3 bg-white/10 text-amber-400 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-amber-500/30">
            <TrendingUp size={14} className="inline mr-2" /> Rates
          </button>
          <button onClick={() => handleOpenModal(undefined, 'Sæt')} className="px-6 py-3 bg-white/10 text-emerald-400 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-emerald-500/30">
            <Layers size={14} className="inline mr-2" /> New Kit
          </button>
          <button 
            onClick={() => handleOpenModal()} 
            className="btn-action !bg-emerald-500 !py-3 !px-6 !text-[9px] !rounded-2xl ml-2"
          >
            <Plus size={14} /> New Asset
          </button>
          <button 
            onClick={onLogout} 
            className="p-3 text-rose-400 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* DB Status — visible only inside admin panel */}
      <DbStatus />

      {/* Registry Display */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-fade-in">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> {activeTab} Registry
          </h3>
          
          {(activeTab === 'products' || activeTab === 'kits') && (
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter by brand..." 
                  value={adminManufacturerFilter}
                  onChange={(e) => setAdminManufacturerFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              
              {activeTab === 'products' && (
                <select 
                  value={adminCategoryFilter}
                  onChange={(e) => setAdminCategoryFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-[10px] font-black uppercase outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  {categories.filter(c => c !== 'Sæt').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              <button 
                onClick={fetchAllData} 
                className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2 hover:bg-emerald-50 p-2 rounded-lg transition-all"
              >
                <RefreshCcw size={14} /> Sync
              </button>
            </div>
          )}
          
          {activeTab === 'orders' && (
             <button 
              onClick={fetchAllData} 
              className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"
            >
              <RefreshCcw size={14} /> Sync All Tables
            </button>
          )}
        </div>

        {/* ── Bookings Tab ────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {adminBookings.length} bookings total
              </span>
              <button onClick={fetchBookings} className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2">
                <RefreshCcw size={13} /> Refresh
              </button>
            </div>
            {adminBookings.length === 0 ? (
              <p className="text-center py-12 text-slate-300 text-[10px] font-black uppercase">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {adminBookings.map((b: any) => {
                  const isActive = b.status === 'pending' || b.status === 'confirmed';
                  const expired  = new Date(b.expires_at) < new Date();
                  const statusColors: Record<string, string> = {
                    pending:   'bg-amber-50 text-amber-600 border-amber-200',
                    confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    expired:   'bg-slate-100 text-slate-400 border-slate-200',
                    cancelled: 'bg-rose-50 text-rose-400 border-rose-100',
                    converted: 'bg-blue-50 text-blue-500 border-blue-100',
                  };
                  const rowCls = isActive && !expired
                    ? 'flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border bg-white border-slate-100'
                    : 'flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border bg-slate-50 border-slate-50 opacity-70';
                  return (
                    <div key={b.id} className={rowCls}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img src={b.product_image || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=200'} alt=""
                          className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-100 p-1 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-900 uppercase truncate">{b.product_name}</p>
                          {/* Customer identifier — clickable mailto + name */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <a href={`mailto:${b.customer_email}`}
                              className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 underline underline-offset-2 transition-colors"
                              title="Send email to customer">
                              {b.customer_email}
                            </a>
                            {b.customer_name && (
                              <span className="text-[9px] text-slate-400 font-bold">· {b.customer_name}</span>
                            )}
                          </div>
                          {/* Client lookup in local registry */}
                          {allProducts && (
                            <button
                              onClick={() => {
                                const matchedUser = users.find((u: any) => u.email?.toLowerCase() === b.customer_email?.toLowerCase());
                                if (matchedUser) setInspectUser(matchedUser);
                                else addNotification('No profile found for this email', 'info');
                              }}
                              className="mt-1 text-[8px] font-black text-slate-300 hover:text-emerald-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                            >
                              <UserCheck size={10} /> View Client Profile
                            </button>
                          )}
                          <p className="text-[9px] text-slate-300 font-bold mt-1">
                            Booked: {new Date(b.created_at).toLocaleDateString('en-GB')} ·
                            Expires: {new Date(b.expires_at).toLocaleDateString('en-GB')}
                            {expired && isActive && <span className="text-rose-400 ml-1">· EXPIRED</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-black text-slate-700">€{b.product_price?.toLocaleString('da-DK')}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColors[b.status] || statusColors.pending}`}>
                          {b.status}
                        </span>
                        {isActive && (
                          <select
                            value={b.status}
                            onChange={e => updateBookingStatus(b.id, e.target.value)}
                            className="text-[9px] font-black bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancel</option>
                            <option value="expired">Expire</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab !== 'bookings' && <div className="overflow-x-auto">
          {activeTab === 'clients' ? (
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="p-6">Identity</th>
                   <th className="p-6">Status</th>
                   <th className="p-6 text-center">Yield Discount (%)</th>
                   <th className="p-6 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {users.map(u => (
                   <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                       <div className="flex items-center gap-4 text-left">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><UserCheck size={20} /></div>
                         <div>
                           <div className="text-[11px] font-black uppercase text-slate-900">{u.name}</div>
                           <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</div>
                         </div>
                       </div>
                     </td>
                     <td className="p-6"><span className="status-badge status-paid">Verified</span></td>
                     <td className="p-6 text-center">
                       <div className="flex items-center justify-center gap-2">
                         <input 
                           type="number" 
                           value={u.discount || 0} 
                           onChange={e => updateUserDiscount(u.id, Number(e.target.value))}
                           className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center text-xs font-black outline-none focus:border-emerald-500 transition-all"
                         />
                         <span className="text-[10px] font-black text-slate-400">%</span>
                       </div>
                     </td>
                     <td className="p-6 text-right">
                       <button 
                         onClick={() => setInspectUser(u)}
                         className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline"
                       >
                         Inspect Session
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-6">Asset Details</th>
                  <th className="p-6 text-center">Stock</th>
                  <th className="p-6 text-center">Base Price</th>
                  <th className="p-6 text-center">Status</th>
                  <th className="p-6 text-right">Commands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeTab === 'orders' && orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors text-left">
                    <td className="p-6">
                      <div className="font-black text-[11px] uppercase text-slate-900">{order.customer_name}</div>
                      {order.customer_message && (
                        <div className="mt-1 text-[9px] text-slate-400 font-medium normal-case flex items-start gap-1">
                          <MessageSquare size={10} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1 italic">"{order.customer_message}"</span>
                        </div>
                      )}
                    </td>
                    <td className="p-6 text-center font-black text-xs text-slate-700">-</td>
                    <td className="p-6 text-center font-black text-xs text-slate-700">{formatPrice(order.total_price)}</td>
                    <td className="p-6 text-center"><span className={`status-badge ${order.status === 'paid' ? 'status-paid' : 'status-pending'}`}>{order.status}</span></td>
                    <td className="p-6 text-right font-mono text-[8px] text-slate-300">{order.mollie_id}</td>
                  </tr>
                ))}
                {(activeTab === 'products' ? filteredAdminProducts : filteredAdminProducts.filter(p => p.category === 'Sæt')).map(p => (
                  <ProductRow 
                    key={p.id} 
                    product={p} 
                    onEdit={handleOpenModal} 
                    onDelete={handleDelete} 
                    formatPrice={formatPrice} 
                    getLoc={getLoc} 
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>}
      </div>

      {/* INSPECT USER MODAL */}
      {inspectUser && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col animate-modal-in overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2.5 rounded-2xl text-emerald-500 shadow-lg">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Client Session Profile</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Detailed account audit</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectUser(null)} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={10} className="text-emerald-500" /> Email Address
                  </div>
                  <div className="text-xs font-black text-slate-900 break-all">{inspectUser.email}</div>
                </div>
                <div className="space-y-1.5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash size={10} className="text-emerald-500" /> System ID
                  </div>
                  <div className="text-xs font-black text-slate-900">UID-{String(inspectUser.id).slice(0, 8).toUpperCase()}</div>
                </div>
              </div>

              <div className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <Shield size={16} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Verification Status</span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500 text-[8px] font-black uppercase rounded-full">Active</span>
                  </div>
                  
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <Percent size={16} className="text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Applied Yield Discount</span>
                    </div>
                    <span className="text-lg font-black text-amber-500">{inspectUser.discount || 0}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Last Activity Sync</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 italic">Recently Synchronized</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5">
                  <UserCheck size={120} />
                </div>
              </div>
            </div>

            <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setInspectUser(null)} 
                className="bg-slate-900 px-12 py-4 rounded-2xl text-[10px] font-black uppercase text-white shadow-xl hover:bg-slate-800 transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col max-h-[95vh] animate-modal-in overflow-hidden">
            
            {/* Header */}
            <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2 rounded-lg text-emerald-500">
                  <Settings size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  {formData.category === 'Sæt' ? 'Kit Assembly Panel' : 'Asset Configuration Panel'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              {formData.category === 'Sæt' ? (
                (['main', 'kit_builder'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    className={`flex-1 py-5 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${
                      modalTab === tab 
                        ? 'border-b-4 border-emerald-500 text-emerald-600' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'main' ? 'Kit Identity' : 'Component Assembly'}
                  </button>
                ))
              ) : (
                (['main', 'media', 'specs'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    className={`flex-1 py-5 text-center font-black text-[10px] uppercase tracking-widest transition-colors ${
                      modalTab === tab 
                        ? 'border-b-4 border-emerald-500 text-emerald-600' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'main' ? 'Main Info' : 
                     tab === 'media' ? 'Media' : 
                     'Specifications'}
                  </button>
                ))
              )}
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-10 text-left">
              <div className="space-y-10 animate-fade-in">
                {/* TAB 1: MAIN INFO */}
                {modalTab === 'main' && (
                  <div className="space-y-10 animate-fade-in">
                    {/* Asset Class & Brand */}
                    {formData.category !== 'Sæt' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Asset Class (Target Table)</label>
                          <select
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                            className="input-premium appearance-none bg-white"
                            disabled={!!editingProduct}
                          >
                            {Object.keys(categoryToTable).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Brand (BrandProd)</label>
                          <input
                            value={formData.BrandProd || ''}
                            onChange={e => setFormData({...formData, BrandProd: e.target.value})}
                            className="input-premium bg-white"
                            placeholder="e.g. Huawei, Victron, Daikin..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Localization & Main Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        {/* Localization Matrix */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Localization Matrix</h4>
                          <div className="flex gap-1.5">
                            {(['da', 'en', 'no', 'se'] as Language[]).map(l => (
                              <button 
                                key={l} 
                                type="button" 
                                onClick={() => setEditLang(l)} 
                                className={`w-9 h-9 rounded-xl text-[9px] font-black uppercase transition-all ${
                                  editLang === l ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Display Name / Model Name ({editLang})</label>
                            <input 
                              required 
                              value={formData.category === 'Sæt' ? (formData.name?.[editLang] || '') : (formData.ModelName || '')} 
                              onChange={e => {
                                if (formData.category === 'Sæt') {
                                  setFormData({...formData, name: {...formData.name, [editLang]: e.target.value}});
                                } else {
                                  setFormData({...formData, ModelName: e.target.value});
                                }
                              }} 
                              className="input-premium" 
                              placeholder={formData.category === 'Sæt' ? "e.g. Premium Solar Kit" : "e.g. SUN2000-10KTL-M1"} 
                            />
                          </div>
                          {formData.category === 'Sæt' ? (
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Power (kW)</label>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={formData.power_kw || 0} 
                                  onChange={e => setFormData({...formData, power_kw: Number(e.target.value)})} 
                                  className="input-premium" 
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Phases</label>
                                <select 
                                  value={formData.phases || 3} 
                                  onChange={e => setFormData({...formData, phases: Number(e.target.value)})} 
                                  className="input-premium"
                                >
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
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={e => setSelectedImageFiles(e.target.files ? [e.target.files[0]] : [])}
                                  className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {selectedImageFiles[0] && (
                                  <img src={URL.createObjectURL(selectedImageFiles[0])} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-xl" />
                                )}
                                {formData.image && !selectedImageFiles[0] && (
                                  <img src={formData.image} alt="Current" className="mt-2 w-24 h-24 object-cover rounded-xl" />
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Gallery Images</label>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  multiple 
                                  onChange={e => setSelectedImageFiles(Array.from(e.target.files || []))}
                                  className="input-premium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedImageFiles.map((file, index) => (
                                    <img key={index} src={URL.createObjectURL(file)} alt="Preview" className="w-16 h-16 object-cover rounded-xl" />
                                  ))}
                                  {formData.images && !selectedImageFiles.length && formData.images.map((img: string, index: number) => (
                                    <img key={index} src={img} alt="Current" className="w-16 h-16 object-cover rounded-xl" />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Price Ex. VAT (EUR)</label>
                                <input 
                                  type="number" 
                                  step="0.01" 
                                  value={formData.PriceEurExVat || 0} 
                                  onChange={e => setFormData({...formData, PriceEurExVat: Number(e.target.value)})} 
                                  className="input-premium" 
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Stock Level</label>
                                <input 
                                  type="number" 
                                  value={formData.StockLvl || 0} 
                                  onChange={e => setFormData({...formData, StockLvl: Number(e.target.value)})} 
                                  className="input-premium" 
                                />
                              </div>
                            </div>
                          </>)
                        }
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-900 uppercase ml-2">Short Description ({editLang})</label>
                          <textarea 
                            value={formData.description?.[editLang] || ''} 
                            onChange={e => setFormData({...formData, description: {...formData.description, [editLang]: e.target.value}})} 
                            className="input-premium min-h-[150px] py-4" 
                            placeholder="Brief technical summary..."
                          />
                        </div>
                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex-1 space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-900">Visibility Status</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase">Show in public catalog</div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, is_active: !formData.is_active})} 
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <div className="flex-1 space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-900">Sales Leader</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase">Mark as best seller</div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, is_leader: !formData.is_leader})} 
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.is_leader ? 'bg-amber-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${formData.is_leader ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MEDIA */}
                {modalTab === 'media' && (
                  <div className="space-y-10 animate-fade-in">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Image Gallery (URLs)</h4>
                      <div className="space-y-4">
                        {localImages.map((url, idx) => (
                          <div key={idx} className="flex gap-4 group">
                            <div className="flex-1 relative">
                              <ImageIcon size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                              <input 
                                value={url} 
                                onChange={e => {
                                  const n = [...localImages];
                                  n[idx] = e.target.value;
                                  setLocalImages(n);
                                }} 
                                className="input-premium pl-12 bg-white" 
                                placeholder="https://..." 
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setLocalImages(localImages.filter((_, i) => i !== idx))} 
                              className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setLocalImages([...localImages, ''])} 
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all"
                        >
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
                                <input 
                                  value={doc.title} 
                                  onChange={e => {
                                    const n = [...localDocs];
                                    n[idx].title = e.target.value;
                                    setLocalDocs(n);
                                  }} 
                                  className="w-full input-premium pl-12 bg-white" 
                                  placeholder="Document Title (e.g. Datasheet)" 
                                />
                              </div>
                              <div className="relative flex items-center">
                                {doc.url ? (
                                  <div className="flex items-center w-full relative">
                                    <ExternalLink size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                      value={doc.url} 
                                      onChange={e => {
                                        const n = [...localDocs];
                                        n[idx].url = e.target.value;
                                        setLocalDocs(n);
                                      }} 
                                      className="w-full input-premium pl-12 bg-white" 
                                      placeholder="https://...pdf" 
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center w-full">
                                    {doc.file ? (
                                      <div className="w-full input-premium bg-white flex items-center justify-between">
                                        <span className="text-xs text-slate-600 truncate">{doc.file.name}</span>
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            const n = [...localDocs];
                                            n[idx].file = undefined;
                                            setLocalDocs(n);
                                          }}
                                          className="text-rose-500 hover:text-rose-600"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <input 
                                        type="file" 
                                        accept="application/pdf" 
                                        onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const n = [...localDocs];
                                            n[idx].file = file;
                                            if (!n[idx].title) n[idx].title = file.name.replace('.pdf', '');
                                            setLocalDocs(n);
                                          }
                                        }}
                                        className="input-premium w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setLocalDocs(localDocs.filter((_, i) => i !== idx))} 
                              className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setLocalDocs([...localDocs, { title: '', url: '' }])} 
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all"
                        >
                          + Add Document Slot
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: SPECS */}
                {modalTab === 'specs' && (
                  <div className="space-y-10 animate-fade-in">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                        <Database size={14} /> Technical Schema: {formData.category}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.category === 'Batterier' && (
                          <>
                            <input value={formData.BattType || ''} onChange={e => setFormData({...formData, BattType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="BattType (e.g. LFP)" />
                            <input value={formData.BattChem || ''} onChange={e => setFormData({...formData, BattChem: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="BattChem" />
                            <input type="number" value={formData.CapKwh || ''} onChange={e => setFormData({...formData, CapKwh: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="CapKwh" />
                            <input type="number" value={formData.NomVoltV || ''} onChange={e => setFormData({...formData, NomVoltV: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="NomVoltV" />
                          </>
                        )}
                        {formData.category === 'Invertere' && (
                          <>
                            <input value={formData.InvType || ''} onChange={e => setFormData({...formData, InvType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="InvType (Hybrid/On-Grid)" />
                            <input value={formData.Phases || ''} onChange={e => setFormData({...formData, Phases: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="Phases (1/3)" />
                            <input type="number" value={formData.MaxEffPerc || ''} onChange={e => setFormData({...formData, MaxEffPerc: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="MaxEffPerc" />
                            <input type="number" value={formData.NumMppts || ''} onChange={e => setFormData({...formData, NumMppts: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="NumMppts" />
                          </>
                        )}
                        {formData.category === 'Solpaneler' && (
                          <>
                            <input value={formData.SolarPanelType || ''} onChange={e => setFormData({...formData, SolarPanelType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="SolarPanelType" />
                            <input type="number" value={formData.RatedPwrWp || ''} onChange={e => setFormData({...formData, RatedPwrWp: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="RatedPwrWp" />
                            <input type="number" value={formData.ModEffPerc || ''} onChange={e => setFormData({...formData, ModEffPerc: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="ModEffPerc" />
                          </>
                        )}
                        {formData.category === 'Power Station' && (
                          <>
                            <input type="number" value={formData.ChgPwrKw || ''} onChange={e => setFormData({...formData, ChgPwrKw: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="ChgPwrKw" />
                            <input value={formData.ConnType || ''} onChange={e => setFormData({...formData, ConnType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="ConnType" />
                          </>
                        )}
                        {formData.category === 'Varmepumper' && (
                          <>
                            <input value={formData.HpType || ''} onChange={e => setFormData({...formData, HpType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="HpType" />
                            <input value={formData.RefrType || ''} onChange={e => setFormData({...formData, RefrType: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="RefrType" />
                            <input type="number" value={formData.HeatCapKw || ''} onChange={e => setFormData({...formData, HeatCapKw: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="HeatCapKw" />
                          </>
                        )}
                        <input value={formData.DimsMm || ''} onChange={e => setFormData({...formData, DimsMm: e.target.value})} className="input-premium bg-white !py-3 !text-xs" placeholder="DimsMm (x*y*z)" />
                        <input type="number" value={formData.WgtKg || ''} onChange={e => setFormData({...formData, WgtKg: Number(e.target.value)})} className="input-premium bg-white !py-3 !text-xs" placeholder="WgtKg" />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Custom Specifications</h4>
                      <div className="space-y-4">
                        {localSpecs.map((s, idx) => (
                          <div key={idx} className="flex gap-4">
                            <input 
                              value={s.label} 
                              onChange={e => {
                                const n = [...localSpecs];
                                n[idx].label = e.target.value;
                                setLocalSpecs(n);
                              }} 
                              className="flex-1 input-premium bg-white !text-xs" 
                              placeholder="Label (e.g. Warranty)" 
                            />
                            <input 
                              value={s.value} 
                              onChange={e => {
                                const n = [...localSpecs];
                                n[idx].value = e.target.value;
                                setLocalSpecs(n);
                              }} 
                              className="flex-1 input-premium bg-white !text-xs" 
                              placeholder="Value (e.g. 10 Years)" 
                            />
                            <button 
                              type="button" 
                              onClick={() => setLocalSpecs(localSpecs.filter((_, i) => i !== idx))} 
                              className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setLocalSpecs([...localSpecs, { label: '', value: '' }])} 
                          className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all"
                        >
                          + Add Specification
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: KIT BUILDER */}
                {modalTab === 'kit_builder' && (
                  <div className="space-y-12 animate-fade-in">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                           <FilterIcon size={18} className="text-emerald-500" /> Catalog Filter
                         </h4>
                      </div>
                      
                      <div className="flex flex-col gap-8 bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">1. Select Category</label>
                          <div className="flex gap-3 overflow-x-auto pb-4 flex-nowrap custom-scrollbar min-h-[60px]">
                            <Marker label="All" active={compCategoryFilter === 'All'} onClick={() => {
                              setCompCategoryFilter('All');
                              setCompBrandFilter('');
                              setCompModelFilter('');
                            }} />
                            {categories.filter(c => c !== 'Sæt' && c !== 'All').map(c => (
                              <Marker key={c} label={t(`cat_${c}`)} active={compCategoryFilter === c} onClick={() => {
                                setCompCategoryFilter(c);
                                setCompBrandFilter('');
                                setCompModelFilter('');
                              }} />
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-200/50">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">2. Filter by Brand</label>
                            <select 
                              value={compBrandFilter} 
                              onChange={e => {
                                setCompBrandFilter(e.target.value);
                                setCompModelFilter('');
                              }}
                              className="input-premium !py-4 !text-xs bg-white shadow-sm"
                            >
                              <option value="">All Brands</option>
                              {compAvailableBrands.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">3. Select Model</label>
                            <div className="flex gap-3">
                              <select 
                                value={compModelFilter} 
                                onChange={e => setCompModelFilter(e.target.value)}
                                className="input-premium !py-4 !text-xs bg-white flex-1 shadow-sm"
                                disabled={!compBrandFilter}
                              >
                                <option value="">All Models</option>
                                {compAvailableModels.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                              <button 
                                type="button"
                                onClick={() => {
                                  setCompCategoryFilter('All');
                                  setCompBrandFilter('');
                                  setCompModelFilter('');
                                  setCompSearch('');
                                  setCompBattTypeFilter('');
                                  setCompCapKwhFilter('');
                                  setCompInvTypeFilter('');
                                  setCompPhasesFilter('');
                                  setCompNumMpptsFilter('');
                                  setCompHpTypeFilter('');
                                  setCompPhases1Filter('');
                                  setCompRefrTypeFilter('');
                                  setCompHeatCapKwFilter('');
                                  setCompSolarPanelTypeFilter('');
                                  setCompRatedPwrWpFilter('');
                                  setCompChgPwrKwFilter('');
                                }}
                                className="p-4 bg-white text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm border border-slate-100"
                                title="Reset Filters"
                              >
                                <RefreshCcw size={18} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {(compCategoryFilter !== 'All') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-200/50">
                            {compCategoryFilter === 'Batterier' && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Battery Type</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableBattTypes.map(t => (
                                      <Marker key={t} label={t} active={compBattTypeFilter === t} onClick={() => setCompBattTypeFilter(compBattTypeFilter === t ? '' : t)} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Capacity (kWh)</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableCapKwh.map(c => (
                                      <Marker key={c} label={String(c)} active={compCapKwhFilter === String(c)} onClick={() => setCompCapKwhFilter(compCapKwhFilter === String(c) ? '' : String(c))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {compCategoryFilter === 'Invertere' && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Inverter Type</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableInvTypes.map(t => (
                                      <Marker key={t} label={t} active={compInvTypeFilter === t} onClick={() => setCompInvTypeFilter(compInvTypeFilter === t ? '' : t)} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Phases</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailablePhases.map(p => (
                                      <Marker key={p} label={String(p)} active={compPhasesFilter === String(p)} onClick={() => setCompPhasesFilter(compPhasesFilter === String(p) ? '' : String(p))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">MPPTs</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableNumMppts.map(n => (
                                      <Marker key={n} label={String(n)} active={compNumMpptsFilter === String(n)} onClick={() => setCompNumMpptsFilter(compNumMpptsFilter === String(n) ? '' : String(n))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {compCategoryFilter === 'Varmepumper' && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">HP Type</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableHpTypes.map(t => (
                                      <Marker key={t} label={t} active={compHpTypeFilter === t} onClick={() => setCompHpTypeFilter(compHpTypeFilter === t ? '' : t)} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Phases</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailablePhases1.map(p => (
                                      <Marker key={p} label={String(p)} active={compPhases1Filter === String(p)} onClick={() => setCompPhases1Filter(compPhases1Filter === String(p) ? '' : String(p))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Refrigerant</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableRefrType.map(r => (
                                      <Marker key={r} label={r} active={compRefrTypeFilter === r} onClick={() => setCompRefrTypeFilter(compRefrTypeFilter === r ? '' : r)} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Heat Cap (kW)</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableHeatCapKw.map(h => (
                                      <Marker key={h} label={String(h)} active={compHeatCapKwFilter === String(h)} onClick={() => setHeatCapKwFilter(compHeatCapKwFilter === String(h) ? '' : String(h))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {compCategoryFilter === 'Solpaneler' && (
                              <>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Panel Type</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableSolarPanelTypes.map(t => (
                                      <Marker key={t} label={t} active={compSolarPanelTypeFilter === t} onClick={() => setCompSolarPanelTypeFilter(compSolarPanelTypeFilter === t ? '' : t)} color="slate" />
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Power (Wp)</label>
                                  <div className="flex flex-wrap gap-2">
                                    {compAvailableRatedPwrWp.map(p => (
                                      <Marker key={p} label={String(p)} active={compRatedPwrWpFilter === String(p)} onClick={() => setCompRatedPwrWpFilter(compRatedPwrWpFilter === String(p) ? '' : String(p))} color="slate" />
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}

                            {compCategoryFilter === 'Power Station' && (
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Chg Power (kW)</label>
                                <div className="flex flex-wrap gap-2">
                                  {compAvailableChgPwrKw.map(p => (
                                    <Marker key={p} label={String(p)} active={compChgPwrKwFilter === String(p)} onClick={() => setCompChgPwrKwFilter(compChgPwrKwFilter === String(p) ? '' : String(p))} color="slate" />
                                  ))}
                                </div>
                              </div>
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
                                <img src={p.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase text-slate-900 leading-tight truncate">{p.ModelName || getLoc(p.name)}</div>
                                <DualPrice priceExVat={p.PriceEurExVat || p.price} showLabels={false} />
                              </div>
                            </div>
                            <button type="button" onClick={() => addComponentToKit(p)} className="p-2.5 bg-slate-50 rounded-xl text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm shrink-0"><Plus size={16}/></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-3">
                           <Layers size={18} className="text-emerald-500" /> Assembly Workspace
                         </h4>
                      </div>
                      
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
                                    <button type="button" onClick={() => {
                                      const n = [...localKitComponents];
                                      const target = n.find(x => x.id === c.id);
                                      if (target) target.quantity = Math.max(1, target.quantity - 1);
                                      setLocalKitComponents(n);
                                    }} className="p-1 text-slate-400 hover:text-white"><Minus size={14}/></button>
                                    <span className="text-[12px] font-black w-6 text-center">{c.quantity}</span>
                                    <button type="button" onClick={() => {
                                      const n = [...localKitComponents];
                                      const target = n.find(x => x.id === c.id);
                                      if (target) target.quantity += 1;
                                      setLocalKitComponents(n);
                                    }} className="p-1 text-slate-400 hover:text-white"><Plus size={14}/></button>
                                  </div>
                                  <button type="button" onClick={() => removeComponentFromKit(c.id)} className="p-2.5 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 flex justify-between items-center shadow-lg">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block">Total Assembly Yield:</span>
                         </div>
                         <DualPrice 
                           priceExVat={localKitComponents.reduce((s,c) => s + (c.price * c.quantity), 0)} 
                           className="text-emerald-600" 
                           secondaryClassName="text-emerald-600/60"
                           align="right"
                         />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[3rem] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={16} className="text-emerald-500" /> Connected Table: {categoryToTable[formData.category]}
              </div>
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-10 py-5 font-black uppercase text-[10px] text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Cancel Access
                </button>
                <button 
                  onClick={handleSubmit} 
                  type="button" 
                  className="btn-action !bg-slate-900 shadow-2xl px-16 !rounded-2xl group ring-4 ring-slate-900/10"
                >
                  <Save size={20} className="text-emerald-500 group-hover:scale-125 transition-transform duration-500" /> Commit to Registry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RATES MODAL */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col max-h-[90vh] animate-modal-in overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
                  <TrendingUp size={18} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  Currency Exchange Rates
                </h3>
              </div>
              <button onClick={() => setIsRatesModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                <X size={24} />
              </button>
            </div>
            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                Update the base conversion rates for the platform. These values affect all public pricing displays.
              </p>
              <div className="grid grid-cols-1 gap-6">
                {Object.entries(localRates)
                  .filter(([key]) => key !== 'timestamp')
                  .map(([currency, rate]) => (
                  <div key={currency} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-900 uppercase ml-2">{currency} (Base: EUR)</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-[10px]">{currency}</div>
                      <input 
                        type="number" 
                        step="0.0001"
                        value={rate as number} 
                        onChange={e => setLocalRates({...localRates, [currency]: Number(e.target.value)})}
                        className="input-premium pl-16"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
              <button onClick={() => setIsRatesModalOpen(false)} className="px-8 py-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    await updateRates(localRates);
                    addNotification("Rates Updated", "success");
                    setIsRatesModalOpen(false);
                  } catch (err: any) {
                    addNotification(err.message, "error");
                  }
                }}
                className="btn-action !bg-amber-500 shadow-xl px-12 !rounded-2xl"
              >
                <Save size={18} className="mr-2" /> Update Rates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
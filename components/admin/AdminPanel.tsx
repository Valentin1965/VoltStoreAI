import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Save, Cpu, Crown, Coins, 
  RefreshCw, Settings, Activity, Zap, Layers, ImageIcon,
  FileText, Languages, Type, List, File, ArrowRight,
  PlusCircle, MinusCircle, ShoppingBag, Calculator, RefreshCcw, LogOut,
  CreditCard, Package, TrendingUp, Search, ExternalLink
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product, Category, KitComponent, Order } from '../../types';
import { supabase } from '../../services/supabase';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

interface AdminPanelProps {
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products' | 'orders' | 'currency'>('orders');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const { rates, updateRates, language, formatPrice } = useLanguage();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // States для Kit Builder
  const [selectedBuilderCat, setSelectedBuilderCat] = useState<Category | ''>('');
  const [selectedBuilderProdId, setSelectedBuilderProdId] = useState<string>('');
  const [builderQty, setBuilderQty] = useState<number>(1);

  const [currencyForm, setCurrencyForm] = useState({ ...rates });

  // Завантаження замовлень з Supabase
  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      addNotification(err.message, 'error');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const stats = useMemo(() => {
    const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total_price, 0);
    const activeProducts = products.filter(p => p.is_active).length;
    return { totalRevenue, activeProducts, pendingOrders: orders.filter(o => o.status === 'pending').length };
  }, [orders, products]);

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  const dbProductsList = useMemo(() => products.filter(p => p.category !== 'Kits'), [products]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: { en: '', uk: '' },
    description: { en: '', uk: '' },
    price: 0,
    category: 'Inverters',
    is_active: true,
    kitComponents: []
  });

  const getDisplayValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val?.[language] || val?.en || Object.values(val)[0] || '';
  };

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        name: typeof product.name === 'string' ? { en: product.name, uk: product.name } : product.name,
        specs: typeof product.specs === 'string' ? product.specs : JSON.stringify(product.specs || []),
        docs: typeof product.docs === 'string' ? product.docs : JSON.stringify(product.docs || [])
      });
    } else {
      setEditingProduct(null);
      setFormData({
        id: defaultCategory === 'Kits' ? 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase() : '',
        name: { en: '', uk: '' },
        price: 0,
        category: defaultCategory,
        is_active: true,
        kitComponents: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      specs: typeof formData.specs === 'string' ? JSON.parse(formData.specs || '[]') : formData.specs,
      docs: typeof formData.docs === 'string' ? JSON.parse(formData.docs || '[]') : formData.docs
    };

    if (editingProduct) {
      updateProduct(dataToSave as Product);
      addNotification("Solution updated", "success");
    } else {
      addProduct(dataToSave as Omit<Product, 'id'>);
      addNotification("New solution deployed", "success");
    }
    setIsModalOpen(false);
  };

  const renderOrdersTable = () => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-fade-in">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Transaction Registry</h3>
        <button onClick={fetchOrders} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
          <RefreshCcw size={16} className={isLoadingOrders ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <th className="p-6">Client / Order ID</th>
              <th className="p-6">Destination</th>
              <th className="p-6 text-center">Amount</th>
              <th className="p-6 text-center">Payment Status</th>
              <th className="p-6 text-right">Mollie ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-6">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-900 uppercase">{order.customer_name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{order.id.slice(0, 8)}</span>
                  </div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                    <MapPin size={12} className="text-slate-300" />
                    {order.city}
                  </div>
                </td>
                <td className="p-6 text-center font-black text-slate-900 text-xs">
                  {formatPrice(order.total_price)}
                </td>
                <td className="p-6 text-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${
                    order.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                    order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {order.status}
                  </div>
                </td>
                <td className="p-6 text-right">
                  {order.mollie_id ? (
                    <a href={`https://www.mollie.com/dashboard/payments/${order.mollie_id}`} target="_blank" className="text-[9px] font-black text-blue-500 hover:text-blue-700 flex items-center justify-end gap-1">
                      {order.mollie_id.slice(0, 10)}... <ExternalLink size={10} />
                    </a>
                  ) : <span className="text-[8px] text-slate-300 uppercase">Manual / Invoice</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20" translate="no">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              Terminal <span className="text-emerald-500">v4.2</span>
            </h1>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.3em]">Operational Control & Finance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-[2rem] border border-white/10">
          {(['orders', 'kits', 'products', 'currency'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
          <button onClick={onLogout} className="p-3 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all"><LogOut size={18} /></button>
        </div>
      </div>

      {/* DASHBOARD ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><TrendingUp size={24}/></div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Revenue</div>
            <div className="text-xl font-black text-slate-900 tracking-tighter">{formatPrice(stats.totalRevenue)}</div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><Package size={24}/></div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Active Assets</div>
            <div className="text-xl font-black text-slate-900 tracking-tighter">{stats.activeProducts} Units</div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><Activity size={24}/></div>
          <div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Pending Sync</div>
            <div className="text-xl font-black text-slate-900 tracking-tighter">{stats.pendingOrders} Orders</div>
          </div>
        </div>
      </div>

      {/* CONTENT REGION */}
      {activeTab === 'orders' ? renderOrdersTable() : (
        activeTab === 'currency' ? (
          /* Код валют залишається таким самим, як у вас */
          <div className="max-w-md mx-auto bg-white p-12 rounded-[4rem] border border-slate-100 shadow-3xl">...</div>
        ) : (
          <>
            <div className="flex justify-end mb-6">
              <button onClick={() => handleOpenModal(undefined, activeTab === 'kits' ? 'Kits' : 'Inverters')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl">
                <Plus size={16} /> Register {activeTab === 'kits' ? 'Solution' : 'Asset'}
              </button>
            </div>
            {/* Ваша функція renderTable(list) для товарів */}
          </>
        )
      )}

      {/* MODAL WINDOW (Asset Editor) */}
      {/* ... Код модального вікна залишається аналогічним вашому, з вашим Kit Builder ... */}
    </div>
  );
};

const MapPin = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
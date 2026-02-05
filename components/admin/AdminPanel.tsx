import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Save, Cpu, Crown, Coins, 
  RefreshCw, Settings, Activity, Zap, Layers, ImageIcon,
  FileText, Languages, Type
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product, Category } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products' | 'currency'>('kits');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const { rates, updateRates, language, formatPrice } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [currencyForm, setCurrencyForm] = useState({
    USD: rates.USD,
    DKK: rates.DKK,
    NOK: rates.NOK,
    SEK: rates.SEK
  });

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  const dbProductsList = useMemo(() => products.filter(p => p.category !== 'Kits'), [products]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    id: '',
    name: { en: '', uk: '' },
    description: { en: '', uk: '' },
    price: 0,
    category: 'Inverters',
    image: '',
    is_active: true,
    is_leader: false,
  });

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        name: typeof product.name === 'string' ? { en: product.name, uk: product.name } : product.name,
        description: typeof product.description === 'string' ? { en: product.description, uk: product.description } : (product.description || { en: '', uk: '' }),
        is_active: product.is_active !== false,
        is_leader: product.is_leader === true
      });
    } else {
      setEditingProduct(null);
      setFormData({
        id: defaultCategory === 'Kits' ? 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase() : '',
        name: { en: '', uk: '' },
        description: { en: '', uk: '' },
        price: 0,
        category: defaultCategory,
        image: '',
        is_active: true,
        is_leader: false,
      });
    }
    setIsModalOpen(true);
  };

  const getDisplayValue = (val: any) => {
    if (typeof val === 'string') return val;
    return val?.[language] || val?.en || '—';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      is_active: formData.is_active ?? true,
      is_leader: formData.is_leader ?? false
    };
    if (editingProduct) {
      updateProduct(dataToSave as Product);
      addNotification("Asset updated in database", "success");
    } else {
      addProduct(dataToSave as Omit<Product, 'id'>);
      addNotification("New asset created", "success");
    }
    setIsModalOpen(false);
  };

  const renderTable = (list: Product[]) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-6">Asset Details</th>
              <th className="p-6 text-center">Price</th>
              <th className="p-6 text-center">Status</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={p.image || IMAGE_FALLBACK} className="w-12 h-12 rounded-2xl object-cover border border-slate-100" alt="" />
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase flex items-center gap-2">
                        {getDisplayValue(p.name)}
                        {p.is_leader && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id.slice(0, 8)} | {p.category}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <span className="font-black text-slate-900 text-xs">{formatPrice(p.price)}</span>
                </td>
                <td className="p-6 text-center">
                   <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className={`text-[8px] font-black uppercase ${p.is_active !== false ? 'text-emerald-600' : 'text-rose-600'}`}>{p.is_active !== false ? 'Active' : 'Hidden'}</span>
                   </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleOpenModal(p)} className="p-2.5 text-slate-400 hover:text-blue-500 bg-slate-50 rounded-xl transition-all"><Edit size={14} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2.5 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in pb-20" translate="no">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <Settings className="text-emerald-500" size={28} /> Terminal <span className="text-slate-400">v4.0</span>
          </h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 ml-10">Energy Asset Control Unit</p>
        </div>
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-100">
          {(['kits', 'products', 'currency'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'kits' ? 'Energy Kits' : tab === 'products' ? 'Items' : 'Currency'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'currency' ? (
        <div className="max-w-md mx-auto bg-white p-12 rounded-[4rem] border border-slate-100 shadow-3xl space-y-10 animate-fade-in">
           <div className="text-center space-y-2">
             <div className="w-16 h-16 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-yellow-200"><Coins className="text-yellow-950" size={32} /></div>
             <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Global Rates</h2>
           </div>
           <form onSubmit={(e) => { e.preventDefault(); updateRates(currencyForm); addNotification("Rates Updated Successfully", "success"); }} className="space-y-6">
              {Object.keys(currencyForm).map(curr => (
                <div key={curr} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-4 tracking-widest">{curr} Base (vs EUR)</label>
                  <input 
                    type="number" step="0.001" 
                    value={(currencyForm as any)[curr]} 
                    onChange={e => setCurrencyForm({...currencyForm, [curr]: Number(e.target.value)})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-yellow-400 focus:bg-white transition-all shadow-inner" 
                  />
                </div>
              ))}
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95">
                <RefreshCw size={18} /> Update System Metrics
              </button>
           </form>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenModal(undefined, activeTab === 'kits' ? 'Kits' : 'Inverters')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl active:scale-95">
              <Plus size={16} /> New {activeTab === 'kits' ? 'Solution' : 'Asset'}
            </button>
          </div>
          {activeTab === 'kits' ? renderTable(kits) : renderTable(dbProductsList)}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-xl animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 shadow-3xl border border-white my-auto">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{editingProduct ? 'Update Asset' : 'Register Asset'}</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Database Integrity Control</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Basic Info */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Unique Identifier</label>
                      <input disabled={!!editingProduct} value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none opacity-50 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Base Price (EUR)</label>
                      <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Type size={12}/> Title (English)</label>
                      <input value={(formData.name as any)?.en} onChange={e => setFormData({...formData, name: { ...formData.name as any, en: e.target.value }})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Languages size={12}/> Назва (Українська)</label>
                      <input value={(formData.name as any)?.uk} onChange={e => setFormData({...formData, name: { ...formData.name as any, uk: e.target.value }})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  {/* Right Column: Descriptions & Media */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Asset Image URL</label>
                      <div className="flex gap-4">
                        <input value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500" placeholder="https://..." />
                        {formData.image && <img src={formData.image} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100" alt="preview" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><FileText size={12}/> Description (English)</label>
                      <textarea 
                        value={(formData.description as any)?.en} 
                        onChange={e => setFormData({...formData, description: { ...formData.description as any, en: e.target.value }})} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none h-24 resize-none focus:border-emerald-500" 
                        placeholder="Detailed technical description in English..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2"><Languages size={12}/> Опис (Українська)</label>
                      <textarea 
                        value={(formData.description as any)?.uk} 
                        onChange={e => setFormData({...formData, description: { ...formData.description as any, uk: e.target.value }})} 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-medium outline-none h-24 resize-none focus:border-emerald-500" 
                        placeholder="Детальний технічний опис українською..."
                      />
                    </div>
                  </div>
               </div>

               <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-100 space-y-6">
                  <div className="flex flex-wrap gap-10">
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div onClick={() => setFormData({...formData, is_active: !formData.is_active})} className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${formData.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md ${formData.is_active !== false ? 'left-8' : 'left-1'}`}></div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_active !== false ? 'text-emerald-600' : 'text-slate-400'}`}>Availability Status</span>
                    </label>

                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div onClick={() => setFormData({...formData, is_leader: !formData.is_leader})} className={`w-14 h-7 rounded-full relative transition-all duration-500 shadow-inner ${formData.is_leader ? 'bg-amber-400' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 shadow-md ${formData.is_leader ? 'left-8' : 'left-1'}`}></div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_leader ? 'text-amber-600' : 'text-slate-400'}`}>Market Leader</span>
                    </label>
                  </div>
               </div>

               <div className="flex justify-end gap-6 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 transition-all">Discard</button>
                  <button type="submit" className="bg-slate-900 text-white px-14 py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-500 transition-all shadow-2xl active:scale-95 flex items-center gap-3">
                    <Save size={18} /> Sync to Database
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
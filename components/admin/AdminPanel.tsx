import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, X, Save, Cpu, Crown, Coins, 
  RefreshCw, Settings
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product, Category } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products' | 'currency'>('kits');
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { addNotification } = useNotification();
  const { rates, updateRates, language, formatPrice } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [currencyForm, setCurrencyForm] = useState({
    USD: rates.USD, DKK: rates.DKK, NOK: rates.NOK, SEK: rates.SEK
  });

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  const dbProductsList = useMemo(() => products.filter(p => p.category !== 'Kits'), [products]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    id: '', name: { en: '', uk: '' }, price: 0, category: 'Inverters', image: '', is_active: true, is_leader: false
  });

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        name: typeof product.name === 'string' ? { en: product.name, uk: product.name } : (product.name || { en: '', uk: '' }),
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        id: defaultCategory === 'Kits' ? 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase() : '',
        name: { en: '', uk: '' }, price: 0, category: defaultCategory, image: '', is_active: true, is_leader: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct(formData as Product);
      addNotification("Asset updated", "success");
    } else {
      addProduct(formData as Omit<Product, 'id'>);
      addNotification("Asset created", "success");
    }
    setIsModalOpen(false);
  };

  const renderTable = (list: Product[]) => (
    <div className="bg-white rounded-[2rem] border overflow-hidden shadow-xl">
      <table className="w-full text-left">
        <tbody className="divide-y">
          {list.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-6 flex items-center gap-4">
                <img src={p.image || IMAGE_FALLBACK} className="w-10 h-10 rounded-lg object-cover" />
                <span className="font-black uppercase text-[11px]">
                  {typeof p.name === 'string' ? p.name : (p.name?.[language] || p.name?.en || 'Unnamed')}
                </span>
              </td>
              <td className="p-6 text-right">
                <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-12 pb-20" translate="no">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Settings className="text-emerald-500" /> Terminal v4.0
        </h1>
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
          {(['kits', 'products', 'currency'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 'currency' ? (
        <div className="max-w-md mx-auto bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 space-y-6">
           <div className="text-center"><Coins className="text-yellow-500 mx-auto mb-2" size={32} /></div>
           {Object.keys(currencyForm).map(curr => (
             <div key={curr} className="space-y-1">
               <label className="text-[9px] font-black text-slate-400 uppercase px-2">{curr} to EUR</label>
               <input type="number" step="0.01" value={(currencyForm as any)[curr] || 0} onChange={e => setCurrencyForm({...currencyForm, [curr]: Number(e.target.value)})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-black focus:border-emerald-500 outline-none" />
             </div>
           ))}
           <button onClick={() => {updateRates(currencyForm); addNotification("Rates Updated", "success");}} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-colors shadow-lg">Update Rates</button>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handleOpenModal(undefined, activeTab === 'kits' ? 'Kits' : 'Inverters')} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg">
              <Plus size={14} /> New Asset
            </button>
          </div>
          {activeTab === 'kits' ? renderTable(kits) : renderTable(dbProductsList)}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter">{editingProduct ? 'Update Asset' : 'New Asset'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Unique ID</label>
                  <input disabled={!!editingProduct} value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black opacity-50 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Price (EUR)</label>
                  <input type="number" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Name (EN)</label>
                  <input value={(formData.name as any)?.en || ''} onChange={e => setFormData({...formData, name: { ...formData.name as any, en: e.target.value }})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-500" required />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-2">Image URL</label>
                  <input value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-emerald-500" />
                </div>
              </div>
              
              <div className="flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFormData({...formData, is_active: !formData.is_active})} className={`w-10 h-5 rounded-full relative transition-all ${formData.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_active !== false ? 'left-6' : 'left-1'}`}></div>
                  </button>
                  <span className="text-[9px] font-black uppercase text-slate-500">Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFormData({...formData, is_leader: !formData.is_leader})} className={`w-10 h-5 rounded-full relative transition-all ${formData.is_leader ? 'bg-amber-400' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_leader ? 'left-6' : 'left-1'}`}></div>
                  </button>
                  <span className="text-[9px] font-black uppercase text-slate-500">Bestseller</span>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                <button type="submit" className="bg-slate-900 text-white px-10 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2"><Save size={16}/> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
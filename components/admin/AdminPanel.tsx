import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, X, Save, Settings, Coins, RefreshCw, Crown } from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product, Category } from '../../types';

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
    id: '', name: { en: '', uk: '' }, price: 0, category: 'Inverters', image: '', is_active: true
  });

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ 
        id: defaultCategory === 'Kits' ? 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase() : '',
        name: { en: '', uk: '' }, price: 0, category: defaultCategory, image: '', is_active: true
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 space-y-8" translate="no">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black uppercase flex items-center gap-2"><Settings /> Terminal</h1>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['kits', 'products', 'currency'].map((tab: any) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${activeTab === tab ? 'bg-white shadow-sm' : 'text-slate-400'}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 'currency' ? (
        <div className="max-w-md mx-auto bg-white p-8 rounded-[2rem] shadow-xl border space-y-4">
          {Object.keys(currencyForm).map(curr => (
            <div key={curr}>
              <label className="text-[9px] font-black text-slate-400 uppercase">{curr} Rate</label>
              <input 
                type="number" 
                value={(currencyForm as any)[curr] || 0} 
                onChange={e => setCurrencyForm({...currencyForm, [curr]: Number(e.target.value)})} 
                className="w-full bg-slate-50 border rounded-xl px-4 py-3 font-black" 
              />
            </div>
          ))}
          <button onClick={() => {updateRates(currencyForm); addNotification("Rates Updated", "success")}} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-[10px]">Update</button>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border overflow-hidden">
          <table className="w-full text-left">
            <tbody className="divide-y">
              {(activeTab === 'kits' ? kits : dbProductsList).map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-4 font-black text-[11px] uppercase">{typeof p.name === 'string' ? p.name : p.name?.[language] || p.name?.en}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-blue-500"><Edit size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl">
            <form onSubmit={(e) => { e.preventDefault(); editingProduct ? updateProduct(formData as Product) : addProduct(formData as any); setIsModalOpen(false); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">ID</label>
                  <input 
                    disabled={!!editingProduct} 
                    value={formData.id || ''} // <--- ЦЕ ВИПРАВЛЯЄ TS2322
                    onChange={e => setFormData({...formData, id: e.target.value})} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Price</label>
                  <input 
                    type="number" 
                    value={formData.price || 0} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-xs font-black" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
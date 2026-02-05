
import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Save, Cpu, Crown, Coins, 
  RefreshCw, Settings, Activity, Zap, Layers, ImageIcon,
  FileText, Languages, Type, List, File, ArrowRight,
  PlusCircle, MinusCircle, ShoppingBag, Calculator, RefreshCcw, LogOut
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Product, Category, KitComponent } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

interface AdminPanelProps {
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products' | 'currency'>('kits');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const { rates, updateRates, language, formatPrice } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Kit Builder Selection States
  const [selectedBuilderCat, setSelectedBuilderCat] = useState<Category | ''>('');
  const [selectedBuilderProdId, setSelectedBuilderProdId] = useState<string>('');
  const [builderQty, setBuilderQty] = useState<number>(1);

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
    specs: '[]',
    docs: '[]',
    kitComponents: []
  });

  const builderAvailableProducts = useMemo(() => {
    if (!selectedBuilderCat) return [];
    return dbProductsList.filter(p => p.category === selectedBuilderCat);
  }, [selectedBuilderCat, dbProductsList]);

  const getDisplayValue = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val?.[language] || val?.en || Object.values(val)[0] || '';
  };

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    const ensureString = (val: any) => {
      if (!val) return '[]';
      if (typeof val === 'string') return val;
      try { return JSON.stringify(val); } catch { return '[]'; }
    };

    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        name: typeof product.name === 'string' ? { en: product.name, uk: product.name } : product.name,
        description: typeof product.description === 'string' ? { en: product.description, uk: product.description } : (product.description || { en: '', uk: '' }),
        specs: ensureString(product.specs),
        docs: ensureString(product.docs),
        is_active: product.is_active !== false,
        is_leader: product.is_leader === true,
        kitComponents: product.kitComponents || []
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
        specs: '[]',
        docs: '[]',
        kitComponents: []
      });
    }
    setIsModalOpen(true);
  };

  const syncPriceWithComponents = () => {
    const currentComponents = formData.kitComponents || [];
    const newTotal = currentComponents.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setFormData({ ...formData, price: newTotal });
    addNotification("Price synced with component total", "info");
  };

  const addComponentToKit = () => {
    if (!selectedBuilderProdId) return;
    const prod = products.find(p => p.id === selectedBuilderProdId);
    if (!prod) return;

    const newComponent: KitComponent = {
      id: prod.id,
      name: getDisplayValue(prod.name),
      price: prod.price,
      quantity: builderQty,
      alternatives: []
    };

    const currentComponents = formData.kitComponents || [];
    const updatedComponents = [...currentComponents, newComponent];
    const newTotal = updatedComponents.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    setFormData({
      ...formData,
      kitComponents: updatedComponents,
      price: newTotal 
    });

    setSelectedBuilderProdId('');
    setBuilderQty(1);
    addNotification(`Added ${newComponent.name}`, 'success');
  };

  const removeComponentFromKit = (index: number) => {
    const currentComponents = formData.kitComponents || [];
    const updatedComponents = currentComponents.filter((_, i) => i !== index);
    const newTotal = updatedComponents.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    setFormData({
      ...formData,
      kitComponents: updatedComponents,
      price: newTotal
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const processJson = (val: any) => {
      if (typeof val !== 'string') return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    const dataToSave = {
      ...formData,
      specs: processJson(formData.specs),
      docs: processJson(formData.docs),
      is_active: formData.is_active ?? true,
      is_leader: formData.is_leader ?? false
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
                        <span>{getDisplayValue(p.name)}</span>
                        {p.is_leader && <Crown size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>ID: {p.id.slice(0, 8)}</span> | <span>{p.category}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-center">
                  <span className="font-black text-slate-900 text-xs">{formatPrice(p.price)}</span>
                </td>
                <td className="p-6 text-center">
                   <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.is_active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      <span className={`text-[8px] font-black uppercase ${p.is_active !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {p.is_active !== false ? 'Active' : 'Hidden'}
                      </span>
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
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <Settings className="text-emerald-500" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
              <span>Terminal</span> <span className="text-slate-400">v4.0</span>
            </h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">Energy Asset Control Unit</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-100">
            {(['kits', 'products', 'currency'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <span>{tab === 'kits' ? 'Energy Kits' : tab === 'products' ? 'Items' : 'Currency'}</span>
              </button>
            ))}
          </div>

          <button 
            onClick={onLogout}
            className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm group"
            title="Exit Terminal"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          </button>
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
                    value={(currencyForm as any)[curr] || 0} 
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
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-12 shadow-3xl border border-white my-auto">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                  <span>{editingProduct ? 'Update Asset' : 'Register Asset'}</span>
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Database Integrity Control</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Unique ID</label>
                      <input disabled value={formData.id || ''} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none opacity-50 cursor-not-allowed" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Name of Asset (EN)</label>
                      <input value={(formData.name as any)?.en || ''} onChange={e => setFormData({...formData, name: { ...formData.name as any, en: e.target.value }})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500" required placeholder="Ex: Home Independence Kit Pro" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center justify-between">
                        Price (EUR) 
                        {formData.category === 'Kits' && (
                          <button 
                            type="button" 
                            onClick={syncPriceWithComponents}
                            className="text-[8px] bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 px-2 py-1 rounded-md transition-all flex items-center gap-1"
                          >
                            <RefreshCcw size={10} /> Sync from Components
                          </button>
                        )}
                      </label>
                      <input 
                        type="number" 
                        value={formData.price ?? 0} 
                        onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none focus:border-emerald-500`} 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Image URL</label>
                      <input value={formData.image || ''} onChange={e => setFormData({...formData, image: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-4 text-xs font-black outline-none" placeholder="https://..." />
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => setFormData({...formData, is_active: !formData.is_active})}>
                        <div className={`w-10 h-5 rounded-full relative transition-all ${formData.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.is_active !== false ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Active Status</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-8">
                    {formData.category === 'Kits' ? (
                      <div className="animate-fade-in space-y-8">
                        <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] text-white space-y-8 border border-white/5 shadow-2xl">
                           <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                              <Layers className="text-emerald-400" size={24} />
                              <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Kit Component Builder</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select assets from database</p>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">1. Select Category</label>
                                 <select 
                                   value={selectedBuilderCat}
                                   onChange={e => { setSelectedBuilderCat(e.target.value as Category); setSelectedBuilderProdId(''); }}
                                   className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-400 transition-all appearance-none cursor-pointer"
                                 >
                                   <option value="" className="text-slate-900">Choose...</option>
                                   {categories.filter(c => c !== 'Kits').map(c => (
                                     <option key={c} value={c} className="text-slate-900">{c}</option>
                                   ))}
                                 </select>
                              </div>

                              <div className="space-y-2">
                                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">2. Choose Device</label>
                                 <select 
                                   disabled={!selectedBuilderCat}
                                   value={selectedBuilderProdId}
                                   onChange={e => setSelectedBuilderProdId(e.target.value)}
                                   className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-400 disabled:opacity-30 transition-all appearance-none cursor-pointer"
                                 >
                                   <option value="" className="text-slate-900">Select Item...</option>
                                   {builderAvailableProducts.map(p => (
                                     <option key={p.id} value={p.id} className="text-slate-900">{getDisplayValue(p.name)}</option>
                                   ))}
                                 </select>
                              </div>

                              <div className="space-y-2 flex items-end gap-2">
                                 <div className="flex-1 space-y-2">
                                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">3. Qty</label>
                                   <input 
                                     type="number" 
                                     min="1"
                                     value={builderQty}
                                     onChange={e => setBuilderQty(Number(e.target.value))}
                                     className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3.5 text-[10px] font-black outline-none focus:border-emerald-400 transition-all"
                                   />
                                 </div>
                                 <button 
                                   type="button"
                                   disabled={!selectedBuilderProdId}
                                   onClick={addComponentToKit}
                                   className="bg-emerald-500 text-white p-3.5 rounded-xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95 disabled:opacity-30"
                                 >
                                   <Plus size={20} />
                                 </button>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="flex items-center justify-between px-4">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Components ({formData.kitComponents?.length || 0})</h4>
                             <div className="text-[11px] font-black text-slate-900 uppercase">Calculated Sum: {formatPrice(formData.kitComponents?.reduce((s,i)=>s+(i.price*i.quantity),0)||0)}</div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {(!formData.kitComponents || formData.kitComponents.length === 0) ? (
                               <div className="col-span-2 py-12 border-2 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300">
                                  <ShoppingBag size={40} className="mb-3 opacity-20" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Empty Solution</span>
                               </div>
                             ) : (
                               formData.kitComponents.map((comp, idx) => (
                                 <div key={idx} className="bg-white border border-slate-100 p-6 rounded-3xl flex items-center justify-between group hover:border-emerald-500 hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><Zap size={20} /></div>
                                       <div>
                                          <div className="text-[11px] font-black text-slate-900 uppercase leading-none truncate max-w-[150px]">{comp.name}</div>
                                          <div className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest">x{comp.quantity} • {formatPrice(comp.price)}</div>
                                       </div>
                                    </div>
                                    <button onClick={() => removeComponentFromKit(idx)} type="button" className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 rounded-lg">
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                               ))
                             )}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Technical Specs (JSON)</label>
                             <textarea value={formData.specs || '[]'} onChange={e => setFormData({...formData, specs: e.target.value})} className="w-full bg-slate-900 text-emerald-400 border-2 border-slate-800 rounded-3xl px-6 py-6 text-[10px] font-mono outline-none h-48 resize-none shadow-inner" />
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">General Description (EN)</label>
                             <textarea value={(formData.description as any)?.en || ''} onChange={e => setFormData({...formData, description: { ...formData.description as any, en: e.target.value }})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-6 py-6 text-xs font-medium outline-none h-32 resize-none focus:border-emerald-500" />
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               <div className="flex justify-end gap-6 pt-10 border-t border-slate-50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-12 py-5 rounded-3xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 transition-all">Discard</button>
                  <button type="submit" className="bg-slate-900 text-white px-16 py-6 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-emerald-500 transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3">
                    <Save size={20} /> {editingProduct ? 'Update System' : 'Deploy Asset'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

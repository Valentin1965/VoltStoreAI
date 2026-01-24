
import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Layers, Save, Cpu, ImageIcon, List, FileText, 
  ChevronDown, ChevronUp, Package, RefreshCw, Calculator, Hash, ArrowUpRight
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Product, Category, ProductSpec, ProductDoc, KitComponent, Alternative } from '../../types';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products'>('kits');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    id: '',
    name: '', 
    description: '', 
    price: 0, 
    category: 'Inverters', 
    sub_category: '',
    image: '', 
    images: ['', '', ''],
    stock: 10, 
    is_new: true,
    on_sale: false,
    features: [], 
    specs: '[]',
    docs: '[]',
    kitComponents: []
  });

  const isKitMode = formData.category === 'Kits';

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product, 
        images: Array.isArray(product.images) ? [...product.images, '', '', ''].slice(0, 3) : [product.image || '', '', ''].slice(0, 3),
        features: Array.isArray(product.features) ? product.features : [],
        specs: product.specs || '[]',
        docs: product.docs || '[]',
        kitComponents: product.kitComponents || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        id: 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        name: '', description: '', price: 0, category: defaultCategory, sub_category: '',
        image: '', images: ['', '', ''], stock: 10, is_new: true, on_sale: false, features: [], 
        specs: '[]', docs: '[]', kitComponents: []
      });
    }
    setIsModalOpen(true);
  };

  const addKitComponent = () => {
    const newComp: KitComponent = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: 0,
      quantity: 1,
      alternatives: []
    };
    setFormData({ ...formData, kitComponents: [...(formData.kitComponents || []), newComp] });
  };

  const updateKitComponent = (idx: number, field: keyof KitComponent, val: any) => {
    const comps = [...(formData.kitComponents || [])];
    comps[idx] = { ...comps[idx], [field]: val };
    setFormData({ ...formData, kitComponents: comps });
  };

  const removeKitComponent = (idx: number) => {
    setFormData({ ...formData, kitComponents: (formData.kitComponents || []).filter((_, i) => i !== idx) });
  };

  const addAlternative = (compIdx: number) => {
    const comps = [...(formData.kitComponents || [])];
    const newAlt: Alternative = { id: Math.random().toString(36).substr(2, 9), name: '', price: 0, quantity: 1 };
    comps[compIdx].alternatives = [...comps[compIdx].alternatives, newAlt];
    setFormData({ ...formData, kitComponents: comps });
  };

  const updateAlternative = (compIdx: number, altIdx: number, field: keyof Alternative, val: any) => {
    const comps = [...(formData.kitComponents || [])];
    const alts = [...comps[compIdx].alternatives];
    alts[altIdx] = { ...alts[altIdx], [field]: val };
    comps[compIdx].alternatives = alts;
    setFormData({ ...formData, kitComponents: comps });
  };

  const removeAlternative = (compIdx: number, altIdx: number) => {
    const comps = [...(formData.kitComponents || [])];
    comps[compIdx].alternatives = comps[compIdx].alternatives.filter((_, i) => i !== altIdx);
    setFormData({ ...formData, kitComponents: comps });
  };

  // Функція для швидкої заміни основного компонента на аналог
  const swapWithMain = (compIdx: number, altIdx: number) => {
    const comps = [...(formData.kitComponents || [])];
    const main = comps[compIdx];
    const alt = main.alternatives[altIdx];

    const oldMain = { id: main.id, name: main.name, price: main.price, quantity: main.quantity };
    
    comps[compIdx] = {
      ...main,
      id: alt.id,
      name: alt.name,
      price: alt.price,
      quantity: alt.quantity,
      alternatives: [
        oldMain,
        ...main.alternatives.filter((_, i) => i !== altIdx)
      ]
    };

    setFormData({ ...formData, kitComponents: comps });
    addNotification('Альтернативу встановлено як основний компонент', 'info');
  };

  const calculateKitPrice = () => {
    const total = (formData.kitComponents || []).reduce((sum, comp) => sum + (comp.price * comp.quantity), 0);
    setFormData({ ...formData, price: total });
    addNotification('Вартість комплекту перерахована на основі основних вузлів', 'success');
  };

  const updateImage = (idx: number, val: string) => {
    const imgs = Array.isArray(formData.images) ? [...formData.images] : ['', '', ''];
    imgs[idx] = val;
    setFormData({ ...formData, images: imgs });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImages = (Array.isArray(formData.images) ? formData.images : []).filter(img => img.trim() !== '');
    const dataToSave = { ...formData, images: cleanImages, image: cleanImages[0] || formData.image || '' };
    if (editingProduct) updateProduct(dataToSave as Product);
    else addProduct(dataToSave as Omit<Product, 'id'>);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Cpu className="text-yellow-500" size={24} /> Управління активами
          </h1>
          <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.2em] mt-1">VoltStore Pro Terminal</p>
        </div>
        <div className="flex bg-slate-200/50 p-2 rounded-2xl shadow-inner border border-slate-100">
          <button onClick={() => setActiveTab('kits')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'kits' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Готові рішення</button>
          <button onClick={() => setActiveTab('products')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Всі товари</button>
        </div>
      </div>

      {activeTab === 'kits' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-yellow-400/20 transition-all"></div>
              <div className="relative z-10">
                <Layers className="text-yellow-400 mb-6" size={32} />
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Активні збірки</div>
                <div className="text-5xl font-black tracking-tighter">{kits.length}</div>
              </div>
            </div>
            
            <button onClick={() => handleOpenModal(undefined, 'Kits')} className="md:col-span-2 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-6 hover:border-yellow-400 hover:bg-yellow-50/50 transition-all group shadow-sm hover:shadow-2xl">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-950 shadow-2xl group-hover:scale-110 transition-transform">
                <Plus size={40} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Створити нову конфігурацію</span>
            </button>
          </div>

          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">База енергокомплектів</h3>
            </div>
            <div className="grid grid-cols-1 divide-y divide-slate-100">
              {kits.map((kit) => (
                <div key={kit.id} className="p-10 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-8">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm group-hover:shadow-xl transition-shadow">
                      <img src={kit.image || ''} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-yellow-400 px-2 py-0.5 rounded text-[8px] font-black">{kit.id}</span>
                        <h4 className="font-black text-slate-900 uppercase text-lg tracking-tight">{kit.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-md mt-1">{kit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Вартість</div>
                      <div className="text-2xl font-black text-slate-900 tracking-tighter">₴{(kit.price || 0).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleOpenModal(kit)} className="p-4 bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl transition-all shadow-sm"><Edit size={20} /></button>
                      <button onClick={() => deleteProduct(kit.id)} className="p-4 bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm"><Trash2 size={20} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Складська номенклатура</h3>
            <button onClick={() => handleOpenModal()} className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
              <Plus size={16} /> Додати одиницю
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                  <th className="px-12 py-6">Обладнання</th>
                  <th className="px-12 py-6">Категорія</th>
                  <th className="px-12 py-6">Ціна</th>
                  <th className="px-12 py-6 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.filter(p => p.category !== 'Kits').map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-12 py-6">
                      <div className="flex items-center gap-5">
                        <img src={p.image || ''} className="w-7 h-7 rounded-xl object-cover border border-slate-100 shadow-sm" alt="" />
                        <div className="font-black text-slate-900 text-xs uppercase truncate max-w-[200px]">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-12 py-6">
                      <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200/50">{p.category}</span>
                    </td>
                    <td className="px-12 py-6 font-black text-slate-900 text-sm">₴{(p.price || 0).toLocaleString()}</td>
                    <td className="px-12 py-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => handleOpenModal(p)} className="p-3 text-slate-300 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all"><Edit size={18} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-3 text-slate-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-xl overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-3xl border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            <div className="px-12 py-10 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl text-yellow-400">
                   {isKitMode ? <Layers size={24}/> : <Package size={24}/>}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                    {isKitMode ? 'Конструктор системи' : (editingProduct ? 'Налаштування активу' : 'Нова одиниця')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Режим {isKitMode ? 'збірки комплекту' : 'складського обліку'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-3xl transition-all border border-slate-100"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
              <form onSubmit={handleSubmit} className="p-12 space-y-16">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        <Hash size={12}/> Код ідентифікатор (SKU)
                      </label>
                      <input 
                        required 
                        value={formData.id || ''} 
                        onChange={e => setFormData({...formData, id: e.target.value.toUpperCase()})} 
                        className="input-premium font-mono uppercase" 
                        placeholder="Н-д: SYSTEM-PRO-1" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Публічна назва</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="input-premium" placeholder="Н-д: Оптимальний комплект 5кВт" />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Категорія</label>
                        <select value={formData.category || 'Inverters'} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="input-premium appearance-none">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Фінальна Ціна (₴)</label>
                        <div className="relative">
                           <input type="number" required value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="input-premium pr-16" />
                           {isKitMode && (
                             <button type="button" onClick={calculateKitPrice} className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-600 hover:text-yellow-700 p-2 bg-yellow-50 rounded-xl transition-all shadow-sm" title="Перерахувати на основі вузлів">
                                <Calculator size={18}/>
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isKitMode ? (
                  <div className="space-y-10">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                      <div className="flex items-center gap-3">
                        <Layers size={22} className="text-yellow-500" />
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Основні вузли та аналоги</h4>
                      </div>
                      <button type="button" onClick={addKitComponent} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all">
                        <Plus size={16}/> Додати вузол
                      </button>
                    </div>

                    <div className="space-y-6">
                      {(formData.kitComponents || []).map((comp, compIdx) => (
                        <div key={comp.id} className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm">
                          <div className="p-6 bg-slate-50/50 flex flex-wrap items-center gap-6 border-b border-slate-100">
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Основний компонент</label>
                              <input 
                                value={comp.name} 
                                onChange={e => updateKitComponent(compIdx, 'name', e.target.value)}
                                className="w-full bg-transparent border-none text-[12px] font-black uppercase tracking-tight focus:ring-0 p-0 placeholder:text-slate-300"
                                placeholder="Назва (н-д: Інвертор Deye 5кВт)"
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ціна од. (₴)</label>
                              <input 
                                type="number" 
                                value={comp.price} 
                                onChange={e => updateKitComponent(compIdx, 'price', Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-yellow-400"
                              />
                            </div>
                            <div className="w-20">
                              <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">К-ть</label>
                              <input 
                                type="number" 
                                value={comp.quantity} 
                                onChange={e => updateKitComponent(compIdx, 'quantity', Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-yellow-400"
                              />
                            </div>
                            <div className="flex gap-2">
                               <button type="button" onClick={() => addAlternative(compIdx)} className="px-4 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl border border-emerald-100 transition-all flex items-center gap-2 text-[8px] font-black uppercase">
                                  <Plus size={14}/> Аналог
                               </button>
                               <button type="button" onClick={() => removeKitComponent(compIdx)} className="p-2.5 text-slate-300 hover:text-red-500 rounded-xl transition-all">
                                  <Trash2 size={16}/>
                               </button>
                            </div>
                          </div>

                          {comp.alternatives.length > 0 && (
                            <div className="p-6 bg-white space-y-3">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <RefreshCw size={10} /> Альтернативні варіанти (аналоги на вибір):
                              </div>
                              {comp.alternatives.map((alt, altIdx) => (
                                <div key={alt.id} className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group hover:border-yellow-200 transition-all">
                                  <div className="flex-1 min-w-[150px]">
                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Назва аналога</label>
                                    <input 
                                      value={alt.name} 
                                      onChange={e => updateAlternative(compIdx, altIdx, 'name', e.target.value)}
                                      className="w-full bg-transparent border-none text-[10px] font-bold uppercase tracking-tight focus:ring-0 p-0"
                                      placeholder="Назва аналога"
                                    />
                                  </div>
                                  <div className="w-28">
                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ціна од. (₴)</label>
                                    <input 
                                      type="number" 
                                      value={alt.price} 
                                      onChange={e => updateAlternative(compIdx, altIdx, 'price', Number(e.target.value))}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-yellow-400"
                                    />
                                  </div>
                                  <div className="w-20">
                                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">К-ть</label>
                                    <input 
                                      type="number" 
                                      value={alt.quantity} 
                                      onChange={e => updateAlternative(compIdx, altIdx, 'quantity', Number(e.target.value))}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none focus:border-yellow-400"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 h-full pt-4">
                                    <button 
                                      type="button" 
                                      onClick={() => swapWithMain(compIdx, altIdx)}
                                      className="p-2 bg-white text-slate-400 hover:text-yellow-600 rounded-lg border border-slate-200 transition-all shadow-sm"
                                      title="Зробити основним"
                                    >
                                      <ArrowUpRight size={14}/>
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => removeAlternative(compIdx, altIdx)} 
                                      className="p-2 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                    >
                                      <X size={14}/>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {(formData.kitComponents || []).length === 0 && (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white">
                           <Layers size={40} className="mx-auto text-slate-200 mb-4"/>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Комплект порожній. Додайте вузли (інвертор, акб і т.д.)</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                      <ImageIcon size={22} className="text-yellow-500" />
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Цифрова галерея</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[0, 1, 2].map(idx => (
                        <div key={idx} className="space-y-4">
                          <input 
                            value={(Array.isArray(formData.images) ? formData.images[idx] : '') || ''} 
                            onChange={e => updateImage(idx, e.target.value)} 
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:border-yellow-400" 
                            placeholder={`URL зображення ${idx + 1}`} 
                          />
                          <div className="aspect-square bg-slate-200 rounded-[2.5rem] overflow-hidden border-2 border-white shadow-xl flex items-center justify-center group relative p-10">
                            {(Array.isArray(formData.images) && formData.images[idx]) ? (
                              <img src={formData.images[idx]} className="w-full h-full object-contain transition-transform group-hover:scale-110" alt="" />
                            ) : (
                              <ImageIcon className="text-white/50" size={32} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Примітки до збірки</label>
                   <textarea 
                     value={formData.description || ''} 
                     onChange={e => setFormData({...formData, description: e.target.value})} 
                     className="input-premium h-40 resize-none" 
                     placeholder="Технічні вимоги, сумісність, особливості монтажу..."
                   />
                </div>

              </form>
            </div>

            <div className="p-12 border-t border-slate-100 flex gap-6 bg-slate-50/50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 rounded-[2rem] border-2 border-slate-200 font-black text-[12px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all shadow-lg">Скасувати</button>
              <button onClick={handleSubmit} className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 flex-[2] flex items-center justify-center gap-4 py-6 text-[14px] rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95">
                <Save size={24} /> {editingProduct ? 'Зберегти зміни' : 'Затвердити систему'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

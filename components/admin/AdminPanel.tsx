
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Layers, Save, Cpu, ImageIcon, List, FileText, 
  Package, RefreshCw, Hash, ArrowUpRight,
  TrendingUp,
  Table as TableIcon,
  FileDown,
  Eye,
  EyeOff,
  ToggleLeft as ToggleIcon
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Product, Category, ProductSpec, ProductDoc, KitComponent, Alternative } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products'>('kits');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  const dbProductsList = useMemo(() => products.filter(p => p.category !== 'Kits'), [products]);
  
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
    is_active: true,
    features: [], 
    specs: '[]',
    docs: '[]',
    kitComponents: []
  });

  const isKitMode = formData.category === 'Kits';

  useEffect(() => {
    if (isKitMode && formData.kitComponents) {
      const total = formData.kitComponents.reduce((sum, comp) => sum + (comp.price * comp.quantity), 0);
      if (total !== formData.price) {
        setFormData(prev => ({ ...prev, price: total }));
      }
    }
  }, [formData.kitComponents, isKitMode]);

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product, 
        images: Array.isArray(product.images) ? [...product.images, '', '', ''].slice(0, 3) : [product.image || '', '', ''].slice(0, 3),
        features: Array.isArray(product.features) ? product.features : [],
        specs: product.specs || '[]',
        docs: product.docs || '[]',
        kitComponents: product.kitComponents || [],
        is_active: product.is_active !== false
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        id: defaultCategory === 'Kits' ? 'KIT-' + Math.random().toString(36).substr(2, 6).toUpperCase() : '',
        name: '', description: '', price: 0, category: defaultCategory, sub_category: '',
        image: '', images: ['', '', ''], stock: 10, is_new: true, on_sale: false, is_active: true, features: [], 
        specs: '[]', docs: '[]', kitComponents: []
      });
    }
    setIsModalOpen(true);
  };

  const handleJsonListAdd = (field: 'specs' | 'docs', newItem: any) => {
    const list = JSON.parse(formData[field] || '[]');
    list.push(newItem);
    setFormData({ ...formData, [field]: JSON.stringify(list) });
  };

  const handleJsonListRemove = (field: 'specs' | 'docs', index: number) => {
    const list = JSON.parse(formData[field] || '[]');
    list.splice(index, 1);
    setFormData({ ...formData, [field]: JSON.stringify(list) });
  };

  const handleJsonListUpdate = (field: 'specs' | 'docs', index: number, key: string, val: string) => {
    const list = JSON.parse(formData[field] || '[]');
    list[index][key] = val;
    setFormData({ ...formData, [field]: JSON.stringify(list) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImages = (Array.isArray(formData.images) ? formData.images : []).filter(img => img && img.trim() !== '');
    const dataToSave = { 
      ...formData, 
      images: cleanImages, 
      image: cleanImages[0] || formData.image || '',
      is_active: formData.is_active ?? true
    };
    
    if (editingProduct) {
      updateProduct(dataToSave as Product);
    } else {
      addProduct(dataToSave as Omit<Product, 'id'>);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tighter">
            <Cpu className="text-yellow-500" size={24} /> Термінал VoltStore
          </h1>
          <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.2em] mt-1">Панель управління активами</p>
        </div>
        <div className="flex bg-slate-200/50 p-2 rounded-2xl shadow-inner border border-slate-100">
          <button onClick={() => setActiveTab('kits')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'kits' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Енергокомплекти</button>
          <button onClick={() => setActiveTab('products')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Складські товари</button>
        </div>
      </div>

      {activeTab === 'kits' && (
        <div className="space-y-12 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <Layers className="text-yellow-400 mb-6" size={32} />
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Локальні системи</div>
              <div className="text-5xl font-black tracking-tighter">{kits.length}</div>
            </div>
            <button onClick={() => handleOpenModal(undefined, 'Kits')} className="md:col-span-2 bg-white border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-6 hover:border-yellow-400 hover:bg-yellow-50/50 transition-all group shadow-sm">
              <Plus size={40} className="text-slate-200 group-hover:text-yellow-500" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Створити локальну збірку</span>
            </button>
          </div>
          <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm">
            {kits.length === 0 ? (
              <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Немає збережених комплектів</div>
            ) : kits.map(kit => {
              const kitIsHidden = kit.is_active === false;
              return (
                <div key={kit.id} className={`p-8 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-colors ${kitIsHidden ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden relative">
                      {kit.image ? <img src={kit.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center"><ImageIcon size={16} className="text-slate-400"/></div>}
                      {kitIsHidden && (
                        <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
                          <EyeOff size={12}/>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight flex items-center gap-2">
                        {kit.name}
                        {kitIsHidden && <span className="bg-slate-200 text-slate-600 text-[8px] px-2 py-0.5 rounded-full uppercase">Неактивний</span>}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{kit.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right"><div className="text-xl font-black text-slate-900 tracking-tighter">₴{kit.price?.toLocaleString()}</div></div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(kit)} className="p-3 bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm"><Edit size={16} /></button>
                      <button onClick={() => deleteProduct(kit.id)} className="p-3 bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
          <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Склад (База Supabase)</h3>
             <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-lg">Додати товар</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="px-10 py-5">Товар</th>
                    <th className="px-10 py-5">Категорія</th>
                    <th className="px-10 py-5">Статус</th>
                    <th className="px-10 py-5">Ціна</th>
                    <th className="px-10 py-5 text-right">Дії</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {dbProductsList.map(p => {
                    const isHidden = p.is_active === false;
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isHidden ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-10 py-5 flex items-center gap-4">
                          <div className="relative">
                            {p.image ? <img src={p.image} className={`w-8 h-8 rounded-lg object-cover border border-slate-100 ${isHidden ? 'grayscale' : ''}`} alt="" /> : <div className="w-8 h-8 bg-slate-100 rounded-lg"/>}
                            {isHidden && <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center text-white rounded-lg"><EyeOff size={10}/></div>}
                          </div>
                          <span className={`font-black text-slate-900 text-xs uppercase truncate max-w-[250px] ${isHidden ? 'text-slate-400' : ''}`}>{p.name}</span>
                        </td>
                        <td className="px-10 py-5"><span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{p.category}</span></td>
                        <td className="px-10 py-5">
                          <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase ${isHidden ? 'text-slate-400' : 'text-emerald-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isHidden ? 'bg-slate-300' : 'bg-emerald-500'}`}></div> 
                            {isHidden ? 'Неактивний' : 'Активний'}
                          </span>
                        </td>
                        <td className="px-10 py-5 font-black text-slate-900">₴{p.price?.toLocaleString()}</td>
                        <td className="px-10 py-5 text-right flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><Edit size={16}/></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-3xl border border-white flex flex-col max-h-[95vh] overflow-hidden my-auto">
            
            <div className="px-12 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl text-yellow-400">{isKitMode ? <Layers size={24}/> : <Package size={24}/>}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{isKitMode ? 'Конструктор Системи' : 'Картка товару'}</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isKitMode ? 'Форма збірки енерговузлів' : 'Введення характеристик та медіа'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-3xl transition-all shadow-sm"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-12 bg-slate-50/30">
              <form onSubmit={handleSubmit} className="space-y-12">
                
                {/* --- HEADER FIELDS --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between">
                      Назва активу
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({...prev, is_active: !prev.is_active}))}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${formData.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}
                      >
                        <span className="shrink-0">
                          {formData.is_active ? <Eye size={10}/> : <EyeOff size={10}/>}
                        </span>
                        <span>{formData.is_active ? 'Активний в каталозі' : 'Прихований (Чернетка)'}</span>
                      </button>
                    </label>
                    <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="input-premium" placeholder="Назва для клієнта" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex justify-between">
                       Вартість (₴)
                       {isKitMode && <span className="text-emerald-500 lowercase text-[8px] animate-pulse">автоматичний розрахунок</span>}
                    </label>
                    <input 
                      type="number" 
                      required 
                      value={formData.price || 0} 
                      onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                      readOnly={isKitMode}
                      className={`input-premium ${isKitMode ? 'bg-slate-100/50 cursor-not-allowed text-slate-500' : ''}`} 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Категорія</label>
                    <select value={formData.category || 'Inverters'} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="input-premium appearance-none">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Stock (Наявність)</label>
                    <input type="number" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="input-premium" />
                  </div>
                </div>

                {isKitMode ? (
                  <div key="kit-fields-container" className="space-y-10 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Cpu size={16}/> Склад комплекту</h4>
                      <button type="button" onClick={() => {
                         const newComp: KitComponent = { id: 'COMP-' + Math.random().toString(36).substr(2, 9), name: '', price: 0, quantity: 1, alternatives: [] };
                         setFormData({ ...formData, kitComponents: [...(formData.kitComponents || []), newComp] });
                      }} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all">+ Додати вузол</button>
                    </div>

                    <div className="space-y-8">
                       {(formData.kitComponents || []).map((comp, compIdx) => (
                         <div key={comp.id || compIdx} className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                            <div className="p-8 bg-slate-50/50 flex flex-wrap items-end gap-6 border-b border-slate-100">
                               <div className="flex-1 min-w-[200px]">
                                  <label className="text-[7px] font-black text-slate-400 uppercase block mb-2">Назва компонента</label>
                                  <input value={comp.name} onChange={e => {
                                     const comps = [...(formData.kitComponents || [])];
                                     comps[compIdx].name = e.target.value;
                                     setFormData({...formData, kitComponents: comps});
                                  }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-black uppercase" />
                               </div>
                               <div className="w-32">
                                  <label className="text-[7px] font-black text-slate-400 uppercase block mb-2">Ціна од. (₴)</label>
                                  <input type="number" value={comp.price} onChange={e => {
                                     const comps = [...(formData.kitComponents || [])];
                                     comps[compIdx].price = Number(e.target.value);
                                     setFormData({...formData, kitComponents: comps});
                                  }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold" />
                               </div>
                               <div className="w-20">
                                  <label className="text-[7px] font-black text-slate-400 uppercase block mb-2">К-ть</label>
                                  <input type="number" value={comp.quantity} onChange={e => {
                                     const comps = [...(formData.kitComponents || [])];
                                     comps[compIdx].quantity = Number(e.target.value);
                                     setFormData({...formData, kitComponents: comps});
                                  }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-center" />
                               </div>
                               <button type="button" onClick={() => {
                                  const comps = [...(formData.kitComponents || [])];
                                  const newAlt: Alternative = { id: 'ALT-' + Math.random().toString(36).substr(2, 9), name: '', price: 0, quantity: 1 };
                                  comps[compIdx].alternatives = [...comps[compIdx].alternatives, newAlt];
                                  setFormData({...formData, kitComponents: comps});
                               }} className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[8px] font-black uppercase">+ Аналог</button>
                               <button type="button" onClick={() => setFormData({...formData, kitComponents: (formData.kitComponents || []).filter((_, i) => i !== compIdx)})} className="p-3 text-slate-300 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div key="product-fields-container" className="space-y-16 animate-fade-in">
                    {/* Media Gallery */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 space-y-8">
                       <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><ImageIcon size={18} className="text-yellow-500"/><h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Галерея зображень</h4></div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                         {[0, 1, 2].map(idx => (
                           <div key={`img-field-${idx}`} className="space-y-4">
                             <input value={(formData.images || [])[idx] || ''} onChange={e => {
                                const imgs = [...(formData.images || ['', '', ''])];
                                imgs[idx] = e.target.value;
                                setFormData({...formData, images: imgs});
                             }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] outline-none" placeholder={`URL фото ${idx + 1}`} />
                             <div className="aspect-square bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 flex items-center justify-center">
                                {(formData.images || [])[idx] ? <img src={(formData.images || [])[idx] || undefined} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="text-slate-200" size={32}/>}
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Specs Matrix */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                         <div className="flex items-center gap-3"><TableIcon size={18} className="text-yellow-500"/><h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Технічні характеристики</h4></div>
                         <button type="button" onClick={() => handleJsonListAdd('specs', {label: '', value: ''})} className="text-[9px] font-black text-yellow-600 uppercase tracking-widest hover:underline">+ Додати рядок</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                        {JSON.parse(formData.specs || '[]').map((spec: ProductSpec, i: number) => (
                          <div key={`spec-${i}`} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                             <input value={spec.label} onChange={e => handleJsonListUpdate('specs', i, 'label', e.target.value)} className="flex-1 bg-transparent border-none text-[10px] font-black uppercase p-0 focus:ring-0" placeholder="Параметр" />
                             <input value={spec.value} onChange={e => handleJsonListUpdate('specs', i, 'value', e.target.value)} className="flex-1 bg-transparent border-none text-[10px] font-bold text-slate-500 p-0 focus:ring-0" placeholder="Значення" />
                             <button type="button" onClick={() => handleJsonListRemove('specs', i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PDF Documentation Section */}
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                         <div className="flex items-center gap-3"><FileDown size={18} className="text-yellow-500"/><h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Документація (PDF)</h4></div>
                         <button type="button" onClick={() => handleJsonListAdd('docs', {title: '', url: ''})} className="text-[9px] font-black text-yellow-600 uppercase tracking-widest hover:underline">+ Додати документ</button>
                      </div>
                      <div className="space-y-4">
                        {JSON.parse(formData.docs || '[]').map((doc: ProductDoc, i: number) => (
                          <div key={`doc-${i}`} className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <div className="flex-[2]">
                                <label className="text-[7px] font-black text-slate-400 uppercase block mb-1 px-1">Назва (напр. "Інструкція PDF")</label>
                                <input value={doc.title} onChange={e => handleJsonListUpdate('docs', i, 'title', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-black uppercase" />
                             </div>
                             <div className="flex-[3]">
                                <label className="text-[7px] font-black text-slate-400 uppercase block mb-1 px-1">URL посилання на файл</label>
                                <input value={doc.url} onChange={e => handleJsonListUpdate('docs', i, 'url', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-mono" placeholder="https://example.com/manual.pdf" />
                             </div>
                             <button type="button" onClick={() => handleJsonListRemove('docs', i)} className="mt-4 p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><List size={14}/> Опис</label>
                   <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="input-premium h-40 resize-none pt-4" placeholder="Детальний опис..." />
                </div>
              </form>
            </div>

            <div className="p-12 border-t border-slate-100 flex gap-6 bg-slate-50/50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 rounded-[2rem] border-2 border-slate-200 font-black text-[12px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all shadow-lg">Скасувати</button>
              <button onClick={handleSubmit} className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 flex-[2] flex items-center justify-center gap-4 py-6 text-[14px] rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95">
                <Save size={24} /> {editingProduct ? 'Оновити дані' : 'Затвердити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Plus, Edit, Trash2, X, 
  Zap, Layers, RefreshCcw, Save, Cpu, Search, Database,
  FileText, Image as ImageIcon, List
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Product, Category, KitComponent, Alternative, ProductDoc, ProductSpec } from '../../types';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kits' | 'products'>('kits');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const kits = useMemo(() => products.filter(p => p.category === 'Kits'), [products]);
  const availableInventory = useMemo(() => products.filter(p => p.category !== 'Kits'), [products]);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', 
    description: '', 
    price: 0, 
    category: 'Inverters', 
    image: '', 
    images: ['', '', ''],
    stock: 1, 
    features: [], 
    kitComponents: [],
    docs: [],
    specs: []
  });

  const isKitMode = formData.category === 'Kits';

  // Auto-calculate price ONLY for kits
  useEffect(() => {
    if (isKitMode) {
      const total = (formData.kitComponents || []).reduce((sum, comp) => {
        return sum + (comp.price * comp.quantity);
      }, 0);
      
      if (formData.price !== total) {
        setFormData(prev => ({ ...prev, price: total }));
      }
    }
  }, [formData.kitComponents, isKitMode]);

  const handleOpenModal = (product?: Product, defaultCategory: Category = 'Inverters') => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product, 
        images: product.images && product.images.length > 0 ? [...product.images, '', '', ''].slice(0, 3) : ['', '', ''],
        kitComponents: product.kitComponents || [],
        docs: product.docs || [],
        specs: product.specs || []
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', description: '', price: 0, category: defaultCategory, 
        image: '', images: ['', '', ''], stock: 1, features: [], kitComponents: [],
        docs: [], specs: []
      });
    }
    setIsModalOpen(true);
  };

  // Handlers for dynamic lists
  const updateImage = (idx: number, val: string) => {
    const newImgs = [...(formData.images || ['', '', ''])];
    newImgs[idx] = val;
    setFormData({ ...formData, images: newImgs, image: newImgs[0] || formData.image });
  };

  const addDoc = () => setFormData({ ...formData, docs: [...(formData.docs || []), { title: '', url: '' }] });
  const removeDoc = (idx: number) => setFormData({ ...formData, docs: (formData.docs || []).filter((_, i) => i !== idx) });
  const updateDoc = (idx: number, field: keyof ProductDoc, val: string) => {
    const newDocs = [...(formData.docs || [])];
    newDocs[idx] = { ...newDocs[idx], [field]: val };
    setFormData({ ...formData, docs: newDocs });
  };

  const addSpec = () => setFormData({ ...formData, specs: [...(formData.specs || []), { label: '', value: '' }] });
  const removeSpec = (idx: number) => setFormData({ ...formData, specs: (formData.specs || []).filter((_, i) => i !== idx) });
  const updateSpec = (idx: number, field: keyof ProductSpec, val: string) => {
    const newSpecs = [...(formData.specs || [])];
    newSpecs[idx] = { ...newSpecs[idx], [field]: val };
    setFormData({ ...formData, specs: newSpecs });
  };

  // Kit specific handlers
  const addKitComponent = () => {
    setFormData(p => ({ 
      ...p, 
      kitComponents: [...(p.kitComponents || []), { id: 'comp-' + Date.now(), name: '', price: 0, quantity: 1, alternatives: [] }] 
    }));
  };

  const removeKitComponent = (id: string) => {
    setFormData(p => ({
      ...p,
      kitComponents: (p.kitComponents || []).filter(c => c.id !== id)
    }));
  };

  const updateKitComponent = (idx: number, field: keyof KitComponent, value: any) => {
    const newKits = [...(formData.kitComponents || [])];
    if (field === 'id' && value !== 'custom') {
      const selectedProd = availableInventory.find(p => p.id === value);
      if (selectedProd) {
        newKits[idx] = { ...newKits[idx], name: selectedProd.name, price: selectedProd.price };
        setFormData({ ...formData, kitComponents: newKits });
        return;
      }
    }
    newKits[idx] = { ...newKits[idx], [field]: value };
    setFormData({ ...formData, kitComponents: newKits });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up empty images before saving
    const cleanImages = (formData.images || []).filter(img => img.trim() !== '');
    const dataToSave = { ...formData, images: cleanImages, image: cleanImages[0] || formData.image };
    
    if (editingProduct) updateProduct(dataToSave as Product);
    else addProduct(dataToSave as Omit<Product, 'id'>);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <Cpu className="text-yellow-500" size={32} /> Адмін-панель
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Центр керування VoltStore Pro</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('kits')} 
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'kits' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Збірка комплекту
          </button>
          <button 
            onClick={() => setActiveTab('products')} 
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Усі товари
          </button>
        </div>
      </div>

      {activeTab === 'kits' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-yellow-400/20 transition-all"></div>
              <div className="relative z-10">
                <Layers className="text-yellow-400 mb-4" size={24} />
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Активні комплекти</div>
                <div className="text-4xl font-black">{kits.length}</div>
              </div>
            </div>
            
            <button 
              onClick={() => handleOpenModal(undefined, 'Kits')}
              className="md:col-span-2 bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:border-yellow-400 hover:bg-yellow-50/30 transition-all group"
            >
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-950 shadow-xl group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Створити новий проект системи</span>
            </button>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Архів збірок</h3>
            </div>
            <div className="grid grid-cols-1 gap-0 divide-y divide-slate-50">
              {kits.map((kit) => (
                <div key={kit.id} className="p-8 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0">
                      <img src={kit.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1">Компонентів: {kit.kitComponents?.length || 0}</div>
                      <h4 className="font-black text-slate-900 uppercase text-base tracking-tight">{kit.name}</h4>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1 max-w-md">{kit.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-10">
                    <div className="text-right">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Вартість збірки</div>
                      <div className="text-xl font-black text-slate-900">₴{kit.price.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal(kit)} className="p-4 bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"><Edit size={18} /></button>
                      <button onClick={() => deleteProduct(kit.id)} className="p-4 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-2xl transition-all"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Складські залишки</h3>
            <button onClick={() => handleOpenModal()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
              <Plus size={14} /> Нова одиниця
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100">
                  <th className="px-10 py-4">Товар</th>
                  <th className="px-10 py-4">Категорія</th>
                  <th className="px-10 py-4">Склад</th>
                  <th className="px-10 py-4">Ціна</th>
                  <th className="px-10 py-4 text-right">Управління</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-10 py-4">
                      <div className="flex items-center gap-4">
                        <img src={p.image} className="w-10 h-10 rounded-xl object-cover border border-slate-100" alt="" />
                        <div className="font-black text-slate-900 text-[11px] uppercase truncate max-w-[200px]">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-10 py-4"><span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">{p.category}</span></td>
                    <td className="px-10 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.stock > 5 ? 'bg-green-500' : p.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-bold text-slate-700">{p.stock} од.</span>
                      </div>
                    </td>
                    <td className="px-10 py-4 font-black text-slate-900 text-sm">₴{p.price.toLocaleString()}</td>
                    <td className="px-10 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(p)} className="p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit size={16} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-3 text-slate-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"><Trash2 size={16} /></button>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  {isKitMode ? (editingProduct ? 'Налаштування комплекту' : 'Проектування комплекту') : (editingProduct ? 'Редагування товару' : 'Додавання товару')}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {isKitMode ? 'Ціна розраховується автоматично на основі специфікації' : 'Заповніть медіа та технічні характеристики'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl shadow-sm transition-all border border-slate-100"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <form onSubmit={handleSubmit} className="p-10 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Назва</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold uppercase focus:ring-4 focus:ring-yellow-400/20 transition-all outline-none" placeholder="Н-д: Інвертор DEYE 5кВт" />
                    </div>

                    {!isKitMode && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Категорія</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold uppercase outline-none">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {isKitMode ? (
                      <div className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-center">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Підсумкова вартість комплекту</label>
                            <div className="text-4xl font-black text-yellow-400 tracking-tighter">₴{formData.price?.toLocaleString()}</div>
                          </div>
                          <Database className="text-white/10" size={60} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ціна (₴)</label>
                          <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Склад</label>
                          <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!isKitMode && (
                  <div className="space-y-10">
                    {/* IMAGES SECTION */}
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <ImageIcon size={18} className="text-yellow-500" />
                        <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Зображення (До 3-х посилань)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[0, 1, 2].map(idx => (
                          <div key={idx} className="space-y-3">
                            <input 
                              value={formData.images?.[idx] || ''} 
                              onChange={e => updateImage(idx, e.target.value)} 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[10px] outline-none" 
                              placeholder={`URL зображення ${idx + 1}`}
                            />
                            <div className="aspect-square bg-slate-200 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center">
                              {formData.images?.[idx] ? (
                                <img src={formData.images[idx]} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <ImageIcon className="text-white" size={24} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SPECS TABLE SECTION */}
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-3">
                          <List size={18} className="text-yellow-500" />
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Технічні характеристики</h4>
                        </div>
                        <button type="button" onClick={addSpec} className="text-[9px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700">+ Додати параметр</button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(formData.specs || []).map((spec, idx) => (
                          <div key={idx} className="flex gap-4 animate-fade-in">
                            <input value={spec.label} onChange={e => updateSpec(idx, 'label', e.target.value)} placeholder="Назва (н-д: Потужність)" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold uppercase outline-none" />
                            <input value={spec.value} onChange={e => updateSpec(idx, 'value', e.target.value)} placeholder="Значення (н-д: 5 кВт)" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] outline-none" />
                            <button type="button" onClick={() => removeSpec(idx)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PDF DOCUMENTS SECTION */}
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-yellow-500" />
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Документація (PDF)</h4>
                        </div>
                        <button type="button" onClick={addDoc} className="text-[9px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700">+ Додати документ</button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {(formData.docs || []).map((doc, idx) => (
                          <div key={idx} className="flex gap-4 animate-fade-in">
                            <input value={doc.title} onChange={e => updateDoc(idx, 'title', e.target.value)} placeholder="Назва документа" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] outline-none" />
                            <input value={doc.url} onChange={e => updateDoc(idx, 'url', e.target.value)} placeholder="URL до PDF" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] outline-none" />
                            <button type="button" onClick={() => removeDoc(idx)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Опис товару</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-5 text-sm font-medium leading-relaxed outline-none focus:ring-4 focus:ring-yellow-400/20 transition-all" placeholder="Опишіть характеристики та переваги..." />
                </div>

                {isKitMode && (
                  <div className="space-y-8 bg-slate-50/50 p-8 md:p-12 rounded-[3.5rem] border border-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-8">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-3"><Layers size={20} className="text-yellow-500" /> Специфікація обладнання</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Оберіть товари з бази даних для формування комплекту</p>
                      </div>
                      <button type="button" onClick={addKitComponent} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 group">
                        <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Додати компонент
                      </button>
                    </div>
                    
                    <div className="space-y-8">
                      {(formData.kitComponents || []).map((comp, cIdx) => (
                        <div key={comp.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 space-y-6 shadow-sm relative group/comp animate-fade-in">
                          <button type="button" onClick={() => removeKitComponent(comp.id)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/comp:opacity-100"><Trash2 size={16} /></button>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-5 space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Search size={10} /> Обрати товар з бази</label>
                              <select onChange={e => updateKitComponent(cIdx, 'id', e.target.value)} className="w-full text-[10px] font-bold uppercase bg-slate-50 border border-slate-100 p-4 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer">
                                <option value="custom">-- Оберіть товар --</option>
                                {availableInventory.map(p => <option key={p.id} value={p.id}>{p.name} (₴{p.price.toLocaleString()})</option>)}
                              </select>
                            </div>
                            <div className="md:col-span-3 space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Назва</label>
                              <input placeholder="Назва" value={comp.name} onChange={e => updateKitComponent(cIdx, 'name', e.target.value)} className="w-full text-[10px] font-bold uppercase bg-slate-50 border border-slate-100 p-4 rounded-xl outline-none" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ціна (₴)</label>
                              <input type="number" value={comp.price} onChange={e => updateKitComponent(cIdx, 'price', Number(e.target.value))} className="w-full text-[10px] font-black bg-slate-50 border border-slate-100 p-4 rounded-xl outline-none" />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Кіл-ть</label>
                              <input type="number" value={comp.quantity} onChange={e => updateKitComponent(cIdx, 'quantity', Number(e.target.value))} className="w-full text-[10px] font-black bg-slate-50 border border-slate-100 p-4 rounded-xl outline-none" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-10 border-t border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-2xl border border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all">Закрити</button>
              <button onClick={handleSubmit} className="flex-[2] py-5 rounded-2xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-xl flex items-center justify-center gap-3">
                <Save size={20} /> {editingProduct ? 'Зберегти зміни' : 'Створити запис'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

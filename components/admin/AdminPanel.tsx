
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, X, 
  Layers, Save, Cpu, ImageIcon, List, FileText, Link as LinkIcon, File
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Product, Category, ProductSpec, ProductDoc } from '../../types';

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
    old_price: 0,
    category: 'Inverters', 
    sub_category: '',
    image: '', 
    images: ['', '', ''],
    stock: 10, 
    is_new: true,
    on_sale: false,
    features: [], 
    specs: '[]',
    detailed_tech_specs: '',
    docs: '[]'
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
        docs: product.docs || '[]'
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        id: Math.random().toString(36).substr(2, 9),
        name: '', description: '', price: 0, old_price: 0, category: defaultCategory, sub_category: '',
        image: '', images: ['', '', ''], stock: 10, is_new: true, on_sale: false, features: [], 
        specs: '[]', docs: '[]', detailed_tech_specs: ''
      });
    }
    setIsModalOpen(true);
  };

  const updateImage = (idx: number, val: string) => {
    const newImgs = [...(Array.isArray(formData.images) ? formData.images : ['', '', ''])];
    newImgs[idx] = val;
    setFormData({ ...formData, images: newImgs, image: newImgs[0] || formData.image || '' });
  };

  const getSpecsArray = (): ProductSpec[] => {
    try {
      return JSON.parse(formData.specs || '[]');
    } catch {
      return [];
    }
  };

  const setSpecsArray = (specs: ProductSpec[]) => {
    setFormData({ ...formData, specs: JSON.stringify(specs) });
  };

  const addSpec = () => setSpecsArray([...getSpecsArray(), { label: '', value: '' }]);
  const removeSpec = (idx: number) => setSpecsArray(getSpecsArray().filter((_, i) => i !== idx));
  const updateSpec = (idx: number, field: keyof ProductSpec, val: string) => {
    const newSpecs = [...getSpecsArray()];
    if (newSpecs[idx]) {
      newSpecs[idx] = { ...newSpecs[idx], [field]: val };
      setSpecsArray(newSpecs);
    }
  };

  const getDocsArray = (): ProductDoc[] => {
    try {
      return JSON.parse(formData.docs || '[]');
    } catch {
      return [];
    }
  };

  const setDocsArray = (docs: ProductDoc[]) => {
    setFormData({ ...formData, docs: JSON.stringify(docs) });
  };

  const addDoc = () => setDocsArray([...getDocsArray(), { title: '', url: '' }]);
  const removeDoc = (idx: number) => setDocsArray(getDocsArray().filter((_, i) => i !== idx));
  const updateDoc = (idx: number, field: keyof ProductDoc, val: string) => {
    const newDocs = [...getDocsArray()];
    if (newDocs[idx]) {
      newDocs[idx] = { ...newDocs[idx], [field]: val };
      setDocsArray(newDocs);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanImages = (Array.isArray(formData.images) ? formData.images : []).filter(img => img.trim() !== '');
    const cleanFeatures = (Array.isArray(formData.features) ? formData.features : []).filter(f => f.trim() !== '');
    const cleanSpecs = getSpecsArray().filter(s => s.label.trim() !== '');
    const cleanDocs = getDocsArray().filter(d => d.title.trim() !== '' && d.url.trim() !== '');

    const dataToSave = { 
      ...formData, 
      images: cleanImages, 
      image: cleanImages[0] || formData.image || '',
      features: cleanFeatures,
      specs: JSON.stringify(cleanSpecs),
      docs: JSON.stringify(cleanDocs)
    };
    
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
          <p className="text-slate-400 text-[8px] font-bold uppercase tracking-[0.2em] mt-1">Адміністративний термінал VoltStore Pro</p>
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
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Запроектувати нову систему</span>
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
                      <h4 className="font-black text-slate-900 uppercase text-lg tracking-tight">{kit.name}</h4>
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
                  <th className="px-12 py-6">Залишок</th>
                  <th className="px-12 py-6">Ціна</th>
                  <th className="px-12 py-6 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-12 py-6">
                      <div className="flex items-center gap-5">
                        <img src={p.image || ''} className="w-7 h-7 rounded-xl object-cover border border-slate-100 shadow-sm" alt="" />
                        <div className="font-black text-slate-900 text-xs uppercase truncate max-w-[200px]">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-12 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200/50">{p.category}</span>
                        {p.sub_category && <span className="text-[8px] text-slate-400 uppercase ml-2 italic">{p.sub_category}</span>}
                      </div>
                    </td>
                    <td className="px-12 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${(p.stock || 0) > 5 ? 'bg-emerald-500' : (p.stock || 0) > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                        <span className="text-xs font-bold text-slate-700">{p.stock} од.</span>
                      </div>
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
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                  {isKitMode ? 'Конструктор системи' : (editingProduct ? 'Налаштування' : 'Новий актив')}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-3xl transition-all border border-slate-100"><X size={28} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <form onSubmit={handleSubmit} className="p-12 space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Назва обладнання</label>
                      <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="input-premium" placeholder="Н-д: Інвертор DEYE 5кВт Premium" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Категорія</label>
                        <select value={formData.category || 'Inverters'} onChange={e => setFormData({...formData, category: e.target.value as Category})} className="input-premium appearance-none">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Підкатегорія</label>
                        <input value={formData.sub_category || ''} onChange={e => setFormData({...formData, sub_category: e.target.value})} className="input-premium" placeholder="Н-д: Однофазний" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Ціна (₴)</label>
                        <input type="number" required value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} disabled={isKitMode} className="input-premium disabled:opacity-50" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Залишок</label>
                        <input type="number" required value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} className="input-premium" />
                      </div>
                    </div>
                    
                    <div className="flex gap-8 px-4">
                       <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={formData.is_new || false} onChange={e => setFormData({...formData, is_new: e.target.checked})} className="w-5 h-5 rounded border-slate-200 text-yellow-500 focus:ring-yellow-400" />
                         <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 transition-colors">Новинка</span>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                         <input type="checkbox" checked={formData.on_sale || false} onChange={e => setFormData({...formData, on_sale: e.target.checked})} className="w-5 h-5 rounded border-slate-200 text-red-500 focus:ring-red-400" />
                         <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 transition-colors">Акція</span>
                       </label>
                    </div>
                  </div>
                </div>

                {!isKitMode && (
                  <div className="space-y-16">
                    <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 space-y-8">
                      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                        <ImageIcon size={22} className="text-yellow-500" />
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Цифрова галерея</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[0, 1, 2].map(idx => (
                          <div key={idx} className="space-y-4">
                            <input value={(Array.isArray(formData.images) ? formData.images[idx] : '') || ''} onChange={e => updateImage(idx, e.target.value)} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:border-yellow-400" placeholder={`URL зображення ${idx + 1}`} />
                            <div className="aspect-square bg-slate-200 rounded-[2.5rem] overflow-hidden border-2 border-white shadow-xl flex items-center justify-center group relative p-10">
                              {(Array.isArray(formData.images) && formData.images[idx]) ? <img src={formData.images[idx]} className="w-full h-full object-contain transition-transform group-hover:scale-110" alt="" /> : <ImageIcon className="text-white/50" size={32} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                        <div className="flex items-center gap-4">
                          <File size={22} className="text-yellow-500" />
                          <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Документація (PDF / Посилання)</h4>
                        </div>
                        <button type="button" onClick={addDoc} className="text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700 bg-yellow-400/10 px-4 py-2 rounded-xl transition-colors">+ Додати файл</button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {getDocsArray().map((doc, idx) => (
                          <div key={idx} className="flex gap-4 animate-fade-in group">
                            <div className="flex-[1] relative">
                               <input value={doc.title || ''} onChange={e => updateDoc(idx, 'title', e.target.value)} placeholder="Назва документа (н-д: Інструкція)" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 text-xs font-bold uppercase outline-none focus:border-yellow-400" />
                               <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            </div>
                            <div className="flex-[2] relative">
                               <input value={doc.url || ''} onChange={e => updateDoc(idx, 'url', e.target.value)} placeholder="Посилання на PDF файл (URL)" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 text-xs font-bold outline-none focus:border-yellow-400" />
                               <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            </div>
                            <button type="button" onClick={() => removeDoc(idx)} className="p-4 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-2xl border border-slate-100 hover:border-red-100"><Trash2 size={20} /></button>
                          </div>
                        ))}
                        {getDocsArray().length === 0 && (
                          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 text-[10px] font-black uppercase tracking-widest">Документи не додано</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 space-y-8">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
                        <div className="flex items-center gap-4">
                          <List size={22} className="text-yellow-500" />
                          <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Технічний паспорт (Параметри)</h4>
                        </div>
                        <button type="button" onClick={addSpec} className="text-[10px] font-black uppercase tracking-widest text-yellow-600 hover:text-yellow-700 bg-yellow-400/10 px-4 py-2 rounded-xl transition-colors">+ Додати рядок</button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {getSpecsArray().map((spec, idx) => (
                          <div key={idx} className="flex gap-4 animate-fade-in group">
                            <input value={spec.label || ''} onChange={e => updateSpec(idx, 'label', e.target.value)} placeholder="Параметр" className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold uppercase outline-none focus:border-yellow-400" />
                            <input value={spec.value || ''} onChange={e => updateSpec(idx, 'value', e.target.value)} placeholder="Значення" className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-yellow-400" />
                            <button type="button" onClick={() => removeSpec(idx)} className="p-4 text-slate-300 hover:text-red-500 transition-colors bg-white rounded-2xl border border-slate-100 hover:border-red-100"><Trash2 size={20} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><FileText size={14}/> Короткий опис</label>
                      <textarea rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="input-premium leading-relaxed resize-y min-h-[120px]" placeholder="Загальна інформація про товар..." />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Cpu size={14}/> Детальні технічні дані</label>
                      <textarea rows={4} value={formData.detailed_tech_specs || ''} onChange={e => setFormData({...formData, detailed_tech_specs: e.target.value})} className="input-premium leading-relaxed resize-none" placeholder="Повні технічні характеристики..." />
                   </div>
                </div>
              </form>
            </div>

            <div className="p-12 border-t border-slate-100 flex gap-6 bg-slate-50/50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 rounded-[2rem] border-2 border-slate-200 font-black text-[12px] uppercase tracking-widest text-slate-500 hover:bg-white transition-all shadow-lg">Скасувати</button>
              <button onClick={handleSubmit} className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 flex-[2] flex items-center justify-center gap-4 py-6 text-[14px] rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95">
                <Save size={24} /> {editingProduct ? 'Зберегти зміни' : 'Зареєструвати актив'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Package, Users, ShoppingBag, TrendingUp, DollarSign, Clock, Plus, Edit, Trash2, X, Image as ImageIcon, FileText, List, ImagePlus, PieChart as PieIcon, Zap } from 'lucide-react';
import { useProducts } from '../../contexts/ProductsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Product, Category, ProductDoc, ProductSpec } from '../../types';

const COLORS = ['#fbbf24', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products'>('dashboard');
  const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
  const { addNotification } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Dynamic Stats
  const stats = useMemo(() => {
    const totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
    const lowStock = products.filter(p => p.stock < 5).length;
    
    const categoryDistribution = categories.map(cat => ({
      name: cat,
      value: products.filter(p => p.category === cat).length
    })).filter(c => c.value > 0);

    return { totalValue, lowStock, categoryDistribution };
  }, [products, categories]);

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: 'Batteries', image: '', images: [], stock: 0, features: [], docs: [], specs: []
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product, 
        docs: product.docs || [], 
        specs: product.specs || [], 
        images: product.images || [product.image] 
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        name: '', description: '', price: 0, category: 'Batteries', 
        image: `https://picsum.photos/seed/${Math.random()}/600/600`, 
        images: [], stock: 0, features: [], docs: [], specs: [] 
      });
    }
    setIsModalOpen(true);
  };

  const addDocField = () => setFormData(prev => ({ ...prev, docs: [...(prev.docs || []), { title: '', url: '' }] }));
  const removeDocField = (index: number) => setFormData(prev => ({ ...prev, docs: (prev.docs || []).filter((_, i) => i !== index) }));
  const updateDocField = (index: number, field: keyof ProductDoc, value: string) => {
    const newDocs = [...(formData.docs || [])];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setFormData(prev => ({ ...prev, docs: newDocs }));
  };

  const addSpecField = () => setFormData(prev => ({ ...prev, specs: [...(prev.specs || []), { label: '', value: '' }] }));
  const removeSpecField = (index: number) => setFormData(prev => ({ ...prev, specs: (prev.specs || []).filter((_, i) => i !== index) }));
  const updateSpecField = (index: number, field: keyof ProductSpec, value: string) => {
    const newSpecs = [...(formData.specs || [])];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setFormData(prev => ({ ...prev, specs: newSpecs }));
  };

  const addImageField = () => setFormData(prev => ({ ...prev, images: [...(prev.images || []), ''] }));
  const removeImageField = (index: number) => setFormData(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
  const updateImageField = (index: number, value: string) => {
    const newImages = [...(formData.images || [])];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { 
      ...formData, 
      image: formData.images && formData.images.length > 0 ? formData.images[0] : formData.image 
    };
    if (editingProduct) { 
      updateProduct(finalData as Product); 
      addNotification('Product updated', 'success'); 
    } else { 
      addProduct(finalData as Omit<Product, 'id'>); 
      addNotification('Product added', 'success'); 
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="text-yellow-500" /> Admin Panel
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time statistics and stock management</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('products')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Products</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-yellow-50 text-yellow-600 w-fit mb-4"><DollarSign /></div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Value</div>
              <div className="text-2xl font-black text-slate-900">₴{stats.totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 w-fit mb-4"><Package /></div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total SKUs</div>
              <div className="text-2xl font-black text-slate-900">{products.length}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 w-fit mb-4"><Clock /></div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Low Stock</div>
              <div className="text-2xl font-black text-slate-900">{stats.lowStock}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="p-3 rounded-2xl bg-green-50 text-green-600 w-fit mb-4"><TrendingUp /></div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Conversion</div>
              <div className="text-2xl font-black text-slate-900">4.2%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-900 mb-8 flex items-center gap-2"><PieIcon className="text-yellow-500" size={20} /> Category Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.categoryDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {stats.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {stats.categoryDistribution.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    {c.name}: {c.value}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
               <Zap className="text-slate-100 mb-4" size={64} />
               <h3 className="text-xl font-black text-slate-900">AI Business Insights</h3>
               <p className="text-sm text-slate-500 max-w-xs mt-2">Based on your inventory, we recommend ordering more <strong>Batteries</strong>, as demand has increased by 25% in the last week.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-xl">
              <Package className="text-yellow-500" size={24} /> Product Management
            </h3>
            <button onClick={() => handleOpenModal()} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-yellow-100 flex items-center gap-2">
              <Plus size={18} /> Add Product
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="px-8 py-4">Item</th>
                  <th className="px-8 py-4">Category</th>
                  <th className="px-8 py-4">Price</th>
                  <th className="px-8 py-4">Stock</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                        <div className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-8 py-4"><span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{product.category}</span></td>
                    <td className="px-8 py-4 font-black text-slate-900 text-sm">₴{product.price.toLocaleString()}</td>
                    <td className="px-8 py-4">
                      <span className={`text-xs font-bold ${product.stock < 5 ? 'text-red-500' : 'text-slate-600'}`}>{product.stock} units</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Edit size={18} /></button>
                        <button onClick={() => { if(confirm('Delete product?')) deleteProduct(product.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-full hover:bg-white shadow-sm transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Name</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as Category})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none appearance-none focus:ring-2 focus:ring-yellow-400">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  required 
                  rows={5} 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 resize-y min-h-[120px]" 
                />
              </div>

              {/* Gallery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                    <ImagePlus size={14} /> Gallery
                  </label>
                  <button type="button" onClick={addImageField} className="text-[10px] font-black uppercase text-blue-600 hover:underline">+ Add Image URL</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(formData.images || []).map((img, i) => (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input placeholder="Image URL" value={img} onChange={(e) => updateImageField(i, e.target.value)} className="flex-1 text-xs bg-transparent outline-none" />
                      <button type="button" onClick={() => removeImageField(i)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* PDF Documents */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                    <FileText size={14} /> Documentation (PDF)
                  </label>
                  <button type="button" onClick={addDocField} className="text-[10px] font-black uppercase text-blue-600 hover:underline">+ Add PDF</button>
                </div>
                <div className="space-y-2">
                  {(formData.docs || []).map((doc, i) => (
                    <div key={i} className="flex gap-2">
                      <input 
                        placeholder="Title (e.g. Manual)" 
                        value={doc.title} 
                        onChange={(e) => updateDocField(i, 'title', e.target.value)} 
                        className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none" 
                      />
                      <input 
                        placeholder="URL link" 
                        value={doc.url} 
                        onChange={(e) => updateDocField(i, 'url', e.target.value)} 
                        className="flex-[2] text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none" 
                      />
                      <button type="button" onClick={() => removeDocField(i)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Price (₴)</label>
                  <input required type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Stock Units</label>
                  <input required type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
              </div>

              <div className="pt-4 flex gap-4 sticky bottom-0 bg-white py-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-[2] py-4 rounded-2xl bg-slate-900 text-white font-black text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShoppingCart, X, Loader2, Zap, List, Download, 
  Crown, Plus, Minus, Trash2, ShoppingBag, FileText,
  ChevronRight, ChevronLeft, PlusCircle, Info, ShieldCheck,
  Activity, PlusSquare
} from 'lucide-react';
import { Product, LocalizedText, Category, KitComponent } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop';

export const useLocalizedText = () => {
  const { language } = useLanguage();
  return useCallback((text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['en'] || "";
  }, [language]);
};

export const ProductCard: React.FC<{ 
  product: Product; 
  onSelect: (p: Product) => void; 
  onAddToCart: (e: React.MouseEvent, p: Product) => void; 
}> = React.memo(({ product, onSelect, onAddToCart }) => {
  const { formatPrice, t } = useLanguage();
  const getLoc = useLocalizedText();

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group bg-white rounded-[2rem] overflow-hidden cursor-pointer border border-slate-100 hover:border-emerald-400 transition-all duration-500 shadow-sm hover:shadow-xl flex flex-col h-full"
    >
      <div className="relative h-48 w-full p-6 flex items-center justify-center bg-slate-50/50">
        <img src={product.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110" alt={getLoc(product.name)} />
        <div className="absolute top-4 right-4 bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">{formatPrice(product.price)}</div>
        {product.is_leader && (
          <div className="absolute top-4 left-4 bg-amber-400 text-slate-900 text-[8px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
            <Crown size={10} /> {t('sales_leader')}
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 text-left">
        <span className="text-[8px] font-black text-emerald-500 uppercase mb-1">{product.category}</span>
        <h3 className="text-[12px] font-black uppercase text-slate-900 line-clamp-2 mb-4 leading-tight">{getLoc(product.name)}</h3>
        <button 
          onClick={(e) => onAddToCart(e, product)} 
          className="mt-auto w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all"
        >
          <ShoppingCart size={14}/> {t('add_to_cart')}
        </button>
      </div>
    </div>
  );
});

export const CatalogSection: React.FC = () => {
  const { t, formatPrice } = useLanguage();
  const getLoc = useLocalizedText();
  const { filteredProducts, products, categories, selectedCategory, setSelectedCategory, isLoading } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [kitComponents, setKitComponents] = useState<KitComponent[]>([]);
  const [selectedAddCat, setSelectedAddCat] = useState<Category | ''>('');
  const [selectedAddProdId, setSelectedAddProdId] = useState<string>('');

  const currentTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    if (selectedProduct.category !== 'Sæt' && selectedProduct.category !== 'Kits') return selectedProduct.price;
    return kitComponents.reduce((sum, c) => sum + (c.price * (c.quantity || 1)), 0);
  }, [selectedProduct, kitComponents]);

  const addableProducts = useMemo(() => {
    if (!selectedAddCat) return [];
    return products.filter(p => p.category === selectedAddCat && p.category !== 'Sæt' && p.category !== 'Kits');
  }, [selectedAddCat, products]);

  const safeParse = (input: any) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    try {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  };

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      if (selectedProduct.category === 'Sæt' || selectedProduct.category === 'Kits') {
        setKitComponents(Array.isArray(selectedProduct.kitComponents) ? selectedProduct.kitComponents : []);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedProduct]);

  const addNewComp = () => {
    const prod = products.find(p => p.id === selectedAddProdId);
    if (!prod) return;
    setKitComponents(prev => [...prev, { id: prod.id, name: getLoc(prod.name), price: prod.price, quantity: 1 }]);
    setSelectedAddProdId('');
    addNotification("Hardware integreret", "success");
  };

  const handleFinalAddToCart = () => {
    if (!selectedProduct) return;
    if (selectedProduct.category === 'Sæt' || selectedProduct.category === 'Kits') {
      addItem({ ...selectedProduct, price: currentTotal }, [...kitComponents]);
    } else {
      addItem(selectedProduct);
    }
    addNotification(t('item_added'), 'success');
    setSelectedProduct(null);
  };

  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  return (
    <div className="space-y-12">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 px-2">
        <button onClick={() => setSelectedCategory('All')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all shrink-0 ${selectedCategory === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'}`}>All Assets</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all shrink-0 ${selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'}`}>{cat}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 px-2">
        {filteredProducts.map((p) => (
          <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} onAddToCart={(e, prod) => { e.stopPropagation(); addItem(prod); addNotification(t('item_added'), 'success'); }} />
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center pt-[5vh] px-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-500 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setSelectedProduct(null)} />
          
          <div className={`relative bg-white w-full ${selectedProduct.category === 'Sæt' || selectedProduct.category === 'Kits' ? 'max-w-6xl' : 'max-w-5xl'} rounded-[3rem] shadow-2xl flex flex-col mb-10 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 min-h-0`}>
            
            {/* Modal Header */}
            <div className="px-6 md:px-10 py-5 md:py-6 border-b flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-600/20"><Zap size={22} /></div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black uppercase tracking-tight leading-none">{getLoc(selectedProduct.name)}</h2>
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready to Ship
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedProduct.category} • Certified Asset</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400"><X size={32} /></button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 md:p-12">
              {selectedProduct.category === 'Sæt' || selectedProduct.category === 'Kits' ? (
                /* --- KIT ARCHITECT VIEW --- */
                <div className="space-y-10">
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-5 text-left">
                      <PlusCircle className="text-emerald-400" size={24} />
                      <h3 className="text-[11px] font-black uppercase tracking-[0.2em]">Hardware Integration</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 text-left">
                      <select value={selectedAddCat} onChange={e => setSelectedAddCat(e.target.value as Category)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-white outline-none focus:border-emerald-400">
                         <option value="" className="text-slate-900">Vælg Kategori...</option>
                         {categories.filter(c => c !== 'Sæt' && c !== 'Kits').map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                      </select>
                      <select disabled={!selectedAddCat} value={selectedAddProdId} onChange={e => setSelectedAddProdId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-white outline-none focus:border-emerald-400 disabled:opacity-20">
                         <option value="" className="text-slate-900">Vælg hardware...</option>
                         {addableProducts.map(p => <option key={p.id} value={p.id} className="text-slate-900">{getLoc(p.name)} ({formatPrice(p.price)})</option>)}
                      </select>
                      <button onClick={addNewComp} disabled={!selectedAddProdId} className="bg-emerald-500 hover:bg-emerald-400 py-4.5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20">
                        <PlusSquare size={18}/> Integrer
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {kitComponents.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm hover:border-emerald-200 transition-all">
                        <div className="text-left">
                          <p className="text-[12px] font-black uppercase text-slate-900">{item.name}</p>
                          <p className="text-[10px] font-bold text-emerald-600 mt-1">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 border">
                             <button onClick={() => { const u = [...kitComponents]; u[idx].quantity = Math.max(1, (u[idx].quantity || 1) - 1); setKitComponents(u); }} className="p-1 hover:text-emerald-500 text-slate-400"><Minus size={14}/></button>
                             <span className="text-[12px] font-black w-6 text-center">{item.quantity || 1}</span>
                             <button onClick={() => { const u = [...kitComponents]; u[idx].quantity = (u[idx].quantity || 1) + 1; setKitComponents(u); }} className="p-1 hover:text-emerald-500 text-slate-400"><Plus size={14}/></button>
                           </div>
                           <button onClick={() => setKitComponents(kitComponents.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={22}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* --- PRODUCT MODAL --- */
                <div className="flex flex-col space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-5">
                      <div className="aspect-square bg-slate-50 rounded-[3rem] p-10 flex items-center justify-center border border-slate-100 relative shadow-inner">
                        <img src={selectedProduct.image || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain drop-shadow-3xl" alt="" />
                      </div>
                    </div>
                    
                    <div className="lg:col-span-7 space-y-6 text-left">
                       <div className="bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100/50">
                          <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2 mb-4">
                            <ShieldCheck size={16}/> Quick Status
                          </h4>
                          <div className="flex flex-wrap gap-8">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Availability</span>
                                <span className="text-sm font-black text-slate-900 uppercase">Ready for Dispatch</span>
                             </div>
                             <div className="flex flex-col border-l border-emerald-200 pl-8">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warranty</span>
                                <span className="text-sm font-black text-slate-900 uppercase">10-15 Years</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-left border-t border-slate-100 pt-8">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
                      <Info size={18} /> Asset Overview
                    </h4>
                    <div className="max-h-[140px] overflow-y-auto pr-4 custom-scrollbar">
                      <p className="text-base font-medium text-slate-600 leading-relaxed italic">
                        {getLoc(selectedProduct.description)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left border-t border-slate-100 pt-8">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <List size={18} className="text-emerald-500" /> Technical Metrics
                      </h4>
                      <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        {safeParse(selectedProduct.specs).length > 0 ? safeParse(selectedProduct.specs).map((s: any, i: number) => (
                          <div key={i} className="flex justify-between p-4 text-[10px] border-b border-white last:border-0 hover:bg-white transition-all">
                            <span className="font-black text-slate-400 uppercase tracking-tighter">{s.label}</span>
                            <span className="font-bold text-slate-900">{s.value}</span>
                          </div>
                        )) : <p className="p-8 text-[9px] font-bold text-slate-300 uppercase italic text-center">Specifications loading...</p>}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <FileText size={18} className="text-emerald-500" /> Documentation (PDF)
                      </h4>
                      <div className="space-y-3">
                        {safeParse(selectedProduct.docs).length > 0 ? safeParse(selectedProduct.docs).map((doc: any, i: number) => (
                          <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500 hover:shadow-xl transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                              <Download size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-black uppercase text-slate-900 truncate max-w-[200px]">{doc.title || 'Technical Manual'}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                          </a>
                        )) : (
                          <div className="p-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                            <p className="text-[9px] font-black text-slate-300 uppercase">No Data Sheets available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-10 bg-slate-900 flex items-center justify-between shadow-3xl border-t border-white/5 shrink-0 rounded-b-[3rem]">
              <div className="flex flex-col text-white text-left">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1.5">Samlet værdi</span>
                <span className="text-4xl font-black text-emerald-400 tracking-tighter">{formatPrice(currentTotal)}</span>
              </div>
              <button onClick={handleFinalAddToCart} className="px-14 py-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-lg flex items-center gap-4 active:scale-95 transition-all">
                <ShoppingBag size={24} /> {selectedProduct.category === 'Sæt' || selectedProduct.category === 'Kits' ? 'Godkend' : t('add_to_cart')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCompare } from '../../contexts/CompareContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  ShoppingCart, X, Heart, Loader2, Zap, 
  Sparkles, Scale, Layers, ChevronLeft, ChevronRight, Info, List, FileText, ExternalLink,
  Truck, CreditCard, ShieldCheck, Box, Package
} from 'lucide-react';
import { Product, ProductSpec, ProductDoc } from '../../types';

const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop';

interface ProductCardProps {
  product: Product;
  index: number;
  onSelect: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, onSelect, onAddToCart }) => {
  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images.filter(img => img && img.trim() !== '') 
    : [product.image].filter(img => img && img.trim() !== '');
    
  const displayImage = images[0] || IMAGE_FALLBACK;

  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  
  const isReserved = isInWishlist(product.id);
  const isComparing = isInCompare(product.id);

  const formatPrice = (price: any) => {
    if (price === null || price === undefined) return '0';
    const num = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(num)) return '0';
    try {
      return num.toLocaleString('uk-UA');
    } catch (e) {
      return num.toString();
    }
  };

  return (
    <div 
      onClick={() => onSelect(product)}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group premium-card overflow-hidden cursor-pointer flex flex-col h-full animate-fade-in relative border border-slate-200/50"
    >
      <div className="relative h-52 w-full overflow-hidden bg-slate-50/50 p-2 flex items-center justify-center">
        <img 
          src={displayImage} 
          alt={product.name || 'Обладнання'}
          className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }}
        />
        
        <div className="absolute top-3 right-3 z-20">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-2xl border border-white/10 flex items-center justify-center">
            <span className="text-[11px] font-black tracking-tighter">₴{formatPrice(product.price)}</span>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.is_new && (
            <span className="bg-yellow-400 text-yellow-950 text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg">New</span>
          )}
          {product.on_sale && (
            <span className="bg-red-500 text-white text-[7px] font-black uppercase px-2 py-1 rounded-md shadow-lg">Sale</span>
          )}
        </div>

        <div className="absolute top-12 left-3 flex flex-col gap-2 -translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
            className={`p-2 rounded-lg shadow-lg transition-all active:scale-90 ${
              isReserved ? 'bg-red-500 text-white' : 'bg-white text-slate-400 hover:text-red-500'
            }`}
          >
            <Heart size={12} fill={isReserved ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
            className={`p-2 rounded-lg shadow-lg transition-all active:scale-90 ${
              isComparing ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600'
            }`}
          >
            <Scale size={12} />
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 bg-white">
        <div className="text-[8px] font-black text-yellow-600 uppercase tracking-widest mb-1">{product.category}</div>
        <h3 className="font-bold text-slate-800 text-[10px] leading-tight group-hover:text-yellow-600 transition-colors line-clamp-2 uppercase tracking-tight mb-4">{product.name}</h3>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
             <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
             <span className="text-[7px] font-black text-slate-400 uppercase">Склад</span>
          </div>
          <button 
            disabled={product.stock === 0}
            onClick={(e) => onAddToCart(e, product)}
            className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 p-2.5 rounded-lg transition-all shadow-xl active:scale-90"
          >
            <ShoppingCart size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogSection: React.FC<{ onSelectSystem?: () => void }> = ({ onSelectSystem }) => {
  const { filteredProducts, categories, selectedCategory, setSelectedCategory, isLoading } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
      setActiveImageIdx(0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct]);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectKits = () => {
    setSelectedCategory('Kits');
    setTimeout(scrollToProducts, 100);
  };

  const formatPrice = (price: any) => {
    if (price === null || price === undefined) return '0';
    const num = typeof price === 'number' ? price : parseFloat(price);
    if (isNaN(num)) return '0';
    try {
      return num.toLocaleString('uk-UA');
    } catch (e) {
      return num.toString();
    }
  };

  const parseSpecs = (specsStr: string | null | undefined): ProductSpec[] => {
    if (!specsStr) return [];
    try {
      const parsed = typeof specsStr === 'string' ? JSON.parse(specsStr) : specsStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseDocs = (docsStr: string | null | undefined): ProductDoc[] => {
    if (!docsStr) return [];
    try {
      const parsed = typeof docsStr === 'string' ? JSON.parse(docsStr) : docsStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-60 space-y-8">
        <Loader2 className="text-yellow-400 animate-spin" size={60} />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">Завантаження...</p>
      </div>
    );
  }

  const productImages = selectedProduct && Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0 
    ? selectedProduct.images.filter(img => img && img.trim() !== '') 
    : (selectedProduct?.image ? [selectedProduct.image] : [IMAGE_FALLBACK]);

  const filteredSpecs = selectedProduct ? parseSpecs(selectedProduct.specs).filter(s => s.label?.trim() && s.value?.trim()) : [];
  const filteredDocs = selectedProduct ? parseDocs(selectedProduct.docs).filter(d => d.title?.trim() && d.url?.trim()) : [];

  return (
    <div className="space-y-24">
      <div className="relative rounded-[4rem] bg-white overflow-hidden min-h-[550px] flex items-center shadow-[0_32px_120px_-20px_rgba(0,0,0,0.05)] border border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2000&auto=format&fit=crop" 
          className="absolute right-0 top-0 w-3/4 h-full object-cover animate-slow-zoom opacity-10" 
          alt="Energy" 
        />
        
        <div className="relative z-20 px-12 md:px-24 max-w-4xl py-20">
          <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest mb-10 shadow-xl">
            <Sparkles size={14} className="text-yellow-400" /> Твоя енергонезалежність
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-10 leading-[0.85] tracking-tighter uppercase">
            ENERGY <br/>
            <span className="text-yellow-500 italic">SYSTEMS</span>
          </h1>
          
          <div className="flex flex-wrap gap-6">
            <button onClick={onSelectSystem} className="btn-action bg-slate-900 text-white hover:bg-yellow-400 hover:text-slate-900 group">
              AI ARCHITECT <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
            <button onClick={handleSelectKits} className="px-10 py-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-black text-[11px] uppercase tracking-widest hover:bg-white hover:shadow-xl transition-all">
              ГОТОВІ КОМПЛЕКТИ <Layers size={18} className="ml-3 inline-block text-yellow-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div ref={productsRef} className="flex items-center justify-between border-b border-slate-200 pb-8 scroll-mt-32">
           <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            <button onClick={() => setSelectedCategory('All')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === 'All' ? 'bg-slate-900 text-white shadow-xl translate-y-[-4px]' : 'bg-white text-slate-400 border border-slate-100'}`}>Всі товари</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl translate-y-[-4px]' : 'bg-white text-slate-400 border border-slate-100'}`}>{cat}</button>
            ))}
          </div>
          <div className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filteredProducts.length} товарів знайдено
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredProducts.map((p, idx) => (
            <ProductCard key={p.id} product={p} index={idx} onSelect={setSelectedProduct} onAddToCart={(e, p) => { e.stopPropagation(); addItem(p); addNotification('Товар додано', 'success'); }} />
          ))}
        </div>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-3xl border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-2 rounded-xl">
                  <Zap size={18} className="text-yellow-400" />
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedProduct.name}</h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {/* Image & Buy Module side-by-side */}
              <div className="flex flex-col lg:flex-row gap-10 mb-12">
                
                {/* Left: Image Gallery */}
                <div className="lg:w-[58%] space-y-4">
                  <div className="aspect-video bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 relative group/img p-6 flex items-center justify-center">
                    <img src={productImages[activeImageIdx] || IMAGE_FALLBACK} className="max-w-full max-h-full object-contain" alt="" onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_FALLBACK; }} />
                    {productImages.length > 1 && (
                      <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <button onClick={() => setActiveImageIdx(prev => (prev > 0 ? prev - 1 : productImages.length - 1))} className="p-2 bg-white/80 rounded-xl shadow-md"><ChevronLeft size={18}/></button>
                        <button onClick={() => setActiveImageIdx(prev => (prev < productImages.length - 1 ? prev + 1 : 0))} className="p-2 bg-white/80 rounded-xl shadow-md"><ChevronRight size={18}/></button>
                      </div>
                    )}
                  </div>
                  {productImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center">
                      {productImages.map((img, i) => (
                        <button key={i} onClick={() => setActiveImageIdx(i)} className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 p-1 bg-slate-50 ${activeImageIdx === i ? 'border-yellow-400' : 'border-transparent opacity-60'}`}>
                          <img src={img || IMAGE_FALLBACK} className="w-full h-full object-contain" alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Buy Box (Top Right position relative to frame) */}
                <div className="lg:w-[42%] flex flex-col gap-6">
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-100 p-8 flex flex-col gap-6 shadow-sm">
                    {/* Identification */}
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-tight mb-2">{selectedProduct.name}</h3>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Артикул: {selectedProduct.id?.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">EAN: 5905515{Math.floor(100000 + Math.random() * 900000)}</span>
                      </div>
                    </div>

                    {/* Pricing Block */}
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                        {formatPrice(Math.round(selectedProduct.price / 1.2))} ₴ <span className="text-[8px] opacity-60 font-black">ex VAT</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 tracking-tighter">
                        {formatPrice(selectedProduct.price)} ₴ <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">inc VAT</span>
                      </div>
                    </div>

                    {/* Industrial Details: Stock and Delivery */}
                    <div className="space-y-4 py-6 border-y border-slate-200/60">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Наявність:</span>
                         <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">11-20 шт</span>
                         </div>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4">
                         <div className="shrink-0 p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Truck size={16} />
                         </div>
                         <div className="flex-1">
                            <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Доставка</div>
                            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                               {new Date(Date.now() + 86400000 * 3).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <div className="text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-widest flex items-center gap-1">₴0.00 • Безкоштовно</div>
                         </div>
                      </div>
                      <button className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors text-left">Розрахувати вартість доставки</button>
                    </div>

                    {/* Interactive Buy Block */}
                    <div className="flex gap-3">
                      <div className="w-16 h-14 bg-white rounded-xl border border-slate-200 flex items-center justify-center font-black text-sm shadow-inner">1</div>
                      <button 
                        disabled={selectedProduct.stock === 0}
                        onClick={() => { addItem(selectedProduct); addNotification('Товар додано', 'success'); }}
                        className="flex-1 bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 group"
                      >
                        <ShoppingCart size={18} className="group-hover:rotate-12 transition-transform" /> 
                        Додати в кошик
                      </button>
                    </div>

                    {/* Trust/Methods Badges */}
                    <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-100/50">
                      <div className="flex flex-col items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                         <CreditCard size={16} />
                         <span className="text-[7px] font-black uppercase tracking-tighter">Оплата</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                         <Package size={16} />
                         <span className="text-[7px] font-black uppercase tracking-tighter">UPS / FedEx</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                         <ShieldCheck size={16} />
                         <span className="text-[7px] font-black uppercase tracking-tighter">10р Гарантія</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">Закрити</button>
                </div>
              </div>

              {/* Lower Section: Industrial Specs and Docs */}
              <div className="max-w-4xl space-y-16 pb-20">
                {selectedProduct.description && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Info size={16} className="text-yellow-500" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Про продукт</h4>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                  </div>
                )}

                {filteredSpecs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <List size={16} className="text-yellow-500" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Технічні характеристики</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                      {filteredSpecs.map((spec, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-50 py-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{spec.label}</span>
                          <span className="text-[10px] font-bold text-slate-800 uppercase text-right">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredDocs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText size={16} className="text-yellow-500" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Файли та інструкції</h4>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {filteredDocs.map((doc, idx) => (
                        <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-yellow-400 transition-all group shadow-sm">
                          <div className="bg-white p-2 rounded-lg group-hover:bg-yellow-400 transition-colors shadow-sm">
                            <FileText size={16} className="text-slate-400 group-hover:text-yellow-900" />
                          </div>
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight group-hover:text-slate-900">{doc.title}</span>
                          <ExternalLink size={12} className="text-slate-300" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCompare } from '../../contexts/CompareContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ShoppingCart, X, Heart, Loader2, Zap, 
  Sparkles, Scale, Layers, ChevronLeft, ChevronRight, Info, List, 
  Truck, Clock, FileText, Download, Leaf, Crown, ArrowRight
} from 'lucide-react';
import { Product, ProductSpec, ProductDoc, LocalizedText, AppView } from '../../types';

// Reliable image fallback
const IMAGE_FALLBACK = 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?q=80&w=600&auto=format&fit=crop';

export const useLocalizedText = () => {
  const { language } = useLanguage();
  return (text: LocalizedText | null | undefined): string => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    return (text as any)[language] || (text as any)['en'] || Object.values(text as any)[0] || "";
  };
};

export interface ProductCardProps {
  product: Product;
  index: number;
  onSelect: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, index, onSelect, onAddToCart }) => {
  const { t, formatPrice } = useLanguage();
  const getLoc = useLocalizedText();
  
  const getDisplayImage = () => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      const firstValid = product.images.find(img => img && typeof img === 'string' && img.trim() !== '');
      if (firstValid) return firstValid;
    }
    if (product.image && typeof product.image === 'string' && product.image.trim() !== '') return product.image;
    return IMAGE_FALLBACK;
  };

  const [displayImage, setDisplayImage] = useState(getDisplayImage());
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  
  const isReserved = isInWishlist(product.id);
  const isComparing = isInCompare(product.id);
  const isInactive = product.is_active === false || product.stock === 0;
  const productNameStr = getLoc(product.name);

  useEffect(() => {
    setDisplayImage(getDisplayImage());
  }, [product]);

  return (
    <div 
      onClick={() => onSelect(product)}
      style={{ animationDelay: `${index * 50}ms` }}
      className={`group premium-card overflow-hidden cursor-pointer flex flex-col h-full animate-fade-in relative border transition-all duration-500 ${product.is_leader ? 'border-amber-400 shadow-[0_10px_40px_rgba(251,191,36,0.1)]' : 'border-slate-200/50 hover:border-emerald-400'}`}
    >
      <div className="relative h-56 w-full overflow-hidden bg-slate-50/50 p-6 flex items-center justify-center">
        <img 
          src={displayImage} 
          alt={productNameStr}
          className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-110 drop-shadow-lg"
          onError={() => { setDisplayImage(IMAGE_FALLBACK); }}
          loading="lazy"
        />
        
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-center">
            <span className="text-[12px] font-black tracking-tighter tabular-nums">{formatPrice(product.price)}</span>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {product.is_leader && (
            <span className="bg-amber-400 text-yellow-950 text-[8px] font-black uppercase px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5">
              <Crown size={10} className="fill-yellow-950" /> {t('sales_leader')}
            </span>
          )}
          {product.is_new && (
            <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-lg shadow-lg">New</span>
          )}
          {isInactive && (
            <span className="bg-amber-500 text-white text-[8px] font-black uppercase px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1.5">
              <Clock size={10} /> {product.is_active === false ? 'Замовлення' : t('out_of_stock')}
            </span>
          )}
        </div>

        <div className="absolute top-16 left-4 flex flex-col gap-2 -translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
            className={`p-3 rounded-xl shadow-lg transition-all active:scale-90 ${
              isReserved ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:text-rose-500'
            }`}
          >
            <Heart size={14} fill={isReserved ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCompare(product); }}
            className={`p-3 rounded-xl shadow-lg transition-all active:scale-90 ${
              isComparing ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 hover:text-emerald-600'
            }`}
          >
            <Scale size={14} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 bg-white">
        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">{product.category}</div>
        <h3 className="font-black text-slate-800 text-[11px] leading-tight group-hover:text-emerald-600 transition-colors line-clamp-2 uppercase tracking-tight mb-5">{productNameStr}</h3>
        
        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isInactive ? 'bg-amber-500' : 'bg-emerald-500'} shadow-sm`}></div>
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
               {isInactive ? 'Спецзамовлення' : 'В наявності'}
             </span>
          </div>
          <button 
            onClick={(e) => onAddToCart(e, product)}
            className={`px-4 py-3 rounded-xl transition-all shadow-xl active:scale-90 flex items-center gap-2 border-2 ${
              isInactive 
                ? 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' 
                : 'border-slate-900 bg-slate-900 text-white hover:bg-emerald-500 hover:border-emerald-500'
            }`}
          >
            {isInactive ? <ArrowRight size={14} /> : <ShoppingCart size={14} />}
            <span className="text-[9px] font-black uppercase tracking-widest">{isInactive ? 'Замовити' : t('add_to_cart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogSection: React.FC<{ onSelectSystem?: () => void }> = ({ onSelectSystem }) => {
  const { t, formatPrice } = useLanguage();
  const getLoc = useLocalizedText();
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

  const parseJsonData = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try { return typeof data === 'string' ? JSON.parse(data) : []; } catch { return []; }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-60 space-y-8">
        <Loader2 className="text-emerald-500 animate-spin" size={60} />
      </div>
    );
  }

  const productImages = selectedProduct 
    ? (Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0
        ? selectedProduct.images.filter(img => img && typeof img === 'string' && img.trim() !== '')
        : (selectedProduct.image && typeof selectedProduct.image === 'string' && selectedProduct.image.trim() !== '' ? [selectedProduct.image] : [IMAGE_FALLBACK]))
    : [IMAGE_FALLBACK];

  const filteredSpecs = selectedProduct ? parseJsonData(selectedProduct.specs) : [];
  const productDocs = selectedProduct ? parseJsonData(selectedProduct.docs) : [];
  const isSelectedInactive = selectedProduct ? (selectedProduct.stock === 0 || selectedProduct.stock === null || selectedProduct.is_active === false) : false;
  const selectedProductNameStr = selectedProduct ? getLoc(selectedProduct.name) : "";

  return (
    <div className="space-y-20">
      {/* Search & Filter Header */}
      <div ref={productsRef} className="flex flex-col md:flex-row items-center justify-between border-b border-slate-200 pb-10 scroll-mt-32 gap-8">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide w-full md:w-auto px-4 md:px-0">
          <button 
            onClick={() => setSelectedCategory('All')} 
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedCategory === 'All' ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-500 hover:text-emerald-600'}`}
          >
            Всі Активи
          </button>
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)} 
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${selectedCategory === cat ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-500 hover:text-emerald-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">
          Знайдено <span className="text-slate-900">{filteredProducts.length}</span> позицій
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 md:px-0">
        {filteredProducts.map((p, idx) => (
          <ProductCard 
            key={p.id} 
            product={p} 
            index={idx} 
            onSelect={setSelectedProduct} 
            onAddToCart={(e, prod) => {
              e.stopPropagation();
              addItem(prod);
              addNotification(t('item_added'), 'success');
            }} 
          />
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-slate-900/40 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-3xl border border-white flex flex-col my-auto max-h-[95vh] overflow-hidden">
            
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2.5 rounded-2xl text-white shadow-lg">
                  <Zap size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">{selectedProductNameStr}</h2>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-12">
              <div className="flex flex-col lg:flex-row gap-12 mb-16">
                <div className="lg:w-[55%] space-y-6">
                  <div className="aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 relative group/img p-10 flex items-center justify-center">
                    <img 
                      src={productImages[activeImageIdx] || IMAGE_FALLBACK} 
                      className="max-w-full max-h-full object-contain" 
                      alt={selectedProductNameStr} 
                    />
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {productImages.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-24 h-24 rounded-2xl overflow-hidden border-2 shrink-0 transition-all ${activeImageIdx === idx ? 'border-emerald-500 scale-95 shadow-md' : 'border-slate-100 opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img || IMAGE_FALLBACK} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:w-[45%] flex flex-col gap-8">
                  <div className="bg-slate-50/50 rounded-[3rem] border border-slate-100 p-10 flex flex-col gap-8 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {selectedProduct.is_leader && (
                          <span className="bg-amber-400 text-yellow-950 text-[9px] font-black uppercase px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                            <Crown size={12} className="fill-yellow-950" /> {t('sales_leader')}
                          </span>
                        )}
                        {selectedProduct.is_new && (
                          <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-lg">New</span>
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter leading-tight">{selectedProductNameStr}</h3>
                    </div>

                    <div className="text-4xl font-black text-slate-900 tracking-tighter">
                      {formatPrice(selectedProduct.price)}
                    </div>

                    <div className="py-6 border-y border-slate-200/60 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Наявність:</span>
                         <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isSelectedInactive ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            <span className="text-[11px] font-black text-slate-900 uppercase">
                              {isSelectedInactive ? 'Спецзамовлення' : 'В наявності'}
                            </span>
                         </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => { addItem(selectedProduct); addNotification(t('item_added'), 'success'); }}
                      className={`w-full rounded-2xl font-black text-[12px] uppercase tracking-widest py-6 flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 ${isSelectedInactive ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-emerald-600 text-white'}`}
                    >
                      {isSelectedInactive ? <ArrowRight size={22} /> : <ShoppingCart size={22} />} 
                      {isSelectedInactive ? 'Замовити Активацію' : t('add_to_cart')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-16 pb-20">
                {selectedProduct.description && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
                      <Info size={20} className="text-emerald-500" />
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Опис Продукту</h4>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed font-medium">{getLoc(selectedProduct.description)}</p>
                  </div>
                )}

                {filteredSpecs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
                      <List size={20} className="text-emerald-500" />
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Технічні Специфікації</h4>
                    </div>
                    <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                      <table className="w-full">
                        <tbody className="divide-y divide-slate-100">
                          {filteredSpecs.map((spec: ProductSpec, i: number) => (
                            <tr key={i} className="hover:bg-white transition-colors">
                              <td className="p-5 text-[10px] font-black text-slate-400 uppercase w-1/3">{spec.label}</td>
                              <td className="p-5 text-[11px] font-bold text-slate-900">{spec.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {productDocs.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4">
                      <FileText size={20} className="text-emerald-500" />
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Файли для завантаження</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {productDocs.map((doc: ProductDoc, i: number) => (
                        <a 
                          key={i} 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-emerald-500 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <Download size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black text-slate-900 uppercase">{doc.title}</span>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500" />
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
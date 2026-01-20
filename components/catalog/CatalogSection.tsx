
import React, { useState, useEffect, useRef } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCompare } from '../../contexts/CompareContext';
import { useNotification } from '../../contexts/NotificationContext';
// Fix: Added missing Package icon import
import { 
  Star, ShoppingCart, X, Heart, Loader2, Zap, 
  Sparkles, Scale, Layers, ArrowRight, Package 
} from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  index: number;
  onSelect: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index, onSelect, onAddToCart }) => {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  
  const isReserved = isInWishlist(product.id);
  const isComparing = isInCompare(product.id);

  return (
    <div 
      onClick={() => onSelect(product)}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-yellow-400 transition-all duration-500 cursor-pointer flex flex-col h-full animate-fade-in relative z-10"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
        <img 
          src={images[0]} 
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110"
        />
        
        <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span className="bg-yellow-400 text-yellow-950 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-lg">New</span>
          )}
          {product.onSale && (
            <span className="bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-lg">Sale</span>
          )}
        </div>

        <div className="absolute top-5 right-5 flex flex-col gap-2 z-10 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className={`p-3 rounded-2xl shadow-lg transition-all active:scale-90 ${
              isReserved ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-400 hover:text-red-500 backdrop-blur-md border border-slate-100'
            }`}
          >
            <Heart size={16} fill={isReserved ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            className={`p-3 rounded-2xl shadow-lg transition-all active:scale-90 ${
              isComparing ? 'bg-blue-500 text-white' : 'bg-white/80 text-slate-400 hover:text-blue-500 backdrop-blur-md border border-slate-100'
            }`}
          >
            <Scale size={16} />
          </button>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-1">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{product.category}</div>
        <h3 className="font-bold text-slate-800 mb-4 text-sm leading-tight group-hover:text-yellow-600 transition-colors line-clamp-2 uppercase tracking-tight">{product.name}</h3>
        
        <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tighter">₴{product.price.toLocaleString()}</span>
          </div>
          <button 
            disabled={product.stock === 0}
            onClick={(e) => onAddToCart(e, product)}
            className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 p-4 rounded-2xl transition-all shadow-lg active:scale-90"
          >
            <ShoppingCart size={20} />
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
  const productsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProduct) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct]);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectKits = () => {
    setSelectedCategory('Kits');
    setTimeout(scrollToProducts, 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-60 space-y-6">
        <Loader2 className="text-yellow-500 animate-spin" size={60} />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Data...</p>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="relative mb-20 rounded-[4rem] bg-slate-100 overflow-hidden min-h-[500px] flex items-center shadow-2xl border border-white">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent z-10"></div>
          <div className="absolute top-0 right-0 w-3/4 h-full bg-cover bg-center opacity-80" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2000&auto=format&fit=crop')" }}></div>
          <div className="relative z-20 px-12 md:px-24 max-w-4xl py-16">
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 leading-[0.85] tracking-tighter uppercase">VOLT <br/><span className="text-yellow-500 italic">STORE</span></h1>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={onSelectSystem} 
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-2xl flex items-center gap-3 group"
              >
                AI Architect <Sparkles size={18} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
              </button>
              
              <button 
                onClick={handleSelectKits} 
                className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-xl border border-slate-100 flex items-center gap-3 group"
              >
                Готові Комплекти <Layers size={18} className="text-yellow-500 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div ref={productsRef} className="flex gap-3 overflow-x-auto pb-8 scrollbar-hide scroll-mt-24">
          <button onClick={() => setSelectedCategory('All')} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCategory === 'All' ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-xl' : 'bg-white text-slate-400 border-slate-200'}`}>All Assets</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCategory === cat ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-xl' : 'bg-white text-slate-400 border-slate-200'}`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredProducts.map((p, idx) => (
            <ProductCard key={p.id} product={p} index={idx} onSelect={setSelectedProduct} onAddToCart={(e, p) => { e.stopPropagation(); addItem(p); addNotification('Товар додано', 'success'); }} />
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Package size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Товари в цій категорії відсутні</p>
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-900/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:grid md:grid-cols-2 min-h-[500px] max-h-full border border-white my-auto">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-6 right-6 z-[1001] p-3 bg-white text-slate-950 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all border border-slate-100 shadow-xl"
            >
              <X size={24}/>
            </button>
            
            <div className="bg-slate-50 p-8 md:p-12 flex items-center justify-center overflow-hidden border-r border-slate-100">
              <img src={selectedProduct.image} className="max-w-full h-auto rounded-3xl shadow-xl" alt="" />
            </div>

            <div className="p-8 md:p-12 flex flex-col bg-white overflow-y-auto max-h-[80vh] md:max-h-full custom-scrollbar">
              <div className="text-[10px] font-black uppercase text-yellow-600 tracking-[0.4em] mb-4">{selectedProduct.category}</div>
              <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight uppercase tracking-tight">{selectedProduct.name}</h2>
              
              <div className="space-y-10 flex-1">
                <p className="text-sm text-slate-500 leading-relaxed font-medium">{selectedProduct.description}</p>
                
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Особливості:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedProduct.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-10 border-t border-slate-100 flex items-center justify-between gap-8 shrink-0">
                <div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Вартість:</div>
                  <div className="text-3xl font-black text-slate-900 tracking-tighter">₴{selectedProduct.price.toLocaleString()}</div>
                </div>
                <button 
                  disabled={selectedProduct.stock === 0}
                  onClick={() => { addItem(selectedProduct); setSelectedProduct(null); addNotification('Товар додано до кошика', 'success'); }}
                  className="flex-1 bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95"
                >
                  {selectedProduct.stock > 0 ? 'Замовити зараз' : 'Немає в наявності'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

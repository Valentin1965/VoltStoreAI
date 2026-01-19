
import React, { useState, useEffect } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Star, ShoppingCart, X, Heart, Loader2, CheckCircle2, AlertCircle, Zap, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';
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
  const isFavorite = isInWishlist(product.id);
  const isLowStock = product.stock > 0 && product.stock < 5;

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

        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-5 right-5 p-3 rounded-2xl shadow-lg z-10 transition-all active:scale-90 ${
            isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-400 hover:text-red-500 backdrop-blur-md border border-slate-100'
          }`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <div className="absolute bottom-5 left-5 right-5 bg-white/90 backdrop-blur-xl border border-slate-100 p-4 rounded-2xl flex items-center justify-between opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
           <span className="text-sm font-black text-slate-900">₴{product.price.toLocaleString()}</span>
           <div className="flex items-center gap-1.5">
             <Star className="text-yellow-500 fill-yellow-500" size={14} />
             <span className="text-xs font-black text-slate-900">{product.rating}</span>
           </div>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-1">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{product.category}</div>
        <h3 className="font-bold text-slate-800 mb-4 text-sm leading-tight group-hover:text-yellow-600 transition-colors line-clamp-2">{product.name}</h3>
        
        <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tighter">₴{product.price.toLocaleString()}</span>
            <div className="flex items-center gap-2 mt-1.5">
              {product.stock > 0 ? (
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isLowStock ? 'text-orange-500' : 'text-green-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                  {isLowStock ? `Limit: ${product.stock}` : 'Available'}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-300 tracking-widest">
                  <X size={12} /> Out of Stock
                </div>
              )}
            </div>
          </div>
          <button 
            disabled={product.stock === 0}
            onClick={(e) => onAddToCart(e, product)}
            className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 p-4 rounded-2xl transition-all shadow-lg shadow-slate-200 disabled:opacity-20 active:scale-90"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CatalogSectionProps {
  onSelectSystem?: () => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({ onSelectSystem }) => {
  const { filteredProducts, categories, selectedCategory, setSelectedCategory, isLoading } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [visitorCount, setVisitorCount] = useState(142);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount(prev => prev + (Math.random() > 0.5 ? 2 : -1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="relative mb-20 rounded-[4rem] bg-slate-100 overflow-hidden min-h-[550px] flex items-center group shadow-2xl border border-white">
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent z-10"></div>
          <div 
            className="absolute top-0 right-0 w-3/4 h-full bg-cover bg-center opacity-90 transition-transform duration-[30s]"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2000&auto=format&fit=crop')" }}
          ></div>
          
          <div className="relative z-20 px-12 md:px-24 max-w-3xl py-16">
            <div className="inline-flex items-center gap-2.5 bg-yellow-400 text-yellow-950 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-lg shadow-yellow-400/20">
              <Sparkles size={16} className="fill-current" /> Energy Solutions 2025
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 leading-[0.85] tracking-tighter uppercase">
              Clean <br/> <span className="text-yellow-500 italic">Future.</span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg font-medium mb-12 leading-relaxed max-w-xl">
              Reliable energy systems for your home and business. Quality proven by time and future technologies.
            </p>
            
            <div className="flex flex-wrap gap-6 items-center">
              <button 
                onClick={onSelectSystem}
                className="bg-slate-900 text-white px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-yellow-400 hover:text-yellow-950 transition-all active:scale-95 shadow-2xl shadow-slate-900/10"
              >
                Start Configuration
              </button>
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-2xl px-7 py-5 rounded-2xl border border-white shadow-xl">
                <div className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 font-black text-base leading-none">{visitorCount}</span>
                  <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">Clients Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide max-w-full">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
                selectedCategory === 'All' 
                ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-xl shadow-yellow-400/20' 
                : 'bg-white text-slate-400 border-slate-200 hover:border-yellow-400 hover:text-slate-900'
              }`}
            >
              All Assets
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
                  selectedCategory === cat 
                  ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-xl shadow-yellow-400/20' 
                  : 'bg-white text-slate-400 border-slate-200 hover:border-yellow-400 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-4 bg-white px-7 py-4 rounded-2xl border border-slate-100 shadow-sm">
            <TrendingUp size={18} className="text-yellow-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Available Units: <span className="text-slate-900 ml-1">{filteredProducts.length}</span>
            </span>
          </div>
        </div>

        {/* Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {filteredProducts.map((p, idx) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                index={idx}
                onSelect={setSelectedProduct}
                onAddToCart={(e, p) => {
                  e.stopPropagation();
                  addItem(p);
                  addNotification('Added to Order', 'success');
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-sm transition-all animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] overflow-hidden relative shadow-2xl flex flex-col md:grid md:grid-cols-2 max-h-[95vh] border border-white">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-8 right-8 z-10 p-4 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all border border-slate-200 active:scale-90 shadow-sm"
            >
              <X size={28}/>
            </button>
            
            <div className="bg-slate-50 p-12 md:p-20 flex items-center justify-center overflow-hidden border-r border-slate-100">
              <img src={selectedProduct.image} className="max-w-full h-auto rounded-[3rem] shadow-2xl transform hover:scale-105 transition-transform duration-1000" alt={selectedProduct.name} />
            </div>

            <div className="p-12 md:p-24 flex flex-col bg-white">
              <div className="text-[11px] font-black uppercase text-yellow-600 tracking-[0.5em] mb-8">{selectedProduct.category}</div>
              <h2 className="text-5xl font-black text-slate-900 mb-10 leading-none tracking-tighter uppercase">{selectedProduct.name}</h2>
              
              <div className="flex items-center gap-10 mb-14">
                <div className="flex items-center gap-2.5 bg-yellow-400 text-yellow-950 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-yellow-400/20">
                  <Star size={20} fill="currentColor" />
                  {selectedProduct.rating}
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100 pl-10">Trusted by {selectedProduct.reviewsCount} users</div>
              </div>

              <div className="flex-1 overflow-y-auto pr-10 mb-14 scrollbar-hide">
                <p className="text-lg text-slate-500 leading-relaxed font-medium mb-12">
                  {selectedProduct.description}
                </p>
                
                <div className="space-y-4">
                  {selectedProduct.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group/feature hover:border-yellow-400 transition-all">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 group-hover/feature:scale-150 transition-transform"></div>
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-14 border-t border-slate-100 flex items-center justify-between gap-12 mt-auto">
                <div className="flex flex-col">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Investment</div>
                  <div className="text-5xl font-black text-slate-900 tracking-tighter">₴{selectedProduct.price.toLocaleString()}</div>
                </div>
                <button 
                  disabled={selectedProduct.stock === 0}
                  onClick={() => { 
                    addItem(selectedProduct); 
                    setSelectedProduct(null); 
                    addNotification('Transaction Added', 'success'); 
                  }}
                  className="flex-1 bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-8 rounded-[2.5rem] font-black text-xl uppercase tracking-widest transition-all shadow-2xl active:scale-95 disabled:opacity-20"
                >
                  {selectedProduct.stock > 0 ? 'Order Now' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

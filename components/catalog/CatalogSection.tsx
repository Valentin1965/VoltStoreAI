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
      className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-yellow-200 transition-all duration-500 cursor-pointer flex flex-col h-full animate-fade-in"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
        <img 
          src={images[0]} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
          {product.isNew && (
            <span className="bg-blue-600/90 backdrop-blur text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">Новинка</span>
          )}
          {product.onSale && (
            <span className="bg-red-600/90 backdrop-blur text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg">Акція</span>
          )}
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-4 right-4 p-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-lg z-10 transition-all active:scale-90 ${isFavorite ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-md border border-white/40 p-3 rounded-2xl flex items-center justify-between opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
           <span className="text-sm font-black text-slate-900">₴{product.price.toLocaleString()}</span>
           <div className="flex items-center gap-1">
             <Star className="text-yellow-500 fill-yellow-500" size={12} />
             <span className="text-[10px] font-black">{product.rating}</span>
           </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{product.category}</div>
        <h3 className="font-bold text-slate-900 mb-3 text-sm line-clamp-2 leading-tight group-hover:text-yellow-600 transition-colors">{product.name}</h3>
        
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900 tracking-tight">₴{product.price.toLocaleString()}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {product.stock > 0 ? (
                <div className={`flex items-center gap-1 text-[9px] font-bold uppercase ${isLowStock ? 'text-orange-500' : 'text-green-500'}`}>
                  {isLowStock ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                  {isLowStock ? `Залишилось ${product.stock}` : 'В наявності'}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-400">
                  <X size={10} />
                  Під замовлення
                </div>
              )}
            </div>
          </div>
          <button 
            disabled={product.stock === 0}
            onClick={(e) => onAddToCart(e, product)}
            className="bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 p-3.5 rounded-2xl transition-all shadow-xl shadow-slate-200 hover:shadow-yellow-100 disabled:opacity-30 active:scale-95"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogSection: React.FC = () => {
  const { filteredProducts, categories, selectedCategory, setSelectedCategory, isLoading } = useProducts();
  const { addItem } = useCart();
  const { addNotification } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [visitorCount, setVisitorCount] = useState(142);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorCount(prev => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-6">
        <Loader2 className="text-yellow-400 animate-spin" size={48} />
        <p className="text-slate-900 text-xs font-black uppercase tracking-[0.3em]">Оновлення залишків...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Premium Hero Banner */}
      <div className="relative mb-12 rounded-[3.5rem] bg-slate-900 overflow-hidden min-h-[450px] flex items-center group shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[url('https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center opacity-50 group-hover:scale-105 transition-transform duration-[20s]"></div>
        
        <div className="relative z-20 px-10 md:px-20 max-w-2xl py-12">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 animate-bounce">
            <Sparkles size={14} className="fill-current" /> Професійне Рішення 2024
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-[0.9] tracking-tighter">
            Енергія, що <br/> <span className="text-yellow-400">не знає меж.</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-medium mb-10 leading-relaxed max-w-md">
            Ми не просто продаємо обладнання. Ми будуємо вашу енергетичну безпеку з використанням штучного інтелекту.
          </p>
          
          <div className="flex flex-wrap gap-5 items-center">
            <button className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-95 shadow-2xl">
              Обрати систему
            </button>
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-sm">{visitorCount}</span>
                <span className="text-slate-500 text-[8px] font-bold uppercase tracking-tighter">Покупців онлайн</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              selectedCategory === 'All' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
            }`}
          >
            Усі товари
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedCategory === cat ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-3 bg-white px-6 py-3.5 rounded-2xl border border-slate-100">
          <TrendingUp size={16} className="text-yellow-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Всього позицій: <span className="text-slate-900">{filteredProducts.length}</span>
          </span>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((p, idx) => (
            <ProductCard 
              key={p.id} 
              product={p} 
              index={idx}
              onSelect={setSelectedProduct}
              onAddToCart={(e, p) => {
                e.stopPropagation();
                addItem(p);
                addNotification('Товар додано до кошика', 'success');
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[4rem] border border-slate-100 p-32 text-center">
          <div className="bg-slate-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8">
            <X size={40} className="text-slate-200" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-2">Нічого не знайдено</h3>
          <p className="text-sm text-slate-400 font-medium">Спробуйте іншу категорію або пошуковий запит.</p>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/80 backdrop-blur-xl transition-all animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[4rem] overflow-hidden relative shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="absolute top-10 right-10 z-10 p-3 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all active:scale-90"
            >
              <X size={24}/>
            </button>
            
            <div className="w-full md:w-1/2 bg-slate-50 p-16 flex items-center justify-center overflow-hidden">
              <img src={selectedProduct.image} className="max-w-full h-auto rounded-[3rem] shadow-2xl transform hover:scale-110 transition-transform duration-1000" alt={selectedProduct.name} />
            </div>

            <div className="w-full md:w-1/2 p-12 md:p-20 flex flex-col bg-white">
              <div className="text-[10px] font-black uppercase text-yellow-600 tracking-[0.4em] mb-6">{selectedProduct.category}</div>
              <h2 className="text-4xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">{selectedProduct.name}</h2>
              
              <div className="flex items-center gap-8 mb-12">
                <div className="flex items-center gap-2 bg-yellow-400 text-yellow-950 px-5 py-2 rounded-full text-xs font-black shadow-xl shadow-yellow-100">
                  <Star size={18} fill="currentColor" />
                  {selectedProduct.rating}
                </div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-8">Понад {selectedProduct.reviewsCount} відгуків</div>
              </div>

              <div className="flex-1 overflow-y-auto pr-8 mb-12 scrollbar-hide">
                <p className="text-lg text-slate-500 leading-relaxed font-medium mb-10">
                  {selectedProduct.description}
                </p>
                
                <div className="grid grid-cols-1 gap-5">
                  {selectedProduct.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-5 bg-slate-50 p-5 rounded-3xl border border-slate-100 group/feature hover:border-yellow-200 transition-all">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 group-hover/feature:scale-125 transition-transform"></div>
                      <span className="text-xs font-bold text-slate-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-12 border-t border-slate-100 flex items-center justify-between gap-10 mt-auto">
                <div className="flex flex-col">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Інвестиція</div>
                  <div className="text-5xl font-black text-slate-900 tracking-tighter">₴{selectedProduct.price.toLocaleString()}</div>
                </div>
                <button 
                  disabled={selectedProduct.stock === 0}
                  onClick={() => { 
                    addItem(selectedProduct); 
                    setSelectedProduct(null); 
                    addNotification('Товар додано до замовлення', 'success'); 
                  }}
                  className="flex-1 bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-7 rounded-3xl font-black text-xl transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {selectedProduct.stock > 0 ? 'Замовити' : 'Очікуємо'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
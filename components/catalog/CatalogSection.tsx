
import React, { useState } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Star, ShoppingCart, Zap, FileText, Download, X, ExternalLink, Info, ChevronLeft, ChevronRight, Heart, Loader2 } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onAddToCart }) => {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const isFavorite = isInWishlist(product.id);

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <div className="w-full h-full flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {images.map((img, i) => (
            <img 
              key={i}
              src={img} 
              alt={product.name}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.isNew && (
            <span className="bg-blue-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm">New</span>
          )}
          {product.onSale && (
            <span className="bg-red-600 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm">Sale</span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur rounded-full transition-all shadow-sm z-10 ${isFavorite ? 'text-red-500' : 'text-slate-300 hover:text-red-500'}`}
        >
          <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="text-yellow-400 fill-yellow-400" size={12} />
          <span className="text-[10px] font-bold text-slate-800">{product.rating}</span>
          <span className="text-[9px] text-slate-400 font-medium">({product.reviewsCount})</span>
        </div>
        
        <h3 className="font-bold text-slate-900 mb-1 text-xs leading-tight line-clamp-1">{product.name}</h3>
        <p className="text-[10px] text-slate-500 mb-3 line-clamp-2 h-7 leading-relaxed font-medium">{product.description}</p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-sm font-bold text-slate-900 tracking-tight">₴{product.price.toLocaleString()}</span>
          <button 
            onClick={(e) => onAddToCart(e, product)}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 p-2 rounded-lg transition-all active:scale-95 shadow-sm"
          >
            <ShoppingCart size={14} />
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

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addItem(product);
    addNotification(`${product.name} у кошику!`, 'success');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 size={24} className="text-yellow-500 animate-spin" />
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
            selectedCategory === 'All' 
              ? 'bg-yellow-400 text-yellow-950 shadow-md' 
              : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
          }`}
        >
          Всі товари
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-yellow-400 text-yellow-950 shadow-md' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
          }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onSelect={(p) => setSelectedProduct(p)}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-fade-in">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all text-slate-500"
            >
              <X size={16} />
            </button>

            <div className="md:w-2/5 bg-slate-50 p-8 flex items-center justify-center">
              <img 
                src={selectedProduct.image} 
                className="w-full max-w-[200px] rounded-2xl shadow-lg object-cover" 
                alt={selectedProduct.name} 
              />
            </div>

            <div className="flex-1 p-8 overflow-y-auto max-h-[85vh]">
              <div className="text-[10px] font-bold text-yellow-600 uppercase mb-2 tracking-widest">{selectedProduct.category}</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">{selectedProduct.name}</h2>
              <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">{selectedProduct.description}</p>

              {selectedProduct.specs && (
                <div className="border border-slate-100 rounded-xl overflow-hidden mb-8">
                  <table className="w-full text-[10px]">
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.specs.map((spec, i) => (
                        <tr key={i} className="bg-slate-50/30">
                          <td className="px-4 py-2.5 font-bold text-slate-400 w-1/3">{spec.label}</td>
                          <td className="px-4 py-2.5 text-slate-800 font-bold">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="text-xl font-bold text-slate-900">₴{selectedProduct.price.toLocaleString()}</div>
                <button 
                  onClick={(e) => {
                    handleAddToCart(e, selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                >
                  Купити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

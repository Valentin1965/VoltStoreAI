import React, { useState } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Star, ShoppingCart, X, Heart, Loader2 } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onAddToCart: (e: React.MouseEvent, product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, onAddToCart }) => {
  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isFavorite = isInWishlist(product.id);

  return (
    <div 
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img 
          src={images[0]} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
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
          className={`absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur rounded-full shadow-sm z-10 ${isFavorite ? 'text-red-500' : 'text-slate-300'}`}
        >
          <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="text-yellow-400 fill-yellow-400" size={12} />
          <span className="text-[10px] font-bold text-slate-800">{product.rating}</span>
        </div>
        <h3 className="font-bold text-slate-900 mb-1 text-xs truncate">{product.name}</h3>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-slate-900">₴{product.price.toLocaleString()}</span>
          <button 
            onClick={(e) => onAddToCart(e, product)}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 p-2 rounded-lg"
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="text-yellow-400 animate-spin" size={32} />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Завантаження каталогу...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
            selectedCategory === 'All' ? 'bg-yellow-400 text-yellow-950' : 'bg-white text-slate-400 border border-slate-100'
          }`}
        >
          Всі товари
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
              selectedCategory === cat ? 'bg-yellow-400 text-yellow-950' : 'bg-white text-slate-400 border border-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredProducts.map((p) => (
          <ProductCard 
            key={p.id} 
            product={p} 
            onSelect={setSelectedProduct}
            onAddToCart={(e, p) => {
              e.stopPropagation();
              addItem(p);
              addNotification('Додано до кошика', 'success');
            }}
          />
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2rem] p-8 relative animate-fade-in">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900"><X size={20}/></button>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img src={selectedProduct.image} className="w-full md:w-48 rounded-2xl object-cover" alt={selectedProduct.name} />
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-yellow-600 mb-1">{selectedProduct.category}</div>
                <h2 className="text-xl font-bold mb-2">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">{selectedProduct.description}</p>
                <div className="text-2xl font-black mb-6">₴{selectedProduct.price.toLocaleString()}</div>
                <button 
                  onClick={() => { addItem(selectedProduct); setSelectedProduct(null); addNotification('Додано до кошика', 'success'); }}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-4 rounded-xl font-black transition-all shadow-lg"
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
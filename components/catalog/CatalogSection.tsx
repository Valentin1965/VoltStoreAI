
import React, { useState } from 'react';
import { useProducts } from '../../contexts/ProductsContext';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Star, ShoppingCart, Tag, Zap, FileText, Download, X, ExternalLink, Info, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
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
      className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <div className="w-full h-full flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
          {images.map((img, i) => (
            <img 
              key={i}
              src={img} 
              alt={product.name}
              className="w-full h-full object-cover shrink-0"
            />
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button 
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isNew && (
            <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">New</span>
          )}
          {product.onSale && (
            <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">Sale</span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-3 right-3 p-2 bg-white/80 backdrop-blur rounded-full transition-all shadow-sm z-10 ${isFavorite ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-red-500'}`}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-1 mb-2">
          <Star className="text-yellow-400 fill-yellow-400" size={14} />
          <span className="text-xs font-bold text-slate-600">{product.rating}</span>
          <span className="text-xs text-slate-400">({product.reviewsCount})</span>
        </div>
        
        <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-xs text-slate-500 mb-4 line-clamp-2 h-8">{product.description}</p>
        
        <div className="flex items-end justify-between">
          <div>
            {product.oldPrice && (
              <span className="text-xs text-slate-400 line-through block">₴{product.oldPrice.toLocaleString()}</span>
            )}
            <span className="text-lg font-black text-slate-900">₴{product.price.toLocaleString()}</span>
          </div>
          
          <button 
            onClick={(e) => onAddToCart(e, product)}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 p-3 rounded-xl transition-colors shadow-lg shadow-yellow-100"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogSection: React.FC = () => {
  const { filteredProducts, categories, selectedCategory, setSelectedCategory } = useProducts();
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addNotification } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalActiveImage, setModalActiveImage] = useState(0);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addItem(product);
    addNotification(`${product.name} додано до кошика!`, 'success');
  };

  const downloadSpecsCSV = (product: Product) => {
    if (!product.specs || product.specs.length === 0) return;
    
    const headers = 'Характеристика,Значення\n';
    const rows = product.specs.map(s => `"${s.label}","${s.value}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `specs-${product.name.replace(/\s+/g, '-').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('Таблицю характеристик завантажено', 'info');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
            selectedCategory === 'All' 
              ? 'bg-yellow-400 text-yellow-950 shadow-md shadow-yellow-200' 
              : 'bg-white text-slate-500 hover:bg-slate-100 border'
          }`}
        >
          Всі товари
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat 
                ? 'bg-yellow-400 text-yellow-950 shadow-md shadow-yellow-200' 
                : 'bg-white text-slate-500 hover:bg-slate-100 border'
          }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onSelect={(p) => {
              setSelectedProduct(p);
              setModalActiveImage(0);
            }}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in flex flex-col lg:flex-row my-8 relative">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-6 right-6 z-20 p-2 bg-white/80 rounded-full hover:bg-white shadow-lg transition-all"
            >
              <X size={24} />
            </button>

            <div className="lg:w-1/2 bg-slate-50 p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center mb-6 relative">
                <img 
                  src={(selectedProduct.images && selectedProduct.images[modalActiveImage]) || selectedProduct.image} 
                  className="w-full max-w-md rounded-3xl shadow-2xl object-cover transition-all duration-300" 
                  alt={selectedProduct.name} 
                />
                <button 
                  onClick={() => toggleWishlist(selectedProduct)}
                  className={`absolute top-4 right-4 p-3 bg-white rounded-full shadow-lg transition-all ${isInWishlist(selectedProduct.id) ? 'text-red-500' : 'text-slate-300 hover:text-red-500'}`}
                >
                  <Heart size={20} fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} />
                </button>
              </div>
              
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-4 px-2 snap-x">
                  {selectedProduct.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setModalActiveImage(i)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-4 shrink-0 transition-all snap-start ${
                        modalActiveImage === i ? 'border-yellow-400' : 'border-white hover:border-slate-200'
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:w-1/2 p-8 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-yellow-400 text-yellow-950 text-[10px] font-black uppercase px-2 py-1 rounded">{selectedProduct.category}</span>
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-400 fill-yellow-400" size={14} />
                  <span className="text-sm font-bold">{selectedProduct.rating}</span>
                </div>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">{selectedProduct.name}</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">{selectedProduct.description}</p>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText size={14} /> Документація (PDF)
                  </h4>
                  {selectedProduct.docs && selectedProduct.docs.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedProduct.docs.map((doc, i) => (
                        <li key={i}>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2 group"
                          >
                            <span className="underline">{doc.title}</span>
                            <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Документація відсутня</p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Download size={14} /> Дані для завантаження
                  </h4>
                  <button 
                    onClick={() => downloadSpecsCSV(selectedProduct)}
                    disabled={!selectedProduct.specs || selectedProduct.specs.length === 0}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    Характеристики (CSV)
                    <Download size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} /> Технічні характеристики
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.specs && selectedProduct.specs.length > 0 ? (
                        selectedProduct.specs.map((spec, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="px-4 py-2 font-bold text-slate-500 w-1/2">{spec.label}</td>
                            <td className="px-4 py-2 text-slate-900">{spec.value}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-center text-slate-400 italic">Специфікації ще не додані</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Вартість</div>
                  <div className="text-3xl font-black text-slate-900">₴{selectedProduct.price.toLocaleString()}</div>
                </div>
                <button 
                  onClick={(e) => {
                    handleAddToCart(e, selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-yellow-100 flex items-center gap-3"
                >
                  <ShoppingCart size={20} />
                  До кошика
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
          <Zap className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-xl font-bold text-slate-900">Нічого не знайдено</h3>
          <p className="text-slate-500 mt-2">Спробуйте змінити параметри пошуку або категорію</p>
          <button 
            onClick={() => { setSelectedCategory('All'); }}
            className="mt-6 text-yellow-600 font-bold hover:underline"
          >
            Скинути всі фільтри
          </button>
        </div>
      )}
    </div>
  );
};

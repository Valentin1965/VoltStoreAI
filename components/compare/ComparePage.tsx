
import React from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { Scale, Trash2, ShoppingCart, Star, Zap, X, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ComparePage: React.FC = () => {
  const { compareList, toggleCompare, clearCompare, isInCompare } = useCompare();
  const { addItem } = useCart();
  const { products } = useProducts();

  // Recommendations for comparison
  const recommendations = products.slice(0, 4);

  if (compareList.length === 0) {
    return (
      <div className="animate-fade-in space-y-16">
        <div className="text-center py-20 bg-white rounded-[4rem] border border-slate-100 shadow-xl">
          <div className="bg-slate-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-10 border border-slate-100">
            <Scale className="text-slate-200" size={60} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Товари для порівняння не обрані</h2>
          <p className="text-slate-400 mb-12 max-w-sm mx-auto font-medium uppercase text-xs tracking-widest leading-relaxed px-6">
            Виберіть до 4 товарів, щоб порівняти їх характеристики та вартість.
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Zap className="text-yellow-500" size={20} /> Оберіть товари для порівняння
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-xl transition-all flex flex-col border-b-4 border-b-transparent hover:border-b-yellow-400">
                <div className="aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-50 relative border border-slate-50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors pointer-events-none"></div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{item.category}</div>
                  <h4 className="font-bold text-slate-900 text-sm mb-3 line-clamp-2 uppercase tracking-tight leading-snug">{item.name}</h4>
                  <div className="flex items-center gap-1.5 mb-6">
                    <Star className="text-yellow-400 fill-yellow-400" size={12} />
                    <span className="text-xs font-black text-slate-400">{item.rating} ({item.reviewsCount})</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-xl font-black text-slate-900">₴{item.price.toLocaleString()}</div>
                  <button 
                    onClick={() => toggleCompare(item)}
                    className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      isInCompare(item.id) 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-yellow-400 hover:text-yellow-950'
                    }`}
                  >
                    <Scale size={14} /> {isInCompare(item.id) ? 'Обрано' : 'Порівняти'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Find all unique feature keys across selected products
  const allFeatures = Array.from(new Set(compareList.flatMap(p => p.features)));

  return (
    <div className="animate-fade-in pb-32">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 uppercase tracking-tighter">
          <Scale className="text-yellow-500" size={32} /> Performance Matrix
        </h2>
        <button 
          onClick={clearCompare}
          className="px-8 py-3 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="p-10 w-64 bg-slate-50/50"></th>
              {compareList.map(product => (
                <th key={product.id} className="p-10 min-w-[300px] group">
                  <div className="relative mb-6">
                    <img src={product.image} className="w-48 h-48 mx-auto rounded-3xl object-cover shadow-lg border border-slate-50 group-hover:scale-105 transition-transform" alt="" />
                    <button 
                      onClick={() => toggleCompare(product)}
                      className="absolute -top-3 -right-3 p-3 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-xl border border-slate-100 transition-all active:scale-90"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">{product.category}</div>
                  <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter line-clamp-2">{product.name}</h3>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Price Row */}
            <tr>
              <td className="p-10 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</td>
              {compareList.map(p => (
                <td key={p.id} className="p-10 text-center">
                  <div className="text-2xl font-black text-slate-900 tracking-tighter">₴{p.price.toLocaleString()}</div>
                </td>
              ))}
            </tr>

            {/* Rating Row */}
            <tr>
              <td className="p-10 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</td>
              {compareList.map(p => (
                <td key={p.id} className="p-10">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="text-yellow-500 fill-yellow-500" size={16} />
                    <span className="font-black text-slate-900">{p.rating}</span>
                    <span className="text-[10px] text-slate-400">({p.reviewsCount})</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Availability Row */}
            <tr>
              <td className="p-10 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</td>
              {compareList.map(p => (
                <td key={p.id} className="p-10 text-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${p.stock > 0 ? 'text-green-500' : 'text-slate-300'}`}>
                    {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Dynamic Features Rows */}
            {allFeatures.map(feature => (
              <tr key={feature}>
                <td className="p-10 bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{feature}</td>
                {compareList.map(p => (
                  <td key={p.id} className="p-10 text-center">
                    {p.features.includes(feature) ? (
                      <CheckCircle2 className="text-green-500 mx-auto" size={20} />
                    ) : (
                      <X className="text-slate-100 mx-auto" size={20} />
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Action Row */}
            <tr className="bg-slate-50/20">
              <td className="p-10"></td>
              {compareList.map(p => (
                <td key={p.id} className="p-10">
                  <button 
                    disabled={p.stock === 0}
                    onClick={() => addItem(p)}
                    className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-3"
                  >
                    <ShoppingCart size={16} /> Add to Cart
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

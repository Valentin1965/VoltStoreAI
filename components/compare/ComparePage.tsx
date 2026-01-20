
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
      <div className="animate-fade-in space-y-12 max-w-6xl mx-auto">
        {/* Compact Empty State */}
        <div className="text-center py-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-50">
            <Scale className="text-slate-300" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tighter break-words px-6">Товари для порівняння не обрані</h2>
          <p className="text-slate-400 mb-2 max-w-sm mx-auto font-medium uppercase text-[10px] tracking-widest leading-relaxed px-8 break-words">
            Виберіть до 4 товарів, щоб порівняти їх характеристики та вартість.
          </p>
        </div>

        {/* Stable Recommendations */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
              <Zap className="text-yellow-500" size={16} /> Оберіть товари для порівняння
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recommendations.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg transition-all flex flex-col border-b-2 border-transparent hover:border-b-yellow-400 h-full">
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50 relative border border-slate-50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors pointer-events-none"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] font-black text-yellow-600 uppercase tracking-widest mb-1">{item.category}</div>
                  <h4 className="font-bold text-slate-900 text-[11px] mb-2 line-clamp-1 uppercase tracking-tight leading-snug">{item.name}</h4>
                  <div className="flex items-center gap-1.5 mb-4">
                    <Star className="text-yellow-400 fill-yellow-400" size={10} />
                    <span className="text-[10px] font-black text-slate-400">{item.rating} ({item.reviewsCount})</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-base font-black text-slate-900">₴{item.price.toLocaleString()}</div>
                  <button 
                    onClick={() => toggleCompare(item)}
                    className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                      isInCompare(item.id) 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-yellow-400 hover:text-yellow-950'
                    }`}
                  >
                    <Scale size={12} /> {isInCompare(item.id) ? 'Обрано' : 'Порівняти'}
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
    <div className="animate-fade-in pb-32 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
          <Scale className="text-yellow-500" size={28} /> Performance Matrix
        </h2>
        <button 
          onClick={clearCompare}
          className="px-6 py-2 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-4">
        <table className="w-full bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-xl table-fixed">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="p-6 w-48 bg-slate-50/50"></th>
              {compareList.map(product => (
                <th key={product.id} className="p-6 min-w-[200px] group">
                  <div className="relative mb-4">
                    <img src={product.image} className="w-32 h-32 mx-auto rounded-2xl object-cover shadow-md border border-slate-50 group-hover:scale-105 transition-transform" alt="" />
                    <button 
                      onClick={() => toggleCompare(product)}
                      className="absolute -top-2 -right-2 p-2 bg-white text-slate-400 hover:text-red-500 rounded-xl shadow-lg border border-slate-100 transition-all active:scale-90"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="text-[8px] font-black text-yellow-600 uppercase tracking-widest mb-1">{product.category}</div>
                  <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-tighter line-clamp-1">{product.name}</h3>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Price Row */}
            <tr>
              <td className="p-6 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</td>
              {compareList.map(p => (
                <td key={p.id} className="p-6 text-center">
                  <div className="text-lg font-black text-slate-900 tracking-tighter">₴{p.price.toLocaleString()}</div>
                </td>
              ))}
            </tr>

            {/* Rating Row */}
            <tr>
              <td className="p-6 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rating</td>
              {compareList.map(p => (
                <td key={p.id} className="p-6">
                  <div className="flex items-center justify-center gap-1.5">
                    <Star className="text-yellow-500 fill-yellow-500" size={12} />
                    <span className="font-black text-slate-900 text-xs">{p.rating}</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Dynamic Features Rows */}
            {allFeatures.map(feature => (
              <tr key={feature}>
                <td className="p-6 bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight break-words">{feature}</td>
                {compareList.map(p => (
                  <td key={p.id} className="p-6 text-center">
                    {p.features.includes(feature) ? (
                      <CheckCircle2 className="text-green-500 mx-auto" size={16} />
                    ) : (
                      <X className="text-slate-100 mx-auto" size={16} />
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Action Row */}
            <tr className="bg-slate-50/20">
              <td className="p-6"></td>
              {compareList.map(p => (
                <td key={p.id} className="p-6">
                  <button 
                    disabled={p.stock === 0}
                    onClick={() => addItem(p)}
                    className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md disabled:opacity-20 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={12} /> Add to Cart
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

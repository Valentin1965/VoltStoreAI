
import React from 'react';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { Heart, ShoppingCart, Trash2, Zap, Clock, ArrowRight, Star } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist();
  const { addItem } = useCart();
  const { products } = useProducts();

  // Get some recommendations if wishlist is empty
  const recommendations = products.slice(0, 4);

  if (wishlist.length === 0) {
    return (
      <div className="animate-fade-in space-y-16">
        <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-slate-200" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Термінал бронювання порожній</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium leading-relaxed px-6">
            Зарезервуйте обладнання, яке вас цікавить, щоб забезпечити доступність і повернутися до покупки пізніше.
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <Zap className="text-yellow-500" size={20} /> Рекомендовано для бронювання
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-100 rounded-[2rem] p-5 hover:shadow-xl transition-all flex flex-col">
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-50 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <button 
                    onClick={() => toggleWishlist(item)}
                    className="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Heart size={16} fill={isInWishlist(item.id) ? "currentColor" : "none"} className={isInWishlist(item.id) ? "text-red-500" : ""} />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1">{item.category}</div>
                  <h4 className="font-bold text-slate-900 text-xs mb-2 line-clamp-2 uppercase tracking-tight">{item.name}</h4>
                  <div className="flex items-center gap-1 mb-4">
                    <Star className="text-yellow-400 fill-yellow-400" size={10} />
                    <span className="text-[10px] font-black text-slate-400">{item.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                  <span className="font-black text-slate-900 text-sm">₴{item.price.toLocaleString()}</span>
                  <button 
                    onClick={() => toggleWishlist(item)}
                    className="text-[9px] font-black uppercase text-slate-900 hover:text-yellow-600 flex items-center gap-1 tracking-widest transition-colors"
                  >
                    Забронювати <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter">
        <Heart className="text-red-500 fill-red-500" /> Зарезервоване обладнання
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wishlist.map((item) => (
          <div key={item.id} className="group bg-white border border-slate-100 rounded-[2rem] p-4 flex gap-5 hover:shadow-xl transition-all">
            <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 bg-slate-50">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase text-yellow-600 tracking-widest">{item.category}</span>
                  <button onClick={() => toggleWishlist(item)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate mt-1 uppercase tracking-tight">{item.name}</h3>
                <div className="text-lg font-black text-slate-900 mt-2">₴{item.price.toLocaleString()}</div>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => addItem(item)}
                  className="w-full bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-xl hover:bg-yellow-400 hover:text-yellow-950 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <ShoppingCart size={14} />
                  Завершити замовлення
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

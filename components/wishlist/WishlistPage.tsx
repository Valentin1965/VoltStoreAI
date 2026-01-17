
import React from 'react';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';
import { Heart, ShoppingCart, Trash2, Zap } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addItem } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-24 animate-fade-in bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="text-slate-200" size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Список обраного порожній</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Додавайте товари, які вам сподобались, щоб не загубити їх та повернутися до покупки пізніше.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
        <Heart className="text-red-500 fill-red-500" /> Обрані товари
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
                <h3 className="font-bold text-slate-900 text-sm truncate mt-1">{item.name}</h3>
                <div className="text-lg font-black text-slate-900 mt-2">₴{item.price.toLocaleString()}</div>
              </div>
              <div className="pt-2">
                <button 
                  onClick={() => addItem(item)}
                  className="w-full bg-slate-900 text-white text-xs font-black py-2.5 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={14} />
                  До кошика
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

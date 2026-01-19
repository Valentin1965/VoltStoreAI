
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Settings2, X, Box, Info } from 'lucide-react';

interface CartPageProps {
  onCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, updatePartQuantity, removeItem, removePart, totalPrice } = useCart();
  const [expandedKits, setExpandedKits] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedKits(prev => 
      prev.includes(id) ? prev.filter(ki => ki !== id) : [...prev, id]
    );
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-24 animate-fade-in bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="text-slate-300" size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Кошик поки порожній</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Додайте обладнання з каталогу або скористайтеся AI-підбором.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <ShoppingBag className="text-yellow-500" /> Ваш Кошик
        </h2>
        
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all group/item">
            <div className="p-5 flex gap-5 items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover/item:scale-105 transition-transform" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate text-sm md:text-base">{item.name}</h3>
                  {item.parts && (
                    <span className="bg-yellow-100 text-yellow-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">Комплект</span>
                  )}
                </div>
                <p className="text-[10px] md:text-xs text-slate-400 mb-4 font-medium uppercase tracking-wider">{item.category}</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:text-yellow-600 transition-colors shadow-sm"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center font-black text-sm text-slate-700">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:text-yellow-600 transition-colors shadow-sm"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  {item.parts && (
                    <button 
                      onClick={() => toggleExpand(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        expandedKits.includes(item.id) 
                        ? 'bg-slate-900 text-white shadow-lg' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Settings2 size={12} />
                      Керування складом
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-base md:text-xl font-black text-slate-900 tracking-tight">₴{(item.price * item.quantity).toLocaleString()}</div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors mt-2"
                  title="Видалити"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Детальний склад комплекту - РЕДАГУВАЛЬНИЙ */}
            {item.parts && expandedKits.includes(item.id) && (
              <div className="bg-slate-50 border-t border-slate-100 p-6 animate-fade-in space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Box size={14} className="text-yellow-600" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Компоненти системи</h4>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-full shadow-sm">
                    Підберіть оптимальну кількість
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {item.parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-yellow-300">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <div>
                          <span className="font-bold text-slate-800 text-xs block leading-none mb-1">{part.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">₴{part.price.toLocaleString()} / од</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button 
                            onClick={() => updatePartQuantity(item.id, part.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all disabled:opacity-30"
                            disabled={part.quantity <= 1}
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-6 text-center font-black text-xs text-slate-700">{part.quantity}</span>
                          <button 
                            onClick={() => updatePartQuantity(item.id, part.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-yellow-600 transition-all"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="font-black text-slate-900 text-xs w-20 text-right">₴{(part.price * part.quantity).toLocaleString()}</span>
                          {item.parts!.length > 1 && (
                            <button 
                              onClick={() => removePart(item.id, part.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors p-1"
                              title="Вилучити"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-2xl border border-yellow-100/50">
                  <Info size={14} className="text-yellow-600 shrink-0" />
                  <p className="text-[10px] text-yellow-800 font-medium italic">
                    Ви змінюєте склад саме цього комплекту. Ціна основного замовлення перераховується автоматично.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="lg:col-span-1">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 sticky top-28 shadow-xl shadow-slate-200/40">
          <h3 className="text-xl font-black text-slate-900 mb-8">Загальний підсумок</h3>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Кількість позицій</span>
              <span className="text-slate-900">{items.length}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Доставка</span>
              <span className="text-green-600 font-black">Безкоштовно</span>
            </div>
            <div className="pt-6 border-t border-slate-50 flex justify-between items-end">
              <span className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em]">До сплати</span>
              <span className="text-3xl font-black text-slate-900 tracking-tighter">₴{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-yellow-100 flex items-center justify-center gap-3 active:scale-95 group"
          >
            Оформити замовлення
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

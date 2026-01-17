
import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Settings2, ChevronDown, ChevronUp, X } from 'lucide-react';

interface CartPageProps {
  onCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onCheckout }) => {
  const { items, updateQuantity, removeItem, removePart, totalPrice } = useCart();
  const [expandedKits, setExpandedKits] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedKits(prev => 
      prev.includes(id) ? prev.filter(ki => ki !== id) : [...prev, id]
    );
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-24 animate-fade-in">
        <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="text-slate-400" size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Ваш кошик порожній</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Здається, ви ще не додали жодного товару до кошика. Перейдіть до каталогу, щоб знайти найкращі пропозиції.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <ShoppingBag className="text-yellow-500" />
          Ваш Кошик
        </h2>
        
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 flex gap-4 items-center">
              <div className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                  {item.parts && (
                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">Комплект</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-black text-slate-900">₴{(item.price * item.quantity).toLocaleString()}</div>
                <div className="flex gap-1 justify-end mt-2">
                  {item.parts && (
                    <button 
                      onClick={() => toggleExpand(item.id)}
                      className={`p-2 rounded-lg transition-colors ${expandedKits.includes(item.id) ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-50 text-slate-400 hover:text-slate-900'}`}
                      title="Налаштувати склад"
                    >
                      <Settings2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                    title="Видалити"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Kit Components Section */}
            {item.parts && expandedKits.includes(item.id) && (
              <div className="bg-slate-50 border-t border-slate-100 p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Склад комплекту</h4>
                  <span className="text-[10px] text-slate-400">Ви можете видалити зайві компоненти</span>
                </div>
                <div className="space-y-2">
                  {item.parts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-200 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <span className="font-medium text-slate-700">{part.name}</span>
                        <span className="text-xs text-slate-400">x{part.quantity}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-slate-900 text-xs">₴{(part.price * part.quantity).toLocaleString()}</span>
                        {item.parts!.length > 1 && (
                          <button 
                            onClick={() => removePart(item.id, part.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 sticky top-28 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Підсумок замовлення</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-slate-500">
              <span>Товари ({items.length})</span>
              <span>₴{totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Доставка</span>
              <span className="text-green-600 font-bold">Безкоштовно</span>
            </div>
            <div className="pt-4 border-t flex justify-between items-end">
              <span className="font-bold text-slate-900">Загальна сума</span>
              <span className="text-2xl font-black text-slate-900">₴{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Промокод</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Введіть код"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Ок</button>
            </div>
          </div>
          
          <button 
            onClick={onCheckout}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-950 py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-yellow-100 flex items-center justify-center gap-2 group"
          >
            Оформити замовлення
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

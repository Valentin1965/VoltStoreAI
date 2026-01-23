
import React from 'react';
import { ShoppingCart, LayoutGrid, Calculator, ShieldCheck, Heart, Zap, Search, Scale, ArrowLeft, Menu } from 'lucide-react';
import { AppView } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { totalItems } = useCart();
  const { searchQuery, setSearchQuery } = useProducts();

  const navItems = [
    { id: AppView.CATALOG, label: 'Каталог', icon: LayoutGrid },
    { id: AppView.CALCULATOR, label: 'AI Architect', icon: Calculator },
    { id: AppView.WISHLIST, label: 'Бронювання', icon: Heart },
    { id: AppView.COMPARE, label: 'Порівняння', icon: Scale },
    { id: AppView.ADMIN, label: 'Склад', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6">
        <div className="container mx-auto h-24 flex items-center justify-between gap-8">
          
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setView(AppView.CATALOG)}
            >
              <div className="bg-slate-900 p-2.5 rounded-2xl shadow-xl group-hover:rotate-12 transition-all">
                <Zap className="text-yellow-400 fill-yellow-400" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">VOLT<span className="text-yellow-500">STORE</span></span>
                <span className="text-[8px] font-black text-slate-400 tracking-[0.3em] uppercase mt-1">Energy Intelligence</span>
              </div>
            </div>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  currentView === item.id 
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon size={14} className={currentView === item.id ? 'text-yellow-500' : ''} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden xl:flex relative">
              <input
                type="text"
                placeholder="Пошук обладнання..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-yellow-400/20 w-64 transition-all outline-none text-[10px] font-black uppercase tracking-widest"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>

            <button 
              onClick={() => setView(AppView.CART)}
              className="relative p-4 bg-slate-900 text-white rounded-2xl hover:bg-yellow-400 hover:text-yellow-950 transition-all shadow-xl active:scale-90"
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-xl">
                <Zap className="text-yellow-400 fill-yellow-400" size={20} />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">VOLTSTORE <span className="text-slate-300">PRO</span></span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose max-w-sm">
              Ваш надійний партнер у світі енергонезалежності. Найсучасніше обладнання та AI-підтримка.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Навігація</h4>
            <div className="flex flex-col gap-4">
              <button onClick={() => setView(AppView.CATALOG)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">Каталог товарів</button>
              <button onClick={() => setView(AppView.CALCULATOR)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">Калькулятор систем</button>
              <button onClick={() => setView(AppView.ADMIN)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">Панель управління</button>
            </div>
          </div>

          <div className="space-y-6 text-right">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Контакти</h4>
             <div className="text-2xl font-black text-slate-900 tracking-tighter">0 800 333 44 55</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support 24/7</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

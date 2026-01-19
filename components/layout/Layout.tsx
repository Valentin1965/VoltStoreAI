
import React from 'react';
import { ShoppingCart, LayoutGrid, Calculator, ShieldCheck, Heart, Zap, Search, Menu, User } from 'lucide-react';
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
    { id: AppView.CALCULATOR, label: 'AI Підбір', icon: Calculator },
    { id: AppView.WISHLIST, label: 'Обране', icon: Heart },
    { id: AppView.ADMIN, label: 'Адмін', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-yellow-200 selection:text-yellow-900 font-sans text-slate-900">
      {/* Top Banner - Subtle & Slimmer */}
      <div className="bg-slate-900 text-white py-1.5 text-[9px] font-bold tracking-widest uppercase overflow-hidden whitespace-nowrap border-b border-white/5">
        <div className="animate-marquee inline-block px-4">
          ⚡ Безкоштовна доставка від 50,000 грн • Гарантія 5 років • Енергонезалежність під ключ ⚡
        </div>
      </div>

      {/* Header - Balanced height */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div 
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group" 
            onClick={() => setView(AppView.CATALOG)}
          >
            <div className="bg-yellow-400 p-2 rounded-lg group-hover:scale-105 transition-all">
              <Zap className="text-yellow-950 fill-yellow-950" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tighter text-slate-900 leading-none">VOLT<span className="text-yellow-500">STORE</span></span>
              <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">Pro Energy</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg relative group">
            <input
              type="text"
              placeholder="Пошук обладнання..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-4 focus:bg-white focus:border-yellow-400 transition-all outline-none text-xs font-semibold text-slate-600"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors" size={16} />
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-all font-bold text-[10px] uppercase tracking-wide">
              <User size={16} />
              <span>Кабінет</span>
            </button>
            <button 
              onClick={() => setView(AppView.CART)}
              className="relative p-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-md"
            >
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Bar - Compact */}
        <nav className="bg-white border-t border-slate-50 hidden md:block">
          <div className="container mx-auto px-6 flex justify-center gap-1 py-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-4 py-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${
                  currentView === item.id 
                    ? 'text-slate-900 bg-slate-50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                <item.icon size={12} className={currentView === item.id ? 'text-yellow-500' : ''} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main - Controlled width for better readability */}
      <main className="flex-1 container mx-auto px-6 py-6 max-w-6xl">
        {children}
      </main>

      {/* Footer - Professional & Compact */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="container mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Zap className="text-yellow-400 fill-yellow-400" size={24} />
              <span className="text-xl font-bold tracking-tighter">VOLTSTORE</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Ваш надійний партнер в енергонезалежності. <br/> Працюємо по всій Україні.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-[10px] mb-5">Магазин</h4>
            <ul className="space-y-3 text-[11px] font-bold">
              <li><button onClick={() => setView(AppView.CATALOG)} className="hover:text-yellow-400 transition-colors">Весь каталог</button></li>
              <li><button onClick={() => setView(AppView.CALCULATOR)} className="hover:text-yellow-400 transition-colors">AI Конструктор</button></li>
              <li><button onClick={() => setView(AppView.WISHLIST)} className="hover:text-yellow-400 transition-colors">Обране</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-[10px] mb-5">Інфо</h4>
            <ul className="space-y-3 text-[11px] font-bold">
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Доставка і оплата</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Повернення</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Про нас</a></li>
            </ul>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
            <h4 className="text-white font-bold text-[10px] mb-3 uppercase tracking-widest">Підтримка</h4>
            <a href="tel:+380447770001" className="text-lg font-bold text-white block hover:text-yellow-400 transition-colors mb-4">+38 (044) 777-00-01</a>
            <button className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all w-full">
              Замовити дзвінок
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  );
};

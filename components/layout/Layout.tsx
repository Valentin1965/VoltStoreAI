
import React from 'react';
import { ShoppingCart, LayoutGrid, Calculator, ShieldCheck, Heart, Zap, Search, User, Scale, ArrowLeft, X } from 'lucide-react';
import { AppView } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useCompare } from '../../contexts/CompareContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { totalItems } = useCart();
  const { searchQuery, setSearchQuery } = useProducts();
  const { compareList } = useCompare();

  const navItems = [
    { id: AppView.CATALOG, label: 'Catalog', icon: LayoutGrid },
    { id: AppView.CALCULATOR, label: 'Підбір комплекту', icon: Calculator },
    { id: AppView.WISHLIST, label: 'Бронювання', icon: Heart },
    { id: AppView.COMPARE, label: 'Compare', icon: Scale },
    { id: AppView.ADMIN, label: 'Admin', icon: ShieldCheck },
  ];

  const handleBack = () => {
    setView(AppView.CATALOG);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-yellow-400 selection:text-yellow-900 font-sans text-slate-900 bg-slate-50 relative overflow-x-hidden">
      {/* Global Background Image */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-white/70 z-10"></div> 
        <img 
          src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2000&auto=format&fit=crop" 
          alt="Solar Energy Background" 
          className="w-full h-full object-cover opacity-40 transition-all duration-1000 brightness-100"
        />
      </div>

      {/* Top Banner */}
      <div className="relative z-[40] bg-yellow-400 text-yellow-950 py-1 text-[8px] font-black tracking-widest uppercase overflow-hidden whitespace-nowrap border-b border-yellow-500/20">
        <div className="animate-marquee inline-block px-4">
          ⚡ Free Shipping from 50,000 UAH • 5-Year Warranty • Turnkey Energy Independence ⚡
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[50] bg-white/80 backdrop-blur-3xl border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {currentView !== AppView.CATALOG && (
              <button 
                onClick={handleBack}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 transition-all flex items-center justify-center animate-fade-in group"
                title="Назад до каталогу"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            <div 
              className="flex items-center gap-2 cursor-pointer shrink-0 group" 
              onClick={() => setView(AppView.CATALOG)}
            >
              <div className="bg-yellow-400 p-1.5 rounded-lg group-hover:scale-110 transition-all shadow-lg shadow-yellow-400/20">
                <Zap className="text-yellow-950 fill-yellow-950" size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter text-slate-900 leading-none uppercase">VOLT<span className="text-yellow-400">STORE</span></span>
                <span className="text-[7px] font-bold text-slate-400 tracking-wider uppercase leading-none mt-0.5">Energy Pro</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md relative group">
            <input
              type="text"
              placeholder="Шукати обладнання..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 focus:bg-white focus:border-yellow-400 transition-all outline-none text-[10px] font-semibold text-slate-700 placeholder:text-slate-400"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors" size={14} />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setView(AppView.COMPARE)}
              className="relative p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all active:scale-90"
            >
              <Scale size={18} />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[7px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                  {compareList.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setView(AppView.CART)}
              className="relative p-2.5 bg-yellow-400 text-yellow-950 hover:bg-yellow-500 rounded-xl transition-all shadow-md active:scale-90"
            >
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-yellow-400">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        <nav className="bg-white/40 border-t border-slate-100 hidden md:block">
          <div className="container mx-auto px-6 flex justify-center gap-1 py-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-4 py-1.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg ${
                  currentView === item.id 
                    ? 'text-slate-900 bg-white shadow-sm border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <item.icon size={11} className={currentView === item.id ? 'text-yellow-500' : ''} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 container mx-auto px-6 py-6 max-w-7xl relative">
        {children}
      </main>

      <footer className="bg-white text-slate-500 py-6 mt-auto relative z-[10] border-t border-slate-100">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-900 shrink-0">
            <Zap className="text-yellow-500 fill-yellow-500" size={20} />
            <span className="text-lg font-black tracking-tighter uppercase">VOLTSTORE</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-[9px] font-black uppercase tracking-[0.2em]">
            <button onClick={() => setView(AppView.CATALOG)} className="hover:text-yellow-500 transition-colors">Каталог</button>
            <button onClick={() => setView(AppView.CALCULATOR)} className="hover:text-yellow-500 transition-colors">Підбір комплекту</button>
            <button onClick={() => setView(AppView.WISHLIST)} className="hover:text-yellow-500 transition-colors">Бронювання</button>
            <a href="#" className="hover:text-yellow-500 transition-colors">Контакти</a>
          </div>

          <div className="flex items-center gap-4">
             <span className="text-xs font-black text-slate-900 tracking-tighter">0 800 777 00 01</span>
             <div className="h-4 w-[1px] bg-slate-200"></div>
             <p className="text-[8px] font-bold text-slate-400 uppercase">© 2025 Voltstore Pro</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

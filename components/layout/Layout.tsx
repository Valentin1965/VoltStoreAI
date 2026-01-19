
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
    { id: AppView.CATALOG, label: 'Catalog', icon: LayoutGrid },
    { id: AppView.CALCULATOR, label: 'AI Architect', icon: Calculator },
    { id: AppView.WISHLIST, label: 'Wishlist', icon: Heart },
    { id: AppView.ADMIN, label: 'Admin', icon: ShieldCheck },
  ];

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
      <div className="relative z-50 bg-yellow-400 text-yellow-950 py-1.5 text-[9px] font-black tracking-widest uppercase overflow-hidden whitespace-nowrap border-b border-yellow-500/20">
        <div className="animate-marquee inline-block px-4">
          ⚡ Free Shipping from 50,000 UAH • 5-Year Warranty • Turnkey Energy Independence ⚡
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div 
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group" 
            onClick={() => setView(AppView.CATALOG)}
          >
            <div className="bg-yellow-400 p-2 rounded-lg group-hover:scale-110 transition-all shadow-lg shadow-yellow-400/20">
              <Zap className="text-yellow-950 fill-yellow-950" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-slate-900 leading-none uppercase">VOLT<span className="text-yellow-400">STORE</span></span>
              <span className="text-[8px] font-bold text-slate-400 tracking-wider uppercase leading-none mt-1">Advanced Energy</span>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-lg relative group">
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 focus:bg-white focus:border-yellow-400 transition-all outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors" size={16} />
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest">
              <User size={16} />
              <span>Login</span>
            </button>
            <button 
              onClick={() => setView(AppView.CART)}
              className="relative p-3 bg-yellow-400 text-yellow-950 hover:bg-yellow-500 rounded-2xl transition-all shadow-xl shadow-yellow-400/10 active:scale-90"
            >
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-yellow-400">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-white/50 border-t border-slate-100 hidden md:block">
          <div className="container mx-auto px-6 flex justify-center gap-2 py-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-xl ${
                  currentView === item.id 
                    ? 'text-slate-900 bg-white shadow-sm border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                <item.icon size={12} className={currentView === item.id ? 'text-yellow-500' : ''} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white text-slate-500 py-16 mt-auto relative z-10 border-t border-slate-100">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-900">
              <Zap className="text-yellow-500 fill-yellow-500" size={28} />
              <span className="text-2xl font-black tracking-tighter uppercase">VOLTSTORE</span>
            </div>
            <p className="text-xs leading-relaxed font-medium text-slate-400">
              Leader in engineering autonomous power systems. Making energy accessible for every home.
            </p>
          </div>
          
          <div>
            <h4 className="text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] mb-6">Navigation</h4>
            <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
              <li><button onClick={() => setView(AppView.CATALOG)} className="hover:text-yellow-500 transition-colors">Catalog</button></li>
              <li><button onClick={() => setView(AppView.CALCULATOR)} className="hover:text-yellow-500 transition-colors">AI Architect</button></li>
              <li><button onClick={() => setView(AppView.WISHLIST)} className="hover:text-yellow-500 transition-colors">Wishlist</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] mb-6">Company</h4>
            <ul className="space-y-4 text-[11px] font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-yellow-500 transition-colors">Certification</a></li>
              <li><a href="#" className="hover:text-yellow-500 transition-colors">Installation</a></li>
              <li><a href="#" className="hover:text-yellow-500 transition-colors">Contacts</a></li>
            </ul>
          </div>

          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-slate-900 font-black text-[10px] mb-4 uppercase tracking-widest">Hotline</h4>
            <span className="text-xl font-black text-slate-900 block hover:text-yellow-500 transition-colors mb-6 tracking-tighter">0 800 777 00 01</span>
            <button className="bg-slate-900 text-white hover:bg-yellow-400 hover:text-yellow-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all w-full">
              Book Audit
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

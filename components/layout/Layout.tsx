
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
    <div className="min-h-screen flex flex-col">
      {/* Top Banner */}
      <div className="bg-yellow-400 text-yellow-900 py-2 text-center text-sm font-bold">
        ⚡ Акція: Знижка -20% на всі комплекти до кінця тижня!
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0" 
            onClick={() => setView(AppView.CATALOG)}
          >
            <div className="bg-yellow-400 p-2 rounded-xl">
              <Zap className="text-yellow-900 fill-yellow-900" size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">VOLT<span className="text-yellow-500">STORE</span></span>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl relative">
            <input
              type="text"
              placeholder="Пошук обладнання..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-yellow-400 transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <User size={24} />
            </button>
            <button 
              onClick={() => setView(AppView.CART)}
              className="relative p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            >
              <ShoppingCart size={24} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-950 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
            <button className="md:hidden p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="bg-slate-50 border-t hidden md:block">
          <div className="container mx-auto px-4 flex gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`py-3 flex items-center gap-2 text-sm font-semibold transition-colors border-b-2 ${
                  currentView === item.id 
                    ? 'border-yellow-500 text-yellow-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-auto">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Zap className="text-yellow-400 fill-yellow-400" size={24} />
              <span className="text-xl font-bold tracking-tight">VOLTSTORE</span>
            </div>
            <p className="text-sm leading-relaxed">
              Ваш надійний партнер у сфері автономного живлення. Ми забезпечуємо світло та комфорт у кожній оселі.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Навігація</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => setView(AppView.CATALOG)} className="hover:text-yellow-400 transition-colors">Каталог товарів</button></li>
              <li><button onClick={() => setView(AppView.CALCULATOR)} className="hover:text-yellow-400 transition-colors">AI Підбір</button></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Про нас</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Контакти</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Допомога</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Оплата і доставка</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Повернення товару</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">Гарантія</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Контакти</h4>
            <p className="text-sm">м. Київ, вул. Енергетична 42</p>
            <p className="text-sm mt-2">+38 (044) 123-45-67</p>
            <p className="text-sm">support@voltstore.pro</p>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
          © 2024 VoltStore Pro. Всі права захищені. Розроблено з ⚡ для України.
        </div>
      </footer>
    </div>
  );
};

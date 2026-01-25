
import React, { useState } from 'react';
import { ShoppingCart, LayoutGrid, Calculator, ShieldCheck, Heart, Zap, Search, Scale, X } from 'lucide-react';
import { AppView } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useProducts } from '../../contexts/ProductsContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { CartDrawer } from '../cart/CartDrawer';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { totalItems } = useCart();
  const { searchQuery, setSearchQuery } = useProducts();
  const { t, language, setLanguage } = useLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const navItems = [
    { id: AppView.CATALOG, label: t('nav_catalog'), icon: LayoutGrid },
    { id: AppView.CALCULATOR, label: t('nav_architect'), icon: Calculator },
    { id: AppView.WISHLIST, label: t('nav_wishlist'), icon: Heart },
    { id: AppView.COMPARE, label: t('nav_compare'), icon: Scale },
    { id: AppView.ADMIN, label: t('nav_admin'), icon: ShieldCheck },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'da', label: 'DA' },
    { code: 'no', label: 'NO' },
    { code: 'sv', label: 'SV' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6">
        <div className="container mx-auto h-24 flex items-center justify-between gap-8">
          
          <div className="flex items-center gap-6 shrink-0">
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

          <nav className="hidden lg:flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
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

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black transition-all ${
                    language === lang.code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center relative">
              <div className={`flex items-center bg-slate-100 rounded-2xl transition-all duration-300 ease-in-out overflow-hidden ${isSearchVisible ? 'w-64 pr-2' : 'w-12'}`}>
                <button 
                  onClick={() => {
                    setIsSearchVisible(!isSearchVisible);
                    if (isSearchVisible) setSearchQuery('');
                  }}
                  className={`p-3 transition-colors shrink-0 ${isSearchVisible ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'}`}
                >
                  {isSearchVisible ? <X size={20} /> : <Search size={20} />}
                </button>
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent border-none py-3 outline-none text-[10px] font-black uppercase tracking-widest w-full transition-opacity duration-200 ${isSearchVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                />
              </div>
            </div>

            <button 
              onClick={() => setView(AppView.CART)}
              className={`relative p-4 rounded-2xl transition-all shadow-xl active:scale-90 flex items-center justify-center ${
                currentView === AppView.CART ? 'bg-yellow-400 text-yellow-950' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-950 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white animate-bounce-short">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onCheckout={() => setView(AppView.CHECKOUT)} 
      />

      <main className="flex-1 container mx-auto px-6 py-12">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-16 px-6 mt-auto">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-xl">
                <Zap className="text-yellow-400 fill-yellow-400" size={20} />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">VOLTSTORE <span className="text-slate-300">PRO</span></span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose max-w-sm">
              {t('footer_tagline')}
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Navigate</h4>
            <div className="flex flex-col gap-4">
              <button onClick={() => setView(AppView.CATALOG)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">{t('nav_catalog')}</button>
              <button onClick={() => setView(AppView.CALCULATOR)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">{t('nav_architect')}</button>
              <button onClick={() => setView(AppView.CART)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">{t('cart_title')}</button>
              <button onClick={() => setView(AppView.ADMIN)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-yellow-600 text-left">{t('nav_admin')}</button>
            </div>
          </div>

          <div className="space-y-6 text-right">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Support</h4>
             <div className="text-2xl font-black text-slate-900 tracking-tighter">+45 00 00 00 00</div>
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active 24/7</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

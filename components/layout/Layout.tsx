
import React, { useState } from 'react';
import { ShoppingCart, LayoutGrid, Calculator, ShieldCheck, Heart, Zap, Search, Scale, X, RefreshCw, Info, MapPin, Phone, Mail, Lock } from 'lucide-react';
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

const GreenLightLogo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
    {/* Lightbulb Base */}
    <path d="M50 85C50 90.5228 45.5228 95 40 95H60C54.4772 95 50 90.5228 50 85Z" fill="#065F46" />
    <rect x="40" y="80" width="20" height="4" rx="2" fill="#064E3B" />
    <rect x="42" y="74" width="16" height="4" rx="2" fill="#064E3B" />
    
    {/* Bulb Shape */}
    <path d="M50 10C30 10 15 25 15 45C15 65 35 75 40 85H60C65 75 85 65 85 45C85 25 70 10 50 10Z" fill="url(#bulbGrad)" />
    
    {/* Leaves Inside */}
    <path d="M50 70C50 70 48 50 40 40C32 30 20 28 20 28C20 28 30 35 35 48C40 61 42 75 42 75" fill="white" fillOpacity="0.8" />
    <path d="M50 70C50 70 55 55 65 48C75 41 85 40 85 40C85 40 75 45 70 55C65 65 62 80 62 80" fill="white" fillOpacity="0.4" />
    
    <defs>
      <linearGradient id="bulbGrad" x1="50" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const { totalItems } = useCart();
  const { searchQuery, setSearchQuery } = useProducts();
  const { t, language, setLanguage, isLoadingRates, refreshRates } = useLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const navItems = [
    { id: AppView.CATALOG, label: t('nav_catalog'), icon: LayoutGrid },
    { id: AppView.CALCULATOR, label: t('nav_architect'), icon: Calculator },
    { id: AppView.WISHLIST, label: t('nav_wishlist'), icon: Heart },
    { id: AppView.COMPARE, label: t('nav_compare'), icon: Scale },
    { id: AppView.ABOUT, label: t('nav_about'), icon: Info },
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
        <div className="container mx-auto h-24 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-6 shrink-0">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setView(AppView.CATALOG)}
            >
              <div className="group-hover:scale-110 transition-transform duration-500">
                <GreenLightLogo />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase leading-none">GREEN <span className="text-emerald-500">LIGHT</span></span>
                <span className="text-[8px] font-black text-slate-400 tracking-[0.3em] uppercase mt-1">Solar Distribution Group</span>
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
                <item.icon size={14} className={currentView === item.id ? 'text-emerald-500' : ''} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center relative">
              <div className={`flex items-center bg-slate-100 rounded-2xl transition-all duration-300 ease-in-out overflow-hidden ${isSearchVisible ? 'w-48 pr-2' : 'w-12'}`}>
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
                currentView === AppView.CART ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-400 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-4 border-white animate-bounce-short">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Вертикальний перемикач мов праворуч */}
            <div className="hidden xl:flex flex-col gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shrink-0">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-2 py-0.5 rounded-lg text-[8px] font-black transition-all ${
                    language === lang.code ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
              <button 
                onClick={() => refreshRates()}
                className={`p-1 rounded-lg hover:bg-white transition-all mx-auto ${isLoadingRates ? 'animate-spin text-emerald-500' : 'text-slate-300'}`}
                title="Refresh AI Exchange Rates"
              >
                <RefreshCw size={10} />
              </button>
            </div>
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
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logo & Address */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(AppView.CATALOG)}>
              <GreenLightLogo />
              <span className="text-2xl font-black tracking-tighter uppercase text-slate-900">GREEN <span className="text-emerald-500">LIGHT</span></span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
                <MapPin size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Green Light Scandinavia<br/>
                  Øster Teglgårdsvej 6<br/>
                  8800 Viborg, Danmark
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose max-w-sm">
              {t('footer_tagline')}
            </p>
          </div>
          
          {/* Navigation */}
          <div className="space-y-6 md:text-center">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Navigate</h4>
            <div className="flex flex-col md:items-center gap-4">
              <button onClick={() => setView(AppView.CATALOG)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">{t('nav_catalog')}</button>
              <button onClick={() => setView(AppView.ABOUT)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">{t('nav_about')}</button>
              <button onClick={() => setView(AppView.CALCULATOR)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">{t('nav_architect')}</button>
              <button onClick={() => setView(AppView.CART)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">{t('cart_title')}</button>
              <button 
                onClick={() => setView(AppView.ADMIN)} 
                className={`text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${currentView === AppView.ADMIN ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
              >
                <Lock size={12} /> {t('nav_admin')}
              </button>
            </div>
          </div>

          {/* Contact & Support */}
          <div className="space-y-6 md:text-right">
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Support</h4>
             <div className="space-y-4">
               <div className="flex flex-col md:items-end gap-1">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Зателефонуйте нам</span>
                 <a href="tel:+4531185819" className="text-xl font-black text-slate-900 hover:text-emerald-600 transition-colors tracking-tighter flex items-center md:justify-end gap-2">
                   <Phone size={16} className="text-emerald-500" /> +45 31 18 58 19
                 </a>
               </div>
               
               <div className="flex flex-col md:items-end gap-1">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Електронна пошта</span>
                 <a href="mailto:info@glsolargroup.dk" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors flex items-center md:justify-end gap-2">
                   <Mail size={14} className="text-emerald-500" /> info@glsolargroup.dk
                 </a>
               </div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

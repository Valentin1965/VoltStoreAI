
import React, { useState } from 'react';
import { 
  ShoppingCart, LayoutGrid, Calculator, User, Wrench, 
  X, Info, Phone, Mail, Menu, MapPin, Globe, ShieldCheck,
  ShieldAlert, ScrollText, ChevronRight, Gavel, FileText, ChevronLeft
} from 'lucide-react';
import { AppView } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useLanguage, Language, CurrencyCode } from '../../contexts/LanguageContext';
import type { SiteCountry } from '../../routing/siteCountry';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  setView: (view: AppView) => void;
  /** Country prefix from URL (/dk, /se, /no); null on legacy /?view=… transactional pages */
  siteCountry?: SiteCountry | null;
  /** When set, header / menu cart opens the quick drawer instead of navigating to the cart page */
  onCartOpen?: () => void;
}

const GreenLightLogo = () => (
  <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
    <path d="M50 85C50 90.5228 45.5228 95 40 95H60C54.4772 95 50 90.5228 50 85Z" fill="#065F46" />
    <path d="M50 10C30 10 15 25 15 45C15 65 35 75 40 85H60C65 75 85 65 85 45C85 25 70 10 50 10Z" fill="url(#bulbGrad)" />
    <path d="M50 70C50 70 48 50 40 40C32 30 20 28 20 28C20 28 30 35 35 48C40 61 42 75 42 75" fill="white" fillOpacity="0.9" />
    <defs>
      <linearGradient id="bulbGrad" x1="50" y1="10" x2="50" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#34D399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
    </defs>
  </svg>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, siteCountry = null, onCartOpen }) => {
  const { totalItems } = useCart();
  const { 
    t, language, setLanguage, 
    currency, setCurrency, 
    rates: _rates
  } = useLanguage();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  const navItems = [
    { id: AppView.ABOUT, label: t('nav_about'), icon: Info },
    { id: AppView.CATALOG, label: t('nav_catalog'), icon: LayoutGrid },
    { id: AppView.CONTACT, label: t('nav_contact'), icon: Phone },
    { id: AppView.CALCULATOR, label: t('nav_architect'), icon: Calculator },
    { id: AppView.SERVICE, label: t('nav_mounting_services'), icon: Wrench },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'da', label: 'DA' },
    { code: 'no', label: 'NO' },
    { code: 'se', label: 'SE' },
  ];

  const currencies: CurrencyCode[] = ['EUR', 'DKK', 'NOK', 'SEK'];
  const showBack =
    currentView === AppView.CART ||
    currentView === AppView.ADMIN ||
    currentView === AppView.CABINET ||
    currentView === AppView.CHECKOUT ||
    currentView === AppView.CONTACT;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" translate="no">
      {/* On mobile: fixed header with very high z-index so hamburger is always clickable above any content */}
      <header className="sticky top-0 z-[50000] max-md:fixed max-md:top-0 max-md:left-0 max-md:right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto w-full h-24 flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    setView(siteCountry ? AppView.ABOUT : AppView.CATALOG);
                  }
                }}
                className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors touch-manipulation"
                aria-label="Back"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors touch-manipulation"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setView(AppView.ABOUT)}>
            <GreenLightLogo />
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xl font-black tracking-tighter text-slate-900 uppercase leading-none">GREEN <span className="text-emerald-500">LIGHT</span></span>
              <span className="text-[8px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">Scandinavia Group</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200 scrollbar-hide min-w-0">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`px-2.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight lg:tracking-widest transition-all flex items-center gap-1.5 shrink-0 min-w-0 max-w-[10.5rem] ${
                  currentView === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon size={14} className={`shrink-0 ${currentView === item.id ? 'text-emerald-500' : ''}`} />
                <span className="min-w-0 text-left leading-tight line-clamp-2 break-words hyphens-auto">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden md:flex flex-col gap-1.5">
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5 border border-slate-200/50">
                {languages.map(lang => (
                  <button key={lang.code} onClick={() => setLanguage(lang.code)} className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all ${language === lang.code ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>{lang.label}</button>
                ))}
              </div>
              <div className="flex bg-slate-900 p-0.5 rounded-lg gap-0.5 border border-slate-800">
                {currencies.map(curr => (
                  <button key={curr} onClick={() => setCurrency(curr)} className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all ${currency === curr ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}>{curr}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <button onClick={() => setView(AppView.ADMIN)} className={`p-1.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 border ${currentView === AppView.ADMIN ? 'bg-slate-900 text-emerald-400 border-emerald-500/50' : 'bg-white text-slate-400 hover:text-emerald-500 border-slate-100'}`}>
                <ShieldAlert size={15} />
              </button>
              <button onClick={() => setView(AppView.CABINET)} className="p-2.5 md:p-3 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 transition-all shadow-lg"><User size={18} /></button>
              <button
                type="button"
                onClick={() => (onCartOpen ? onCartOpen() : setView(AppView.CART))}
                className="relative p-2.5 md:p-3 rounded-xl bg-slate-900 text-white hover:bg-emerald-600 transition-all shadow-lg group"
              >
                <ShoppingCart size={18} />
                {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{totalItems}</span>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[50001] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute top-0 left-0 bottom-0 w-[300px] bg-white flex flex-col shadow-2xl animate-slide-in-left">
            <div className="p-6 border-b flex justify-between items-center">
              <span className="font-black uppercase text-slate-900 tracking-widest">Menu</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-left">
              {/* Navigation links */}
              <div className="space-y-1">
                {[...navItems, { id: AppView.CABINET, label: t('nav_cabinet'), icon: User }, { id: AppView.CART, label: t('nav_cart'), icon: ShoppingCart }, { id: AppView.ADMIN, label: t('nav_admin'), icon: ShieldAlert }].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === AppView.CART && onCartOpen) {
                        onCartOpen();
                        setIsMobileMenuOpen(false);
                        return;
                      }
                      setView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      currentView === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tight leading-snug text-left line-clamp-3 break-words min-w-0">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Language switcher */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Globe size={11} /> {t('language') || 'Language'}
                </p>
                <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl">
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                        language === lang.code
                          ? 'bg-white text-emerald-600 shadow-md'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency switcher */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Currency
                </p>
                <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl">
                  {currencies.map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        currency === curr
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 w-full relative max-md:pt-24 ${currentView === AppView.ABOUT || currentView === AppView.CONTACT ? "" : "max-w-7xl mx-auto py-8 md:py-12 px-4"}`}>
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-10 px-4 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-left">
              <GreenLightLogo />
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">GREEN <span className="text-emerald-500">LIGHT</span></span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scandinavia</span>
              </div>
            </div>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-relaxed max-w-xs">{t('footer_tagline')}</p>
          </div>
          
          <div className="flex flex-col md:items-center gap-2 text-left md:text-center">
            <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] mb-0.5">{t('footer_quick_links')}</h4>
            <div className="flex flex-col gap-1.5 md:items-center text-slate-400 font-black uppercase text-[8px] tracking-widest">
              <button onClick={() => setView(AppView.CATALOG)} className="hover:text-emerald-500 transition-colors">{t('nav_catalog')}</button>
              <button onClick={() => setView(AppView.ABOUT)} className="hover:text-emerald-500 transition-colors">{t('nav_about')}</button>
              <button onClick={() => setView(AppView.CONTACT)} className="hover:text-emerald-500 transition-colors">{t('nav_contact')}</button>
              <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:text-emerald-500 transition-colors">{t('footer_privacy')}</button>
              <button onClick={() => setIsTermsModalOpen(true)} className="hover:text-emerald-500 transition-colors">{t('footer_terms')}</button>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-2.5 text-left md:text-right">
             <div className="space-y-0.5">
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">{t('footer_contact')}</h4>
                <div className="flex flex-col md:items-end text-[8px] font-bold text-slate-400 leading-tight uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <MapPin size={8} className="text-emerald-500" />
                    <span>Katmosevej 16, Viborg 8800, Denmark</span>
                  </div>
                </div>
             </div>
             <div className="flex flex-col md:items-end gap-1">
                <a href="tel:+4561485219" className="text-xs font-black text-slate-900 hover:text-emerald-500 tracking-tight transition-colors flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-500" /> +45 61 48 52 19
                </a>
                <a href="mailto:info@glsolargroup.dk" className="text-[9px] font-black text-slate-500 hover:text-emerald-500 tracking-tight transition-colors flex items-center gap-1.5">
                  <Mail size={10} className="text-emerald-500" /> info@glsolargroup.dk
                </a>
                <a href="mailto:sales@glsolargroup.dk" className="text-[9px] font-black text-slate-500 hover:text-emerald-500 tracking-tight transition-colors flex items-center gap-1.5">
                  <Mail size={10} className="text-emerald-500" /> sales@glsolargroup.dk
                </a>
             </div>
          </div>
        </div>
      </footer>

      {/* PRIVACY POLICY MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in text-left">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsPrivacyModalOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-3xl flex flex-col overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-slate-900 p-3 rounded-2xl text-emerald-500 shadow-xl">
                  <ScrollText size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">{t('footer_privacy')}</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Green Light Scandinavia Group</p>
                </div>
              </div>
              <button onClick={() => setIsPrivacyModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                <X size={28} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-slate-700">
              <div className="space-y-10">
                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">1</span> 1. Introduction
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    When you visit our website, we collect certain information about your activity. This helps us tailor the content to your needs, improve the functionality of the resource and display relevant advertising.<br/><br/>
                    If you do not want to provide access to this data, you can delete cookies in your browser settings (see instructions below) and refrain from further use of the site. Below we describe in detail what data we collect, for what purpose and who has access to them.
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">2</span> 2. Cookies
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    Our website uses “cookies” - small text files that are stored on your device (computer, smartphone, etc.). They allow the system to recognize your device, remember your settings, collect statistics and personalize advertising offers.<br/><br/>
                    <strong>Important:</strong> Cookies are not malicious software and cannot contain viruses.<br/><br/>
                    <strong>Cookie management:</strong> You can delete or block cookies yourself. Instructions are available at: minecookies.org/cookiehandtering.<br/><br/>
                    <em>Note: Restricting the use of cookies may result in less relevant advertising, as well as the incorrect operation of certain functions of the site or restriction of access to its content.</em>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">3</span> 3. Personal data
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11 space-y-4">
                    <div>
                      <strong>General:</strong> Personal data is any information that allows you to identify yourself. Green Light Scandinavia Group collects and processes such data when you:
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Browse the pages of the site;</li>
                        <li>Subscribe to our newsletter;</li>
                        <li>Register as a user or customer;</li>
                        <li>Make purchases or order services;</li>
                        <li>Participate in surveys or competitions.</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Types of information collected:</strong> We collect technical data (unique device identifier, IP address, geolocation, device specifications) and data about your interests (pages you have visited).<br/><br/>
                      In case of your express consent (e.g. when filling out forms), we process: name, telephone number, email, physical address and payment information.
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">4</span> 4. Data security and protection
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    We guarantee the secure and confidential processing of your data in accordance with applicable law, in particular the General Data Protection Regulation (GDPR).<br/><br/>
                    <strong>Purpose:</strong> The data is used exclusively for its intended purpose and is deleted after the purpose of the processing has been achieved.<br/><br/>
                    <strong>Protection measures:</strong> We have implemented modern technical and organizational solutions to prevent leakage, loss, unauthorized access or unlawful modification of your personal data.
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">5</span> 5. Purpose of use
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    Your data helps us:<br/>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Identify you as a user.</li>
                      <li>Process your orders and payments.</li>
                      <li>Provide ordered services (e.g. delivery of newsletters).</li>
                      <li>Optimize content and services.</li>
                      <li>Show advertising that matches your interests.</li>
                    </ul>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">6</span> 6. Retention period
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    The data is stored for the period specified by law or until it is necessary to fulfill the purpose of collection. Since the retention period depends on the type of information (for example, accounting data is stored longer), no general universal period is set.
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">7</span> 7. Transfer of data to third parties
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    We may transfer aggregated data (geolocation, gender, age segment) to third parties for targeted advertising. The list of these partners is specified in the section on cookies.<br/><br/>
                    We also engage verified providers to store and process data on our behalf (only within the EU or countries that provide a similar level of protection).<br/><br/>
                    The transfer of personal information (name, email, etc.) is possible only with your personal consent.
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs">8</span> 8. Your rights and appeals
                  </h3>
                  <div className="text-sm font-medium leading-relaxed pl-11">
                    You have the full right to:<br/>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li><strong>Access:</strong> Find out what data we store about you.</li>
                      <li><strong>Portability:</strong> Receive your data in a commonly used format.</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate data.</li>
                      <li><strong>Deletion:</strong> Request complete deletion of your information.</li>
                      <li><strong>Withdrawal of consent:</strong> Stop processing your data at any time.</li>
                    </ul><br/>
                    For inquiries or complaints, please contact: <a href="mailto:sales@glsolargroup.dk" className="text-emerald-500 font-black hover:underline">sales@glsolargroup.dk</a>
                  </div>
                </section>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                 <ShieldCheck size={14} className="text-emerald-500" /> GDPR Compliant
               </div>
               <button onClick={() => setIsPrivacyModalOpen(false)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                 Accept & Close <ChevronRight size={16} />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS AND CONDITIONS MODAL */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in text-left">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsTermsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-3xl flex flex-col overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-xl">
                  <Gavel size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">{t('footer_terms')}</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Sale and Delivery Terms • v1.2</p>
                </div>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                <X size={28} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar text-slate-700">
              <div className="space-y-12">
                
                {/* PART A: CONSUMERS */}
                <div className="space-y-8">
                  <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50">
                    <h3 className="text-xl font-black text-emerald-800 uppercase tracking-tighter flex items-center gap-3">
                      PART A: FOR CONSUMERS (INDIVIDUALS)
                    </h3>
                  </div>

                  <div className="space-y-6 pl-2">
                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> F1. Scope</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        F1.1. These terms and conditions apply to all sales of products and services by Green Light Scandinavia (hereinafter referred to as the “Supplier”) to private individuals (hereinafter referred to as the “Customer”), regardless of the method of placing the order (website, email, telephone, etc.).<br/><br/>
                        F1.2. Any terms and conditions of the Customer that conflict with these provisions shall be null and void unless agreed to in writing by the Supplier.<br/><br/>
                        F1.3. These terms and conditions apply exclusively to consumers. For business customers, the terms and conditions of sections E1–E18 shall apply.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> F2. Conclusion of the contract</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        F2.1. Placing an order by the Customer does not automatically constitute the conclusion of a contract. The contract shall only be considered concluded after the Customer has received written confirmation of the order from the Supplier.<br/><br/>
                        F2.2. All offers are subject to availability of the goods in stock. The Supplier reserves the right to cancel the offer or order if the product is out of stock, without compensation to the Customer.<br/><br/>
                        F2.3. The Customer is obliged to check the order confirmation. In case of non-compliance, the Customer must notify within 5 days, otherwise the content of the confirmation is considered final.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> F3. Technical information and responsibility for installation</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        F3.1. Illustrations and technical data in the catalogs are for informational purposes only. Only those characteristics that are recorded in the written agreement are mandatory.<br/><br/>
                        F3.2. The Customer is responsible for the selection of the product and its compatibility with the existing environment.<br/><br/>
                        F3.3. Important: The Customer independently checks the suitability of the roof structure for the installation of the equipment and the compliance of the installation with local building codes and permits.<br/><br/>
                        F3.4. The Supplier does not perform the installation and is not responsible for the installation of the equipment by the Customer or third parties.<br/><br/>
                        F3.5. The recommendation of the installer by the Supplier is for informational purposes only. All connection work is carried out at the risk of the Customer.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> F4. Delivery and terms</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        F4.1. The risk passes to the Customer at the time of transfer of the goods to him or to the carrier chosen by him.<br/><br/>
                        F4.2. Delivery terms are approximate. The Supplier may divide the order into several deliveries.<br/><br/>
                        F4.3. The cost of delivery is calculated individually and indicated in the order confirmation.<br/><br/>
                        F4.4. Upon receipt of the goods, the presence of an adult to sign is mandatory. In the absence of the recipient, the re-delivery is paid by the Customer.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> F5. Right of return (14 days)</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        F5.1. The Customer has the right to cancel the purchase within 14 days of receipt of the goods.<br/><br/>
                        F5.2. The goods must be returned within 14 days of notification of cancellation. The costs of return are borne by the Customer.<br/><br/>
                        F5.3. The product must not be put into operation. If the product shows signs of use that exceed normal inspection, the Supplier has the right to reduce the amount of compensation in accordance with the loss of commercial value.<br/><br/>
                        F5.4. The return of individual parts of the sets (accessories, etc.) is not accepted.
                      </p>
                    </section>
                  </div>
                </div>

                {/* PART B: BUSINESS */}
                <div className="space-y-8">
                  <div className="bg-slate-900 p-6 rounded-[2rem]">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      PART B: FOR BUSINESS (B2B)
                    </h3>
                  </div>

                  <div className="space-y-6 pl-2">
                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E1–E3. General provisions</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        E1.1. These terms and conditions apply to all commercial transactions with legal entities.<br/><br/>
                        E3.2. The information on the website does not constitute technical advice. The Supplier is not liable for damages caused by the Customer’s independent use of the technical data.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E4. Delivery (Incoterms)</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        E4.1. Unless otherwise specified, delivery is made Ex Works (Viborg) in accordance with the applicable Incoterms.<br/><br/>
                        E4.2. The Customer is obliged to accept the goods within 6 days of notification of readiness. In the event of delay on the part of the Client, the risk of accidental loss of the goods shall pass to him immediately.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E6–E7. Prices and payment</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        E6.1. Prices are exclusive of VAT, customs duties and packaging costs.<br/><br/>
                        E6.2. The Supplier may adjust prices in the event of changes in exchange rates, the cost of materials or energy sources.<br/><br/>
                        E7.5. In the event of late payment, a penalty of 2% shall be charged for each month of delay.<br/><br/>
                        E7.6. The Client shall not be entitled to set off claims or withhold payment.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E9. Complaints and defects</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        E9.1. The Client shall inspect the goods immediately upon receipt. Visible damage shall be reported by 10:00 the following business day, attaching a photo of the packaging.<br/><br/>
                        E9.2. Complaints regarding hidden defects shall be accepted within 12 months.<br/><br/>
                        E9.3. The Supplier's liability for defects is limited (at the Supplier's option) to repair, replacement or refund. The Supplier shall not reimburse the costs of dismantling or re-installation.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E10–E11. Limitation of liability</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        E11.1. Material limitation: The Supplier shall not be liable for indirect damages, loss of profit, production stoppage or loss of energy.<br/><br/>
                        E11.3. The Supplier's total liability for any claims is limited to 2/3 of the value of the goods, but in any case may not exceed DKK 50,000.
                      </p>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3"><FileText size={16} className="text-emerald-500" /> E14. Force majeure</h4>
                      <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                        The Supplier is exempt from liability in the event of war, pandemics, strikes, cyberattacks or power supply disruptions that make the performance of the contract impossible or excessively costly.
                      </p>
                    </section>
                  </div>
                </div>

                {/* APPLICABLE LAW */}
                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 mb-4">
                    <Globe size={20} className="text-emerald-500" /> F12 / E18. Applicable law and jurisdiction
                  </h3>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-600 pl-8">
                    All disputes shall be resolved in accordance with Danish law. The place of jurisdiction for business customers is the court of Viborg. Consumers may contact the Danish Center for Complaint Resolution.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                 <ShieldCheck size={14} className="text-emerald-500" /> Legally Binding • Green Light Scandinavia Group
               </div>
               <button onClick={() => setIsTermsModalOpen(false)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl active:scale-95">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { Calculator } from './components/calculator/Calculator';
import { WishlistPage } from './components/wishlist/WishlistPage';
import { ComparePage } from './components/compare/ComparePage';
import { AboutPage } from './components/about/AboutPage';
import { ClientCabinet } from './components/cabinet/ClientCabinet';
import { LiveAssistant } from './components/ai/LiveAssistant';
import { ProductsProvider } from './contexts/ProductsContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CompareProvider } from './contexts/CompareContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserProvider } from './contexts/UserContext';
import { AppView } from './types';
import { AlertCircle, Key, Lock, X } from 'lucide-react';

const AdminPasswordPrompt: React.FC<{ onAuth: () => void; onCancel: () => void }> = ({ onAuth, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '4321') {
      onAuth();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
      <div className={`bg-white w-full max-w-md rounded-[3rem] p-10 shadow-3xl border transition-all duration-300 ${error ? 'border-rose-500 shake' : 'border-white'}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-yellow-400">
              <Lock size={20} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Admin Access</h3>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Key</label>
            <input 
              type="password" 
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 text-center text-2xl tracking-[1em] font-black outline-none focus:border-yellow-400 focus:bg-white transition-all"
            />
          </div>
          
          {error && <p className="text-[10px] text-rose-500 font-black uppercase text-center tracking-widest animate-pulse">Incorrect Password</p>}
          
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-yellow-400 text-white hover:text-yellow-950 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ABOUT);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [calcMode, setCalcMode] = useState<1 | 2>(1); // 1: AI, 2: Kits
  const { isApiRestricted, checkAndPromptKey } = useLanguage();

  const handleSetView = (view: AppView) => {
    if (view === AppView.ADMIN && !isAdminAuthenticated) {
      setShowPasswordPrompt(true);
    } else {
      setCurrentView(view);
    }
  };

  // Global event listener for view changes from components
  useEffect(() => {
    const handleViewChange = (e: any) => {
      handleSetView(e.detail);
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case AppView.CATALOG:
        return (
          <CatalogSection 
            onSelectSystem={() => { setCalcMode(1); handleSetView(AppView.CALCULATOR); }} 
          />
        );
      case AppView.CART:
        return <CartPage onCheckout={() => handleSetView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT:
        return (
          <CheckoutPage 
            onBackToCart={() => handleSetView(AppView.CART)} 
            onOrderSuccess={() => handleSetView(AppView.CATALOG)} 
            setView={handleSetView}
          />
        );
      case AppView.ADMIN:
        return <AdminPanel />;
      case AppView.CALCULATOR:
        return <Calculator initialStep={calcMode} />;
      case AppView.WISHLIST:
        return <WishlistPage />;
      case AppView.COMPARE:
        return <ComparePage />;
      case AppView.ABOUT:
        return <AboutPage onNavigateToCatalog={handleSetView} />;
      case AppView.CABINET:
        return <ClientCabinet />;
      default:
        return <CatalogSection onSelectSystem={() => { setCalcMode(1); handleSetView(AppView.CALCULATOR); }} />;
    }
  };

  return (
    <>
      <Layout currentView={currentView} setView={handleSetView}>
        {isApiRestricted && (
          <div className="mb-8 bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="font-black text-rose-900 uppercase tracking-tighter text-sm">System API Key Blocked</h4>
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-1">The built-in key has been reported as leaked. AI features are limited.</p>
              </div>
            </div>
            <button 
              onClick={() => checkAndPromptKey()}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 shadow-xl"
            >
              <Key size={16} /> Select Your Own Key
            </button>
          </div>
        )}
        {renderView()}
      </Layout>
      <LiveAssistant />
      
      {showPasswordPrompt && (
        <AdminPasswordPrompt 
          onAuth={() => {
            setIsAdminAuthenticated(true);
            setShowPasswordPrompt(false);
            setCurrentView(AppView.ADMIN);
          }}
          onCancel={() => setShowPasswordPrompt(false)}
        />
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <LanguageProvider>
        <UserProvider>
          <ProductsProvider>
            <CartProvider>
              <WishlistProvider>
                <CompareProvider>
                  <AppContent />
                </CompareProvider>
              </WishlistProvider>
            </CartProvider>
          </ProductsProvider>
        </UserProvider>
      </LanguageProvider>
    </NotificationProvider>
  );
};

export default App;

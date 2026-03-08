import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactGA from "react-ga4";
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { OrderSuccessPage } from './components/checkout/OrderSuccessPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminPasswordPrompt } from './components/admin/AdminPasswordPrompt';
import { LiveAssistant } from './components/ai/LiveAssistant';
import { Calculator } from './components/calculator/Calculator';
import { WishlistPage } from './components/wishlist/WishlistPage';
import { ServicePage } from './components/service/ServicePage';
import { AboutPage } from './components/about/AboutPage';
import { ClientCabinet } from './components/cabinet/ClientCabinet';
import { ProductsProvider } from './contexts/ProductsContext';
import { safeStorage } from './utils/storage';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CompareProvider } from './contexts/CompareContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserProvider } from './contexts/UserContext';
import { AppView } from './types';
import { useUser } from './contexts/UserContext';
import { useCart } from './contexts/CartContext';


const GA_MEASUREMENT_ID = "G-YDHWKZZ7HT";
try {
  if (GA_MEASUREMENT_ID && !GA_MEASUREMENT_ID.includes('YOUR_ID')) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }
} catch (e) {
  console.warn('[GA] Initialization skipped or failed');
}

export class ErrorBoundary extends React.Component<{children?: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children?: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-12 text-center m-10 glass-panel rounded-[3rem] notranslate" translate="no">
        <div className="text-rose-500 font-black uppercase tracking-widest text-xs mb-4">System Anomaly Detected</div>
        <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">Interface standard failed</h2>
        <button onClick={() => window.location.reload()} className="btn-action mx-auto">Reboot Terminal</button>
      </div>
    );
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ABOUT);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const { currentUser } = useUser();
  const { applyDiscount, setCartUser } = useCart();

  // ── Cart bridge: migrate cart + apply discount when login/logout ─────────
  useEffect(() => {
    setCartUser(currentUser?.id ?? null);
  }, [currentUser?.id, setCartUser]);

  useEffect(() => {
    applyDiscount(currentUser?.discount ?? 0);
  }, [currentUser?.discount, applyDiscount]);

  useEffect(() => {
    const stored = safeStorage.getItem('voltstore_admin_auth_v5');
    if (stored) {
      const expiry = Number(stored);
      // Only accept new timestamp format — reject old 'true' string sessions
      const isValid = expiry > 0 && Date.now() < expiry;
      if (isValid) {
        setIsAdminAuthenticated(true);
      } else {
        // Expired or old format — force re-login
        safeStorage.removeItem('voltstore_admin_auth_v5');
      }
    }
  }, []);

  const handleSetView = useCallback((view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAdminSuccess = useCallback(() => {
    setIsAdminAuthenticated(true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    safeStorage.removeItem('voltstore_admin_auth_v5');
    setIsAdminAuthenticated(false);
    handleSetView(AppView.ABOUT);
  }, [handleSetView]);

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: currentView, title: currentView });
  }, [currentView]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('id') && params.get('status')) {
      handleSetView(AppView.SUCCESS);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // Open required view from URL (?view=catalog&product=ID)
    const viewParam = params.get('view');
    if (viewParam) {
      const viewMap: Record<string, AppView> = {
        catalog: AppView.CATALOG,
        cart: AppView.CART,
        calculator: AppView.CALCULATOR,
        about: AppView.ABOUT,
        service: AppView.SERVICE,
        wishlist: AppView.WISHLIST,
      };
      if (viewMap[viewParam]) handleSetView(viewMap[viewParam]);
    }
    const handleViewChange = (e: any) => { if (e.detail) handleSetView(e.detail as AppView); };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, [handleSetView]);

  const renderedView = useMemo(() => {
    switch (currentView) {
      case AppView.CATALOG: return <CatalogSection />;
      case AppView.CART: return <CartPage onCheckout={() => handleSetView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT: return <CheckoutPage onBackToCart={() => handleSetView(AppView.CART)} onOrderSuccess={() => handleSetView(AppView.SUCCESS)} setView={handleSetView} />;
      case AppView.SUCCESS: return <OrderSuccessPage onBackToCatalog={() => handleSetView(AppView.CATALOG)} />;
      case AppView.ADMIN: 
        if (!isAdminAuthenticated) {
          return <AdminPasswordPrompt onSuccess={handleAdminSuccess} />;
        }
        return <AdminPanel onLogout={handleAdminLogout} />;
      case AppView.CALCULATOR: return <Calculator />;
      case AppView.WISHLIST: return <WishlistPage />;
      case AppView.SERVICE: return <ServicePage />;
      case AppView.ABOUT: return <AboutPage onNavigateToCatalog={handleSetView} />;
      case AppView.CABINET: return <ClientCabinet />;
      default: return <AboutPage onNavigateToCatalog={handleSetView} />;
    }
  }, [currentView, isAdminAuthenticated, handleAdminLogout, handleSetView, handleAdminSuccess]);

  return (
    <div 
      id="app-shell" 
      className="min-h-screen relative notranslate" 
      translate="no" 
      suppressHydrationWarning={true}
    >
      <Layout currentView={currentView} setView={handleSetView}>
        <div id="app-main-content" className="min-h-[70vh] relative notranslate" translate="no">
          <ErrorBoundary>
            {renderedView}
            <LiveAssistant />
          </ErrorBoundary>
        </div>
      </Layout>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <div 
      id="app-providers-root" 
      className="notranslate" 
      translate="no" 
      suppressHydrationWarning={true}
    >
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
    </div>
  );
};

export default App;
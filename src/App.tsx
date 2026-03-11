import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import ReactGA from "react-ga4";
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { AboutPage } from './components/about/AboutPage';
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

const CheckoutPage = lazy(() => import('./components/checkout/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderSuccessPage = lazy(() => import('./components/checkout/OrderSuccessPage').then(m => ({ default: m.OrderSuccessPage })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const AdminPasswordPrompt = lazy(() => import('./components/admin/AdminPasswordPrompt').then(m => ({ default: m.AdminPasswordPrompt })));
const LiveAssistant = lazy(() => import('./components/ai/LiveAssistant').then(m => ({ default: m.LiveAssistant })));
const Calculator = lazy(() => import('./components/calculator/Calculator').then(m => ({ default: m.Calculator })));
const WishlistPage = lazy(() => import('./components/wishlist/WishlistPage').then(m => ({ default: m.WishlistPage })));
const ServicePage = lazy(() => import('./components/service/ServicePage').then(m => ({ default: m.ServicePage })));
const ClientCabinet = lazy(() => import('./components/cabinet/ClientCabinet').then(m => ({ default: m.ClientCabinet })));

const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading…</div>
  </div>
);


const GA_MEASUREMENT_ID = "G-YDHWKZZ7HT";
try {
  if (GA_MEASUREMENT_ID && !GA_MEASUREMENT_ID.includes('YOUR_ID')) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }
} catch (e) {
  console.warn('[GA] Initialization skipped or failed');
}

export class ErrorBoundary extends React.Component<
  { children?: React.ReactNode; onRecover?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children?: React.ReactNode; onRecover?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 notranslate" translate="no">
        <div className="glass-panel rounded-[3rem] p-8 md:p-12 text-center max-w-xl w-full">
          <div className="text-rose-500 font-black uppercase tracking-widest text-xs mb-4">System Anomaly Detected</div>
          <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase">Interface standard failed</h2>
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            {this.props.onRecover && (
              <button onClick={this.props.onRecover} className="btn-action w-full sm:w-auto">На головну</button>
            )}
            <button onClick={() => window.location.reload()} className="btn-action w-full sm:w-auto">Reboot Terminal</button>
          </div>
        </div>
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
    // оновлюємо URL, щоб кнопка "Назад" на мобільних повертала між екранами, а не викидала з сайту
    const params = new URLSearchParams(window.location.search);
    const slugMap: Record<AppView, string> = {
      [AppView.CATALOG]: 'catalog',
      [AppView.CART]: 'cart',
      [AppView.CALCULATOR]: 'calculator',
      [AppView.ABOUT]: 'about',
      [AppView.SERVICE]: 'service',
      [AppView.WISHLIST]: 'wishlist',
      [AppView.ADMIN]: 'admin',
      [AppView.CABINET]: 'cabinet',
      [AppView.CHECKOUT]: 'checkout',
      [AppView.SUCCESS]: 'success',
    };
    const slug = slugMap[view];
    if (slug) {
      params.set('view', slug);
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.pushState({ view: slug }, '', url);
    }
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
          admin: AppView.ADMIN,
          cabinet: AppView.CABINET,
          checkout: AppView.CHECKOUT,
          success: AppView.SUCCESS,
        };
        if (viewMap[viewParam]) {
          setCurrentView(viewMap[viewParam]);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    const handleViewChange = (e: any) => { if (e.detail) handleSetView(e.detail as AppView); };
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const viewParam = p.get('view') || 'about';
      const viewMap: Record<string, AppView> = {
        catalog: AppView.CATALOG,
        cart: AppView.CART,
        calculator: AppView.CALCULATOR,
        about: AppView.ABOUT,
        service: AppView.SERVICE,
        wishlist: AppView.WISHLIST,
        admin: AppView.ADMIN,
        cabinet: AppView.CABINET,
        checkout: AppView.CHECKOUT,
        success: AppView.SUCCESS,
      };
      const v = viewMap[viewParam] ?? AppView.ABOUT;
      setCurrentView(v);
    };
    window.addEventListener('changeView', handleViewChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('changeView', handleViewChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleSetView]);

  const renderedView = useMemo(() => {
    switch (currentView) {
      case AppView.CATALOG: return <CatalogSection />;
      case AppView.CART: return <CartPage onCheckout={() => handleSetView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT:
        return (
          <Suspense fallback={<PageLoader />}>
            <CheckoutPage
              onBackToCart={() => handleSetView(AppView.CART)}
              onOrderSuccess={() => handleSetView(AppView.SUCCESS)}
              setView={handleSetView}
            />
          </Suspense>
        );
      case AppView.SUCCESS:
        return (
          <Suspense fallback={<PageLoader />}>
            <OrderSuccessPage onBackToCatalog={() => handleSetView(AppView.CATALOG)} />
          </Suspense>
        );
      case AppView.ADMIN: 
        if (!isAdminAuthenticated) {
          return (
            <Suspense fallback={<PageLoader />}>
              <AdminPasswordPrompt onSuccess={handleAdminSuccess} />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<PageLoader />}>
            <AdminPanel onLogout={handleAdminLogout} />
          </Suspense>
        );
      case AppView.CALCULATOR:
        return (
          <Suspense fallback={<PageLoader />}>
            <Calculator />
          </Suspense>
        );
      case AppView.WISHLIST:
        return (
          <Suspense fallback={<PageLoader />}>
            <WishlistPage />
          </Suspense>
        );
      case AppView.SERVICE:
        return (
          <Suspense fallback={<PageLoader />}>
            <ServicePage />
          </Suspense>
        );
      case AppView.ABOUT: return <AboutPage onNavigateToCatalog={handleSetView} />;
      case AppView.CABINET:
        return (
          <Suspense fallback={<PageLoader />}>
            <ClientCabinet />
          </Suspense>
        );
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
          <ErrorBoundary key={currentView} onRecover={() => handleSetView(AppView.ABOUT)}>
            {renderedView}
            <Suspense fallback={null}>
              <LiveAssistant />
            </Suspense>
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
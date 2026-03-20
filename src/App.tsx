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
} catch {
  console.warn('[GA] Initialization skipped or failed');
}

/** Catches errors in Cabinet so mobile users see a clear message instead of generic "Interface standard failed" */
class CabinetErrorBoundary extends React.Component<
  { children: React.ReactNode; onGoHome: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4 py-10">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Cabinet unavailable</h2>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-6">Please try again later or use a desktop browser.</p>
            <button onClick={() => { this.setState({ hasError: false }); this.props.onGoHome(); }} className="btn-action w-full">Go home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
          wishlist: AppView.CATALOG,
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
        wishlist: AppView.CATALOG,
        admin: AppView.ADMIN,
        cabinet: AppView.CABINET,
        checkout: AppView.CHECKOUT,
        success: AppView.SUCCESS,
      };
      const v = viewMap[viewParam] ?? AppView.ABOUT;
      setCurrentView(v);
      if (viewParam === 'wishlist') {
        const p = new URLSearchParams(window.location.search);
        p.set('view', 'catalog');
        const qs = p.toString();
        window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
      }
    };
    window.addEventListener('changeView', handleViewChange);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('changeView', handleViewChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleSetView]);

  // Prefetch checkout bundle when user is on Cart (reduces visible loading)
  useEffect(() => {
    if (currentView === AppView.CART) {
      import('./components/checkout/CheckoutPage');
    }
  }, [currentView]);

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
      case AppView.SERVICE:
        return (
          <Suspense fallback={<PageLoader />}>
            <ServicePage />
          </Suspense>
        );
      case AppView.ABOUT: return <AboutPage onNavigateToCatalog={handleSetView} />;
      case AppView.CABINET:
        return (
          <CabinetErrorBoundary key="cabinet" onGoHome={() => handleSetView(AppView.ABOUT)}>
            <Suspense fallback={<PageLoader />}>
              <ClientCabinet />
            </Suspense>
          </CabinetErrorBoundary>
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
                <CompareProvider>
                  <AppContent />
                </CompareProvider>
              </CartProvider>
            </ProductsProvider>
          </UserProvider>
        </LanguageProvider>
      </NotificationProvider>
    </div>
  );
};

export default App;
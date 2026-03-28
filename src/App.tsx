import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy, useLayoutEffect } from 'react';
import ReactGA from 'react-ga4';
import { BrowserRouter, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { AboutPage } from './components/about/AboutPage';
import { ContactPage } from './components/pages/ContactPage';
import { ProductsProvider } from './contexts/ProductsContext';
import { safeStorage } from './utils/storage';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CompareProvider } from './contexts/CompareContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserProvider } from './contexts/UserContext';
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutSignInModal } from './components/auth/CheckoutSignInModal';
import { AppView } from './types';
import { useUser } from './contexts/UserContext';
import { useCart } from './contexts/CartContext';
import {
  CATALOG_SLUG_TO_CATEGORY,
  countryCurrency,
  countryHtmlLang,
  countryLanguage,
  getRememberedSiteCountry,
  isSiteCountry,
  rememberSiteCountry,
  type SiteCountry,
} from './routing/siteCountry';
import { syncHreflangAndCanonical } from './seo/hreflang';
import { syncDocumentSeo } from './seo/syncDocumentSeo';

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

function appViewToLegacyQuery(view: AppView): string | null {
  const map: Partial<Record<AppView, string>> = {
    [AppView.CATALOG]: 'catalog',
    [AppView.CART]: 'cart',
    [AppView.CALCULATOR]: 'calculator',
    [AppView.ABOUT]: 'about',
    [AppView.SERVICE]: 'service',
    [AppView.CHECKOUT]: 'checkout',
    [AppView.SUCCESS]: 'success',
  };
  return map[view] ?? null;
}

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;
  const { setLanguage, setCurrency, language } = useLanguage();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutSignInOpen, setCheckoutSignInOpen] = useState(false);
  const { currentUser } = useUser();
  const { applyDiscount, setCartUser } = useCart();

  const routeParsed = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    let siteCountry: SiteCountry | null = null;
    let pageSegments: string[] = segments;
    if (segments[0] && isSiteCountry(segments[0])) {
      siteCountry = segments[0];
      pageSegments = segments.slice(1);
    }
    return { siteCountry, pageSegments, segments };
  }, [pathname]);

  const { siteCountry, pageSegments, segments } = routeParsed;

  const viewQ = useMemo(() => new URLSearchParams(search).get('view'), [search]);
  const idQ = useMemo(() => new URLSearchParams(search).get('id'), [search]);
  const statusQ = useMemo(() => new URLSearchParams(search).get('status'), [search]);

  const transactionalFromQuery =
    viewQ === 'admin' ||
    viewQ === 'cabinet' ||
    (viewQ === 'success' && !!idQ) ||
    (!!idQ && !!statusQ);

  const { currentView, catalogSlug, invalidPath, invalidCountry } = useMemo(() => {
    if (transactionalFromQuery) {
      if (viewQ === 'admin') return { currentView: AppView.ADMIN, catalogSlug: null as string | null, invalidPath: false, invalidCountry: null as SiteCountry | null };
      if (viewQ === 'cabinet') return { currentView: AppView.CABINET, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (viewQ === 'success' || (!!idQ && !!statusQ)) return { currentView: AppView.SUCCESS, catalogSlug: null, invalidPath: false, invalidCountry: null };
    }

    if (siteCountry) {
      const p = pageSegments[0] || 'about';
      if (p === 'contact') return { currentView: AppView.CONTACT, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (p === 'cart') return { currentView: AppView.CART, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (p === 'checkout') return { currentView: AppView.CHECKOUT, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (p === 'calculator') return { currentView: AppView.CALCULATOR, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (p === 'service') return { currentView: AppView.SERVICE, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (p === 'catalog') return { currentView: AppView.CATALOG, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (CATALOG_SLUG_TO_CATEGORY[p]) return { currentView: AppView.CATALOG, catalogSlug: p, invalidPath: false, invalidCountry: null };
      if (p === 'about' || p === 'home') return { currentView: AppView.ABOUT, catalogSlug: null, invalidPath: false, invalidCountry: null };
      if (pageSegments.length === 0) return { currentView: AppView.ABOUT, catalogSlug: null, invalidPath: false, invalidCountry: null };
      return { currentView: AppView.ABOUT, catalogSlug: null, invalidPath: true, invalidCountry: siteCountry };
    }

    const legacyMap: Record<string, AppView> = {
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
    if (viewQ && legacyMap[viewQ]) {
      return { currentView: legacyMap[viewQ], catalogSlug: null, invalidPath: false, invalidCountry: null };
    }
    if (segments.length > 0 && !isSiteCountry(segments[0])) {
      return { currentView: AppView.ABOUT, catalogSlug: null, invalidPath: true, invalidCountry: null };
    }
    return { currentView: AppView.ABOUT, catalogSlug: null, invalidPath: false, invalidCountry: null };
  }, [transactionalFromQuery, viewQ, idQ, statusQ, siteCountry, pageSegments, segments]);

  useLayoutEffect(() => {
    if (transactionalFromQuery && pathname !== '/') {
      navigate({ pathname: '/', search: location.search }, { replace: true });
    }
  }, [transactionalFromQuery, pathname, navigate, location.search]);

  useLayoutEffect(() => {
    if (pathname === '/catalog' || pathname === '/catalog/') {
      navigate('/dk/catalog', { replace: true });
    }
  }, [pathname, navigate]);

  useLayoutEffect(() => {
    if (pathname !== '/' && pathname !== '') return;
    if (transactionalFromQuery) return;
    if (viewQ) return;
    navigate('/dk', { replace: true });
  }, [pathname, transactionalFromQuery, viewQ, navigate]);

  useEffect(() => {
    if (siteCountry) {
      rememberSiteCountry(siteCountry);
      setLanguage(countryLanguage[siteCountry]);
      setCurrency(countryCurrency[siteCountry]);
      document.documentElement.lang = countryHtmlLang[siteCountry];
    }
  }, [siteCountry, setLanguage, setCurrency]);

  useEffect(() => {
    const stored = safeStorage.getItem('voltstore_admin_auth_v5');
    if (stored) {
      const expiry = Number(stored);
      const isValid = expiry > 0 && Date.now() < expiry;
      if (isValid) {
        setIsAdminAuthenticated(true);
      } else {
        safeStorage.removeItem('voltstore_admin_auth_v5');
      }
    }
  }, []);

  useEffect(() => {
    setCartUser(currentUser?.id ?? null);
  }, [currentUser?.id, setCartUser]);

  useEffect(() => {
    applyDiscount(currentUser?.discount ?? 0);
  }, [currentUser?.discount, applyDiscount]);

  const setView = useCallback(
    (view: AppView) => {
      if (view === AppView.ADMIN) {
        navigate('/?view=admin');
        return;
      }
      if (view === AppView.CABINET) {
        navigate('/?view=cabinet');
        return;
      }
      if (view === AppView.SUCCESS) {
        navigate('/?view=success');
        return;
      }

      const c: SiteCountry = siteCountry ?? getRememberedSiteCountry() ?? 'dk';

      switch (view) {
        case AppView.ABOUT:
          navigate(`/${c}/about`);
          return;
        case AppView.CONTACT:
          navigate(`/${c}/contact`);
          return;
        case AppView.CATALOG:
          navigate(`/${c}/catalog`);
          return;
        case AppView.CART:
          navigate(`/${c}/cart`);
          return;
        case AppView.CHECKOUT:
          navigate(`/${c}/checkout`);
          return;
        case AppView.CALCULATOR:
          navigate(`/${c}/calculator`);
          return;
        case AppView.SERVICE:
          navigate(`/${c}/service`);
          return;
        default: {
          const slug = appViewToLegacyQuery(view);
          if (slug) navigate({ pathname: '/', search: `view=${slug}` });
        }
      }
    },
    [navigate, siteCountry],
  );

  useEffect(() => {
    const stringToView: Record<string, AppView> = {
      catalog: AppView.CATALOG,
      cart: AppView.CART,
      calculator: AppView.CALCULATOR,
      about: AppView.ABOUT,
      service: AppView.SERVICE,
      admin: AppView.ADMIN,
      cabinet: AppView.CABINET,
      checkout: AppView.CHECKOUT,
      success: AppView.SUCCESS,
      contact: AppView.CONTACT,
    };
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AppView | string>).detail;
      if (detail === 'about' || detail === AppView.ABOUT) setView(AppView.ABOUT);
      else if (typeof detail === 'string' && stringToView[detail]) setView(stringToView[detail]);
      else if (typeof detail === 'string' && (Object.values(AppView) as string[]).includes(detail)) {
        setView(detail as AppView);
      } else if (detail) setView(detail as AppView);
    };
    window.addEventListener('changeView', handler as EventListener);
    return () => window.removeEventListener('changeView', handler as EventListener);
  }, [setView]);

  useEffect(() => {
    const goFullCart = () => {
      setCartDrawerOpen(false);
      setView(AppView.CART);
    };
    const openSignIn = () => setCheckoutSignInOpen(true);
    window.addEventListener('gls-nav-cart-full', goFullCart as EventListener);
    window.addEventListener('gls-open-checkout-sign-in', openSignIn as EventListener);
    return () => {
      window.removeEventListener('gls-nav-cart-full', goFullCart as EventListener);
      window.removeEventListener('gls-open-checkout-sign-in', openSignIn as EventListener);
    };
  }, [setView]);

  const handleAdminSuccess = useCallback(() => {
    setIsAdminAuthenticated(true);
  }, []);

  const handleAdminLogout = useCallback(() => {
    safeStorage.removeItem('voltstore_admin_auth_v5');
    setIsAdminAuthenticated(false);
    setView(AppView.ABOUT);
  }, [setView]);

  useEffect(() => {
    ReactGA.send({ hitType: 'pageview', page: pathname + search, title: String(currentView) });
  }, [pathname, search, currentView]);

  useEffect(() => {
    syncHreflangAndCanonical({
      pathname,
      search,
      siteCountry,
      transactional: transactionalFromQuery,
    });
  }, [pathname, search, siteCountry, transactionalFromQuery]);

  useEffect(() => {
    syncDocumentSeo({
      language,
      siteCountry,
      pathname,
      search,
      currentView,
      catalogSlug,
      transactional: transactionalFromQuery,
    });
  }, [language, siteCountry, pathname, search, currentView, catalogSlug, transactionalFromQuery]);

  useEffect(() => {
    if (currentView !== AppView.CART) return;
    import('./components/checkout/CheckoutPage');
  }, [currentView]);

  const catalogNavigate = useCallback(() => {
    const c: SiteCountry = siteCountry ?? getRememberedSiteCountry() ?? 'dk';
    navigate(`/${c}/catalog`);
  }, [navigate, siteCountry]);

  const renderedView = useMemo(() => {
    switch (currentView) {
      case AppView.CATALOG:
        return <CatalogSection catalogSlug={catalogSlug} />;
      case AppView.CART:
        return <CartPage onCheckout={() => setView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT:
        return (
          <Suspense fallback={<PageLoader />}>
            <CheckoutPage
              onBackToCart={() => setView(AppView.CART)}
              onOrderSuccess={(orderId) => {
                if (orderId) {
                  navigate(`/?view=success&id=${encodeURIComponent(orderId)}`);
                } else {
                  navigate('/?view=success');
                }
              }}
              setView={setView}
            />
          </Suspense>
        );
      case AppView.SUCCESS:
        return (
          <Suspense fallback={<PageLoader />}>
            <OrderSuccessPage onBackToCatalog={catalogNavigate} />
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
      case AppView.CONTACT:
        return <ContactPage />;
      case AppView.ABOUT:
        return <AboutPage onNavigateToCatalog={setView} />;
      case AppView.CABINET:
        return (
          <CabinetErrorBoundary key="cabinet" onGoHome={() => setView(AppView.ABOUT)}>
            <Suspense fallback={<PageLoader />}>
              <ClientCabinet />
            </Suspense>
          </CabinetErrorBoundary>
        );
      default:
        return <AboutPage onNavigateToCatalog={setView} />;
    }
  }, [currentView, catalogSlug, isAdminAuthenticated, handleAdminLogout, setView, handleAdminSuccess, catalogNavigate]);

  if (invalidPath && invalidCountry) {
    return <Navigate to={`/${invalidCountry}/about`} replace />;
  }
  if (invalidPath) {
    return <Navigate to="/dk" replace />;
  }

  return (
    <>
      <div
        id="app-shell"
        className="min-h-screen relative notranslate"
        translate="no"
        suppressHydrationWarning={true}
      >
        <Layout currentView={currentView} setView={setView} siteCountry={siteCountry} onCartOpen={() => setCartDrawerOpen(true)}>
          <div id="app-main-content" className="min-h-[70vh] relative notranslate" translate="no">
            <ErrorBoundary key={String(currentView)} onRecover={() => setView(AppView.ABOUT)}>
              {renderedView}
              <Suspense fallback={null}>
                <LiveAssistant />
              </Suspense>
            </ErrorBoundary>
          </div>
        </Layout>
      </div>
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onCheckout={() => setView(AppView.CHECKOUT)}
        onSignInToOrder={() => setCheckoutSignInOpen(true)}
        onGuestCheckout={() => setView(AppView.CHECKOUT)}
      />
      <CheckoutSignInModal isOpen={checkoutSignInOpen} onClose={() => setCheckoutSignInOpen(false)} siteCountry={siteCountry} />
    </>
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
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
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
      </BrowserRouter>
    </div>
  );
};

export default App;

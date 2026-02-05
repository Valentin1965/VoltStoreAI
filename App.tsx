
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdminPasswordPrompt } from './components/admin/AdminPasswordPrompt';
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
import { LanguageProvider } from './contexts/LanguageContext';
import { UserProvider } from './contexts/UserContext';
import { AppView } from './types';

// Error Boundary for UI safety
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-10 text-center uppercase font-black text-rose-500 bg-rose-50 rounded-3xl border border-rose-100 m-10">
        <span>System Error. Please refresh the page.</span>
      </div>
    );
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ABOUT);
  const [calcMode, setCalcMode] = useState<1 | 3>(1);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('voltstore_admin_auth') === 'true';
  });

  const handleSetView = useCallback((view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle logout from admin
  const handleAdminLogout = useCallback(() => {
    localStorage.removeItem('voltstore_admin_auth');
    setIsAdminAuthenticated(false);
    handleSetView(AppView.ABOUT);
  }, [handleSetView]);

  useEffect(() => {
    const handleViewChange = (e: any) => {
      if (e.detail) handleSetView(e.detail as AppView);
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, [handleSetView]);

  const renderedView = useMemo(() => {
    switch (currentView) {
      case AppView.CATALOG:
        return <CatalogSection onSelectSystem={() => { setCalcMode(1); handleSetView(AppView.CALCULATOR); }} />;
      case AppView.CART:
        return <CartPage onCheckout={() => handleSetView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT:
        return <CheckoutPage onBackToCart={() => handleSetView(AppView.CART)} onOrderSuccess={() => handleSetView(AppView.CATALOG)} setView={handleSetView} />;
      case AppView.ADMIN:
        return isAdminAuthenticated 
          ? <AdminPanel onLogout={handleAdminLogout} /> 
          : <AdminPasswordPrompt onSuccess={() => setIsAdminAuthenticated(true)} />;
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
        return <AboutPage onNavigateToCatalog={handleSetView} />;
    }
  }, [currentView, calcMode, handleSetView, isAdminAuthenticated, handleAdminLogout]);

  return (
    <Layout currentView={currentView} setView={handleSetView}>
      <div 
        id="view-wrapper" 
        key={`${currentView}-${isAdminAuthenticated}`} 
        className="animate-fade-in min-h-[50vh]"
        translate="no"
      >
        <ErrorBoundary>
          {renderedView}
        </ErrorBoundary>
      </div>
      <LiveAssistant />
    </Layout>
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

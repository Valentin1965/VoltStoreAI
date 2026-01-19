import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CartPage } from './components/cart/CartPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { AdminPanel } from './components/admin/AdminPanel';
import { Calculator } from './components/calculator/Calculator';
import { WishlistPage } from './components/wishlist/WishlistPage';
import { LiveAssistant } from './components/ai/LiveAssistant';
import { ProductsProvider } from './contexts/ProductsContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CATALOG);

  const renderView = () => {
    switch (currentView) {
      case AppView.CATALOG:
        return <CatalogSection />;
      case AppView.CART:
        return <CartPage onCheckout={() => setCurrentView(AppView.CHECKOUT)} />;
      case AppView.CHECKOUT:
        return <CheckoutPage onBackToCart={() => setCurrentView(AppView.CART)} onOrderSuccess={() => setCurrentView(AppView.CATALOG)} />;
      case AppView.ADMIN:
        return <AdminPanel />;
      case AppView.CALCULATOR:
        return <Calculator />;
      case AppView.WISHLIST:
        return <WishlistPage />;
      default:
        return <CatalogSection />;
    }
  };

  return (
    <NotificationProvider>
      <ProductsProvider>
        <CartProvider>
          <WishlistProvider>
            <Layout currentView={currentView} setView={setCurrentView}>
              {renderView()}
            </Layout>
            <LiveAssistant />
          </WishlistProvider>
        </CartProvider>
      </ProductsProvider>
    </NotificationProvider>
  );
};

export default App;
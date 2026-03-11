import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './App';
import './index.css';

const setupApp = () => {
  const container = document.getElementById('root');
  if (!container) {
    setTimeout(setupApp, 20);
    return;
  }

  // Register Service Worker for PWA + Push notifications
  // (Required so navigator.serviceWorker.ready resolves and PushManager works)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[SW] registration failed', err);
      });
    });
  }

  // Create a fresh isolated div — prevents browser extensions (Edge Copilot etc.)
  // from injecting text nodes that trigger React hydration error #418
  const freshMount = document.createElement('div');
  freshMount.style.display = 'contents';
  container.innerHTML = '';
  container.appendChild(freshMount);

  const root = createRoot(freshMount);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}

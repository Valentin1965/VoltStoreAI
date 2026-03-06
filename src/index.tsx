import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const setupApp = () => {
  const container = document.getElementById('root');
  
  if (container) {
    // Clean the container from any platform injections
    // before initializing React.
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    const root = createRoot(container);
    root.render(<App />);
  } else {
    // If container is not available yet, wait
    setTimeout(setupApp, 20);
  }
};

// Prevent hydration issues caused by third-party scripts
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupApp);
} else {
  setupApp();
}
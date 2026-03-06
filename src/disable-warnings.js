// disable-warnings.js - додати в index.html перед іншими скриптами
(function() {
  // Зберегти оригінальні функції
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;
  
  // Список фраз для фільтрації
  const filterPatterns = [
    'Download the React DevTools',
    'react.dev/link/react-devtools',
    'better development experience',
    '[Intervention]',
    'Images loaded lazily',
    'Load events are deferred',
    'installHook',
    '__REACT_DEVTOOLS',
    'shimmed the React DevTools'
  ];
  
  // Функція для перевірки
  const shouldFilter = (message) => {
    return filterPatterns.some(pattern => 
      typeof message === 'string' && message.includes(pattern)
    );
  };
  
  // Перевизначити console.info
  console.info = function(...args) {
    if (!shouldFilter(args.join(' '))) {
      originalInfo.apply(console, args);
    }
  };
  
  // Перевизначити console.warn
  console.warn = function(...args) {
    if (!shouldFilter(args.join(' '))) {
      originalWarn.apply(console, args);
    }
  };
  
  // Перевизначити console.error
  console.error = function(...args) {
    if (!shouldFilter(args.join(' '))) {
      originalError.apply(console, args);
    }
  };
  
  // Опційно: фільтрувати console.log
  console.log = function(...args) {
    if (!shouldFilter(args.join(' '))) {
      originalLog.apply(console, args);
    }
  };
  
  // Вимкнути DevTools глобально
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    Object.keys(window.__REACT_DEVTOOLS_GLOBAL_HOOK__).forEach(key => {
      if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] === 'function') {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = function() {};
      }
    });
  }
})();
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info as InfoIcon, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper function to generate stable IDs
const generateId = () => `notif_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      timeoutsRef.current.forEach(timeout => window.clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (timeoutsRef.current.has(id)) {
      window.clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = generateId();
    
    setNotifications(prev => [...prev, { id, message, type }]);
    
    const timeout = window.setTimeout(() => {
      removeNotification(id);
    }, 4500);
    
    timeoutsRef.current.set(id, timeout);
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      <div id="notification-root-container" className="contents notranslate" translate="no">
        {children}
        <div 
          id="notification-portal"
          className="fixed bottom-8 right-8 z-[10000] flex flex-col gap-4 max-w-md w-full pointer-events-none notranslate"
          translate="no"
        >
          {notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-center gap-4 p-5 rounded-3xl backdrop-blur-xl border shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-fade-in transition-all group pointer-events-auto notranslate ${
                n.type === 'success' 
                  ? 'bg-emerald-500/90 border-emerald-400/50 text-white' 
                  : n.type === 'error' 
                  ? 'bg-rose-500/90 border-rose-400/50 text-white' 
                  : 'bg-slate-900/90 border-slate-700/50 text-white'
              }`}
              translate="no"
            >
              <div className="shrink-0">
                {n.type === 'success' && <CheckCircle2 size={24} />}
                {n.type === 'error' && <AlertCircle size={24} />}
                {n.type === 'info' && <InfoIcon size={24} />}
              </div>
              <p className="flex-1 font-bold text-sm uppercase tracking-tight leading-tight notranslate">
                {n.message}
              </p>
              <button 
                onClick={() => removeNotification(n.id)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors pointer-events-auto"
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      addNotification: (msg: string, type: NotificationType) => console.warn('NotificationProvider not found', msg)
    };
  }
  return context;
};

import React, { useEffect } from 'react';
import { MessageSquare, Zap, ExternalLink } from 'lucide-react';

/**
 * LiveAssistant Component
 * Integrates professional CRM (Crisp) and provides WhatsApp fallback.
 */
export const LiveAssistant: React.FC = () => {
  useEffect(() => {
    // --- CRM INTEGRATION AREA ---
    // To enable real-time chat, replace 'YOUR_WEBSITE_ID' with your actual ID from crisp.chat
    const CRISP_WEBSITE_ID = "e5c5405a-e160-4a95-9667-e4a336346b7e"; // Insert ID here to activate Crisp
    
    if (CRISP_WEBSITE_ID) {
      (window as any).$crisp = [];
      (window as any).CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;
      (function() {
        const d = document;
        const s = d.createElement("script");
        s.src = "https://client.crisp.chat/l.js";
        s.async = true;
        d.getElementsByTagName("head")[0].appendChild(s);
      })();
    }
  }, []);

  const handleSupportAction = () => {
    // If Crisp is loaded, it usually handles its own button. 
    // This button acts as a direct WhatsApp gateway by default.
    window.open('https://wa.me/4531185819', '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end gap-3">
      {/* Tooltip on hover */}
      <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-2xl pointer-events-none border border-white/10 mb-1">
        Expert Response <span className="text-emerald-400">~5 mins</span>
      </div>

      <button 
        onClick={handleSupportAction}
        className="group relative flex items-center gap-4 bg-slate-900 text-white pl-6 pr-5 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-emerald-600 transition-all duration-500 active:scale-95 border border-white/5"
      >
        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">System Online</span>
          </div>
          <span className="text-sm font-black uppercase tracking-tight">Chat</span>
        </div>

        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 transition-all duration-500 shadow-inner">
          <MessageSquare size={22} className="fill-current" />
        </div>

        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-[2rem] pointer-events-none"></div>
      </button>
    </div>
  );
};

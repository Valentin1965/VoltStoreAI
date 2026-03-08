
import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * LiveAssistant Component
 * Floating button for WhatsApp contact.
 */
export function LiveAssistant() {
  const { t } = useLanguage();
  const WHATSAPP_NUMBER = '4531185819';
  
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(t('whatsapp_welcome') || "Hej! Jeg har brug for hjælp med solceller.")}`;

  return (
    <div className="hidden lg:block fixed bottom-[4.5rem] left-4 z-[999999] notranslate" translate="no">
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-full shadow-xl hover:bg-emerald-600 transition-all duration-300 active:scale-90 border border-white/10"
      >
        <div className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest">Support</span>
        <div className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 transition-all duration-300">
          <MessageCircle size={14} />
        </div>
      </a>
    </div>
  );
}

import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/** Standalone contact page for country-prefixed routes (/dk/contact, …). */
export const ContactPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 text-left space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900">{t('page_contact_title')}</h1>
        <p className="mt-3 text-sm md:text-base text-slate-600 font-medium leading-relaxed">{t('page_contact_lead')}</p>
      </div>
      <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-start gap-3">
          <MapPin className="text-emerald-500 shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('footer_contact')}</div>
            <p className="text-sm font-bold text-slate-800 mt-1">Katmosevej 16, Viborg 8800, Denmark</p>
            <p className="text-xs text-slate-500 mt-1">{t('footer_address')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="text-emerald-500 shrink-0" size={20} />
          <a href="tel:+4561485219" className="text-lg font-black text-slate-900 hover:text-emerald-600 transition-colors">
            +45 61 48 52 19
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Mail className="text-emerald-500 shrink-0" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
          </div>
          <a href="mailto:info@glsolargroup.dk" className="text-sm font-bold text-emerald-600 hover:underline">
            info@glsolargroup.dk
          </a>
          <a href="mailto:sales@glsolargroup.dk" className="text-sm font-bold text-slate-700 hover:text-emerald-600 hover:underline">
            sales@glsolargroup.dk
          </a>
        </div>
      </div>
    </div>
  );
};

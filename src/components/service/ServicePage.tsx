
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { 
  Wrench, ShieldCheck, Mail, Phone, User, 
  Building2, ArrowRight, Loader2, Hammer, 
  Target, Zap, Clock
} from 'lucide-react';

export const ServicePage: React.FC = () => {
  const { t, language } = useLanguage();
  const { addNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState<null | 'client' | 'partner'>(null);

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing('client');
    setTimeout(() => {
      addNotification(t('service_success'), 'success');
      setIsProcessing(null);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing('partner');
    setTimeout(() => {
      addNotification(t('service_success'), 'success');
      setIsProcessing(null);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  const getFullNamePlaceholder = () => {
    switch(language) {
      case 'da': return 'Fornavn Efternavn';
      case 'no': return 'Fornavn Etternavn';
      case 'se': return 'Förnamn Efternamn';
      default: return 'Full Name';
    }
  };

  const getCompanyNamePlaceholder = () => {
    switch(language) {
      case 'da': return 'Virksomhed ApS';
      case 'no': return 'Bedrift AS';
      case 'se': return 'Företag AB';
      default: return 'Company Name';
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-12 pb-20 text-left">
      {/* Header Banner */}
      <div className="relative bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="bg-emerald-500 p-6 rounded-3xl shadow-2xl">
            <Wrench size={48} className="text-white" />
          </div>
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
              {t('service_title')}
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-medium leading-relaxed italic border-l-4 border-emerald-500 pl-6">
              {t('service_header_subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Client Request Form */}
        <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl space-y-8 h-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
              <Zap size={14} /> {t('service_badge_customers')}
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              {t('service_client_title')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              {t('service_client_desc')}
            </p>
          </div>

          <form onSubmit={handleSubmitClient} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('profile_name')}</label>
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" placeholder={getFullNamePlaceholder()} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('profile_email')}</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input required type="email" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" placeholder="din@email.dk" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('profile_phone')}</label>
                <div className="relative group">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm" placeholder="+45 00 00 00 00" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('service_message')}</label>
              <textarea required className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm h-32 resize-none" placeholder={t('service_desc_placeholder')}></textarea>
            </div>

            <button disabled={isProcessing === 'client'} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">
              {isProcessing === 'client' ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> {t('service_send_request')}</>}
            </button>
          </form>
        </section>

        {/* Partner Application Form */}
        <section className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100 shadow-inner space-y-8 h-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
              <Building2 size={14} /> {t('service_badge_partners')}
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              {t('service_partner_title')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              {t('service_partner_desc')}
            </p>
          </div>

          <form onSubmit={handleSubmitPartner} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('service_company_name')}</label>
              <div className="relative group">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm" placeholder={getCompanyNamePlaceholder()} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('service_contact_person')}</label>
              <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm" placeholder={getFullNamePlaceholder()} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('profile_email')}</label>
                <input required type="email" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm" placeholder="b2b@company.dk" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('service_city_region')}</label>
                <input required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm" placeholder={language === 'da' ? 'F.eks. Jylland / Aarhus' : 'e.g., Jylland / Aarhus'} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">{t('service_exp_capacity')}</label>
              <textarea required className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-[12px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm h-32 resize-none" placeholder={t('service_partner_exp_placeholder')}></textarea>
            </div>

            <button disabled={isProcessing === 'partner'} className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50">
              {isProcessing === 'partner' ? <Loader2 size={18} className="animate-spin" /> : <><Target size={18} /> {t('service_send_request')}</>}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

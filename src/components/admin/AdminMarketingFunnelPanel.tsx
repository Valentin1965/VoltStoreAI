import React, { useState, useCallback } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';
import { sendFunnelEmailAdmin, type FunnelStep } from '../../services/emailService';

const STEPS: { step: FunnelStep; labelKey: 'admin_funnel_welcome' | 'admin_funnel_nurture_1' | 'admin_funnel_nurture_2' }[] = [
  { step: 'welcome', labelKey: 'admin_funnel_welcome' },
  { step: 'nurture_1', labelKey: 'admin_funnel_nurture_1' },
  { step: 'nurture_2', labelKey: 'admin_funnel_nurture_2' },
];

function normalizeEmailLang(raw: unknown, fallback: Language): string {
  const v = String(raw || '').toLowerCase();
  if (['da', 'en', 'no', 'se'].includes(v)) return v;
  return fallback;
}

export interface AdminMarketingFunnelPanelProps {
  customerEmail: string;
  customerName: string;
  /** Language used in the email template (order.lang or UI language) */
  emailLang?: string;
  /** Compact layout for smaller modals */
  compact?: boolean;
}

export const AdminMarketingFunnelPanel: React.FC<AdminMarketingFunnelPanelProps> = ({
  customerEmail,
  customerName,
  emailLang,
  compact = false,
}) => {
  const { addNotification } = useNotification();
  const { t, language } = useLanguage();
  const [sendingStep, setSendingStep] = useState<FunnelStep | null>(null);

  const langForEmail = normalizeEmailLang(emailLang, language);
  const emailOk = Boolean(String(customerEmail || '').trim().includes('@'));

  const sendStep = useCallback(async (step: FunnelStep) => {
    if (!emailOk) {
      addNotification(t('admin_funnel_no_email'), 'error');
      return;
    }
    setSendingStep(step);
    try {
      const res = await sendFunnelEmailAdmin({
        step,
        customerEmail: customerEmail.trim(),
        customerName: customerName.trim() || customerEmail.trim(),
        lang: langForEmail,
      });
      if (res.ok) addNotification(`${t('admin_funnel_sent')} (${step})`, 'success');
      else addNotification(`${t('admin_funnel_fail')}: ${res.error ?? '?'}`, 'error');
    } finally {
      setSendingStep(null);
    }
  }, [addNotification, t, customerEmail, customerName, langForEmail, emailOk]);

  return (
    <div className={`rounded-2xl border border-violet-200 bg-violet-50/80 ${compact ? 'p-4 space-y-3' : 'p-6 space-y-4'}`}>
      <div className="flex items-start gap-2">
        <Mail size={compact ? 14 : 16} className="text-violet-600 shrink-0 mt-0.5" />
        <div>
          <div className={`font-black uppercase tracking-widest text-violet-900 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
            {t('admin_funnel_title')}
          </div>
          <p className={`text-violet-700/90 mt-1 leading-snug ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
            {t('admin_funnel_hint')}
          </p>
        </div>
      </div>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'gap-2.5'}`}>
        {STEPS.map(({ step, labelKey }) => (
          <button
            key={step}
            type="button"
            disabled={!emailOk || sendingStep !== null}
            onClick={() => void sendStep(step)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:pointer-events-none bg-violet-700 text-white hover:bg-violet-600 shadow-sm border border-violet-800/20 ${compact ? 'px-3 py-2 text-[7px]' : 'px-4 py-2.5 text-[8px]'}`}
          >
            {sendingStep === step ? <Loader2 size={12} className="animate-spin shrink-0" /> : null}
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
};

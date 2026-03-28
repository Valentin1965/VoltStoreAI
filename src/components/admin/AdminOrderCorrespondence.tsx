import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sendCustomCustomerEmail } from '../../services/emailService';
import {
  applyTemplate,
  orderToTemplateVars,
  emailParagraphsFromEscapedText,
  escapeHtml,
  templateSubjectForLang,
  templateBodyForLang,
  templateAppliedToEmailInnerHtml,
  type AppLang,
  type MessageTemplateRow,
} from '../../utils/messageTemplate';

interface InquiryRow {
  id: string;
  order_id: string | null;
  channel: string;
  body: string;
  subject: string | null;
  from_email: string | null;
  created_at: string;
}

interface CorrespondenceRow {
  id: string;
  inquiry_id: string | null;
  template_id: string | null;
  locale: string;
  to_email: string;
  subject_sent: string;
  body_sent: string;
  created_at: string;
}

type ThreadKind = 'inbound' | 'outbound' | 'checkout_draft';

interface ThreadItem {
  key: string;
  kind: ThreadKind;
  created_at: string;
  title: string;
  subtitle: string;
  bodyText?: string;
  bodyHtml?: string;
}

function stripHtmlPreview(html: string, maxLen: number): string {
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}…`;
}

const LANGS: AppLang[] = ['da', 'en', 'no', 'se'];

interface Props {
  order: Record<string, unknown>;
  /** Increment from parent after status-email is logged so the thread refetches */
  correspondenceRefreshKey?: number;
}

function orderUuid(order: Record<string, unknown>): string {
  const raw = order.id ?? order.order_id;
  if (raw == null || raw === '') return '';
  return String(raw).trim();
}

function templateIsUsable(row: MessageTemplateRow): boolean {
  const v = (row as { is_active?: unknown }).is_active;
  return v !== false && v !== 'false' && v !== 0;
}

/** Supabase may return nulls; ensure string fields so pickLocalizedField / applyTemplate never see undefined. */
function normalizeMessageTemplateRow(row: Record<string, unknown>): MessageTemplateRow {
  const s = (k: string) => (row[k] == null ? '' : String(row[k]));
  return {
    id: String(row.id ?? ''),
    code: s('code'),
    title_internal: s('title_internal'),
    subject_da: s('subject_da'),
    subject_en: s('subject_en'),
    subject_no: s('subject_no'),
    subject_se: s('subject_se'),
    body_da: s('body_da'),
    body_en: s('body_en'),
    body_no: s('body_no'),
    body_se: s('body_se'),
    is_active: row.is_active !== false && row.is_active !== 'false' && row.is_active !== 0,
    sort_order: Number(row.sort_order) || 0,
  };
}

export const AdminOrderCorrespondence: React.FC<Props> = ({ order, correspondenceRefreshKey = 0 }) => {
  const { addNotification } = useNotification();
  const { t, language } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';
  const adminKeyRaw = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
  const adminKey = adminKeyRaw?.trim() || undefined;
  const orderId = orderUuid(order);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplateRow[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [sentLog, setSentLog] = useState<CorrespondenceRow[]>([]);

  const [inquiryId, setInquiryId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [customerLang, setCustomerLang] = useState<AppLang>((order.lang as AppLang) || 'da');
  const [extraNote, setExtraNote] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  /** Inquiries / sent log failed but templates may still load — show as warning, not blocking send. */
  const [fetchErrorPartial, setFetchErrorPartial] = useState(false);
  const [expandedThread, setExpandedThread] = useState<Record<string, boolean>>({});

  const orderNo = useMemo(() => {
    return (
      String((order as { order_number?: string }).order_number ?? '') ||
      'GLS-' + orderId.slice(0, 8).toUpperCase()
    );
  }, [order, orderId]);

  const load = useCallback(async () => {
    if (!adminKey) {
      setLoading(false);
      setFetchError(t('admin_calc_no_admin_key'));
      setFetchErrorPartial(false);
      return;
    }
    if (!orderId) {
      setLoading(false);
      setFetchError(t('admin_order_corr_bad_order_id'));
      setFetchErrorPartial(false);
      return;
    }
    setLoading(true);
    const [tplRes, inqRes, logRes] = await Promise.all([
      supabase.rpc('admin_get_message_templates', { p_key: adminKey }),
      supabase.rpc('admin_get_inquiries_for_order', { p_key: adminKey, p_order_id: orderId }),
      supabase.rpc('admin_get_correspondence_for_order', { p_key: adminKey, p_order_id: orderId }),
    ]);

    const errParts: string[] = [];
    if (tplRes.error) errParts.push(`${t('admin_order_corr_err_templates')}: ${tplRes.error.message}`);
    if (inqRes.error) errParts.push(`${t('admin_order_corr_err_inquiries')}: ${inqRes.error.message}`);
    if (logRes.error) errParts.push(`${t('admin_order_corr_err_sent_log')}: ${logRes.error.message}`);

    if (!tplRes.error) {
      setTemplates(((tplRes.data as MessageTemplateRow[]) || []).filter(templateIsUsable));
    } else {
      setTemplates([]);
    }
    if (!inqRes.error) {
      setInquiries((inqRes.data as InquiryRow[]) || []);
    } else {
      setInquiries([]);
    }
    if (!logRes.error) {
      setSentLog((logRes.data as CorrespondenceRow[]) || []);
    } else {
      setSentLog([]);
    }

    setFetchError(errParts.length ? errParts.join(' · ') : null);
    setFetchErrorPartial(Boolean(errParts.length) && !tplRes.error);
    setLoading(false);
  }, [adminKey, orderId, t]);

  useEffect(() => {
    void load();
  }, [load, correspondenceRefreshKey]);

  useEffect(() => {
    const L = (order.lang as AppLang) || 'da';
    if (LANGS.includes(L)) setCustomerLang(L);
  }, [order.lang]);

  useEffect(() => {
    setInquiryId('');
    setTemplateId('');
    setExtraNote('');
    setExpandedThread({});
  }, [orderId]);

  const selectedTemplate = templates.find((x) => x.id === templateId);

  const preview = useMemo(() => {
    const vars = orderToTemplateVars(order, extraNote, localeStr);
    const extra = extraNote.trim();

    // Extra text only — no template required
    if (!selectedTemplate) {
      if (!extra) return { subject: '', html: '' };
      const subjOnly = applyTemplate(t('admin_order_corr_extra_only_subject'), orderToTemplateVars(order, '', localeStr), true);
      const htmlOnly = emailParagraphsFromEscapedText(escapeHtml(extra));
      return { subject: subjOnly, html: htmlOnly };
    }

    const subj = applyTemplate(templateSubjectForLang(selectedTemplate, customerLang), vars, true);
    const bodyTemplate = templateBodyForLang(selectedTemplate, customerLang);
    let html = templateAppliedToEmailInnerHtml(bodyTemplate, vars);
    // If the template does not use {{extraNote}}, still append the free-text field to the outgoing mail.
    if (extra && !/\{\{\s*extraNote\s*\}\}/i.test(bodyTemplate)) {
      const extraHtml = emailParagraphsFromEscapedText(escapeHtml(extra));
      html += `<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0" role="note"><p style="margin:0 0 8px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#64748b">${escapeHtml(t('admin_order_corr_extra_section_title'))}</p>${extraHtml}</div>`;
    }
    return { subject: subj, html };
  }, [selectedTemplate, customerLang, extraNote, order, localeStr, t]);

  const threadItems = useMemo((): ThreadItem[] => {
    const items: ThreadItem[] = [];
    const cm = String(order.customer_message ?? '').trim();
    const hasCheckoutInquiry = inquiries.some((i) => i.channel === 'checkout_message');
    if (cm && !hasCheckoutInquiry) {
      items.push({
        key: 'checkout-draft',
        kind: 'checkout_draft',
        created_at: String((order as { created_at?: string }).created_at || new Date().toISOString()),
        title: t('admin_order_corr_checkout_unlinked_title'),
        subtitle: String(order.customer_email ?? '').trim() || '—',
        bodyText: cm,
      });
    }
    for (const q of inquiries) {
      items.push({
        key: `in-${q.id}`,
        kind: 'inbound',
        created_at: q.created_at,
        title: (q.subject || '').trim() || `[${q.channel}]`,
        subtitle: (q.from_email || '').trim() || '—',
        bodyText: q.body || '',
      });
    }
    for (const row of sentLog) {
      items.push({
        key: `out-${row.id}`,
        kind: 'outbound',
        created_at: row.created_at,
        title: row.subject_sent || '—',
        subtitle: `${row.to_email} · ${String(row.locale || '').toUpperCase()}`,
        bodyHtml: row.body_sent ?? '',
      });
    }
    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return items;
  }, [order, inquiries, sentLog, t]);

  const toggleThread = (key: string) => {
    setExpandedThread((p) => ({ ...p, [key]: !p[key] }));
  };

  const sendMail = async () => {
    if (typeof addNotification !== 'function') {
      console.warn('[sendMail] addNotification is not available');
      return;
    }

    if (!adminKey) {
      addNotification(t('admin_calc_no_admin_key'), 'error');
      return;
    }
    const hasTemplate = Boolean(selectedTemplate);
    const hasExtra = extraNote.trim().length > 0;
    if (!hasTemplate && !hasExtra) {
      addNotification(t('admin_order_corr_need_content'), 'error');
      return;
    }
    const email = String(order.customer_email ?? '').trim();
    if (!email) {
      addNotification(t('admin_order_corr_no_email'), 'error');
      return;
    }
    if (!preview.subject.trim()) {
      addNotification(t('admin_order_corr_empty_subject'), 'error');
      return;
    }
    if (!preview.html.trim()) {
      addNotification(t('admin_order_corr_empty_body'), 'error');
      return;
    }

    setSending(true);
    try {
      console.log('[sendMail] sending to', email);
      const sendRes = await sendCustomCustomerEmail({
        customerEmail: email,
        subject: preview.subject,
        htmlBody: preview.html,
        lang: customerLang,
      });
      console.log('[sendMail] response', sendRes);

      if (!sendRes || !sendRes.ok) {
        const errorMsg =
          sendRes && 'error' in sendRes && sendRes.error
            ? sendRes.error
            : 'Unknown error from email service';
        addNotification(`${t('admin_order_corr_send_fail')}: ${errorMsg}`, 'error');
        return;
      }

      const { error: logErr } = await supabase.rpc('admin_log_correspondence', {
        p_key: adminKey,
        p_inquiry_id: inquiryId ? inquiryId : null,
        p_order_id: orderId,
        p_template_id: selectedTemplate?.id ?? null,
        p_locale: customerLang,
        p_to_email: email,
        p_subject: preview.subject,
        p_body: preview.html,
      });

      if (logErr) {
        console.warn('[correspondence log]', logErr.message);
        addNotification(`${t('admin_order_corr_sent')} (${t('admin_order_corr_log_skipped')}: ${logErr.message})`, 'success');
      } else {
        addNotification(t('admin_order_corr_sent'), 'success');
      }

      setExtraNote('');
      await load();
    } catch (err: unknown) {
      console.error('[sendMail] exception:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      addNotification(`${t('admin_order_corr_send_fail')}: ${errorMessage}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
        <MessageSquare size={12} /> {t('admin_order_corr_title')}
      </div>
      <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{t('admin_order_corr_hint')}</p>

      {fetchError && (
        <div
          className={`rounded-xl border px-3 py-2 text-[9px] font-bold leading-relaxed ${
            fetchErrorPartial
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {fetchErrorPartial ? (
            <>
              <span className="block text-[8px] font-black uppercase tracking-widest text-amber-700 mb-1">
                {t('admin_order_corr_partial_warn')}
              </span>
              {fetchError}
            </>
          ) : (
            t('admin_order_corr_load_fail').replace('{{detail}}', fetchError)
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-emerald-500" size={22} />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-500">
              <MessageSquare size={11} className="text-emerald-500 shrink-0" />
              {t('admin_order_corr_thread_title')}
            </div>
            {threadItems.length === 0 ? (
              <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic">
                {t('admin_order_corr_thread_empty')}
              </p>
            ) : (
              <ul className="space-y-2 max-h-[min(22rem,50vh)] overflow-y-auto pr-1">
                {threadItems.map((item) => {
                  const open = Boolean(expandedThread[item.key]);
                  const previewLine = item.bodyText
                    ? item.bodyText.length > 160
                      ? `${item.bodyText.slice(0, 160)}…`
                      : item.bodyText
                    : item.bodyHtml
                      ? stripHtmlPreview(item.bodyHtml, 160)
                      : '—';
                  const badge =
                    item.kind === 'inbound'
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : item.kind === 'outbound'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200';
                  const badgeLabel =
                    item.kind === 'inbound'
                      ? t('admin_order_corr_thread_inbound')
                      : item.kind === 'outbound'
                        ? t('admin_order_corr_thread_outbound')
                        : t('admin_order_corr_checkout_unlinked_badge');
                  return (
                    <li
                      key={item.key}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[7px] font-black uppercase tracking-widest ${badge}`}
                        >
                          {badgeLabel}
                        </span>
                        <time className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString(localeStr)}
                        </time>
                      </div>
                      <div className="text-[10px] font-black text-slate-900 leading-snug">{item.title}</div>
                      <div className="text-[9px] text-slate-500 font-bold break-all">{item.subtitle}</div>
                      {!open && (
                        <p className="text-[9px] text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                          {previewLine}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleThread(item.key)}
                        className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                      >
                        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {open ? t('admin_order_corr_thread_collapse') : t('admin_order_corr_thread_expand')}
                      </button>
                      {open &&
                        (item.bodyHtml ? (
                          <div
                            className="text-[10px] text-slate-700 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white leading-relaxed [&_p]:my-1"
                            dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                          />
                        ) : (
                          <div className="text-[10px] text-slate-700 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white whitespace-pre-wrap leading-relaxed">
                            {item.bodyText || '—'}
                          </div>
                        ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 space-y-4">
          {inquiries.length > 0 && (
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('admin_order_corr_inquiry')}</label>
              <select
                value={inquiryId}
                onChange={(e) => setInquiryId(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold"
              >
                <option value="">{t('admin_order_corr_inquiry_none')}</option>
                {inquiries.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.channel}] {(q.subject || '').slice(0, 40)} — {new Date(q.created_at).toLocaleString(localeStr)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('admin_order_corr_template')}</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold"
              >
                <option value="">{t('admin_order_corr_pick_template')}</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title_internal || tpl.code}
                  </option>
                ))}
              </select>
              {!fetchError && templates.length === 0 && (
                <p className="mt-1 text-[9px] text-amber-700 font-bold">{t('admin_order_corr_no_active_templates')}</p>
              )}
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('admin_order_corr_customer_lang')}</label>
              <select
                value={customerLang}
                onChange={(e) => setCustomerLang(e.target.value as AppLang)}
                className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black uppercase"
              >
                {LANGS.map((L) => (
                  <option key={L} value={L}>
                    {L}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('admin_order_corr_extra')}</label>
            <textarea
              value={extraNote}
              onChange={(e) => setExtraNote(e.target.value)}
              rows={3}
              placeholder={t('admin_order_corr_extra_ph')}
              className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[10px] leading-relaxed"
            />
          </div>

          {(selectedTemplate || extraNote.trim()) && (preview.subject || preview.html) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Mail size={10} /> {t('admin_order_corr_preview')}
              </div>
              <div className="text-[10px] font-black text-slate-800">{preview.subject}</div>
              <div
                className="text-[10px] text-slate-600 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-3 bg-slate-50/80"
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => void sendMail()}
            disabled={sending || (!selectedTemplate && !extraNote.trim())}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {t('admin_order_corr_send')} · #{orderNo}
          </button>
          </div>
        </>
      )}
    </div>
  );
};

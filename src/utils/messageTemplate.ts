/** Placeholders in DB templates: {{customerName}} {{orderNo}} {{customerEmail}} {{orderDate}} {{extraNote}} */

export type AppLang = 'da' | 'en' | 'no' | 'se';

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function applyTemplate(template: string, vars: Record<string, string>, escapeValues = true): string {
  return String(template ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key] ?? '';
    return escapeValues ? escapeHtml(v) : v;
  });
}

/** Use when `text` is already HTML-escaped (e.g. output of applyTemplate(..., true)). */
export function emailParagraphsFromEscapedText(escapedPlain: string): string {
  return escapedPlain.split('\n').map((line) =>
    line.trim() === ''
      ? '<p style="margin:0 0 4px;font-size:14px;line-height:1.6">&nbsp;</p>'
      : `<p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6">${line}</p>`,
  ).join('');
}

export interface MessageTemplateRow {
  id: string;
  code: string;
  title_internal: string;
  subject_da: string;
  subject_en: string;
  subject_no: string;
  subject_se: string;
  body_da: string;
  body_en: string;
  body_no: string;
  body_se: string;
  is_active: boolean;
  sort_order: number;
}

const LANG_ORDER: AppLang[] = ['da', 'en', 'no', 'se'];

/** First non-empty trimmed string for preferred lang, then other langs (empty string is not a value — unlike ??). */
function pickLocalizedField(row: MessageTemplateRow, prefix: 'subject' | 'body', preferred: AppLang): string {
  const chain: AppLang[] = [preferred, ...LANG_ORDER.filter((L) => L !== preferred)];
  for (const L of chain) {
    const key = `${prefix}_${L}` as keyof MessageTemplateRow;
    const raw = row[key];
    if (raw != null && String(raw).trim() !== '') return String(raw);
  }
  return '';
}

export function templateSubjectForLang(row: MessageTemplateRow, lang: AppLang): string {
  return pickLocalizedField(row, 'subject', lang);
}

export function templateBodyForLang(row: MessageTemplateRow, lang: AppLang): string {
  return pickLocalizedField(row, 'body', lang);
}

/**
 * Substitute vars into template body and produce HTML for the email inner region.
 * Placeholder values are escaped (applyTemplate true). Plain templates → one &lt;p&gt; per line.
 * If the stored template contains markup, wrap the substituted result once (markup is admin-edited).
 */
export function templateAppliedToEmailInnerHtml(bodyTemplate: string, vars: Record<string, string>): string {
  const tpl = String(bodyTemplate ?? '');
  const bodyRaw = applyTemplate(tpl, vars, true).trim();
  if (!bodyRaw) return '';
  const templateHasMarkup = /<\/?[a-z][\s\S]*>/i.test(tpl);
  if (templateHasMarkup) {
    return `<div style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6">${bodyRaw}</div>`;
  }
  const normalized = bodyRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return emailParagraphsFromEscapedText(normalized);
}

export function orderToTemplateVars(order: Record<string, unknown>, extraNote: string, localeStr: string): Record<string, string> {
  const first = String(order.first_name ?? '');
  const last = String(order.last_name ?? '');
  const name = `${first} ${last}`.trim() || String(order.customer_name ?? '');
  const orderNo =
    String((order as { order_number?: string }).order_number ?? '') ||
    'GLS-' + String(order.id ?? '').slice(0, 8).toUpperCase();
  const created = order.created_at ? new Date(String(order.created_at)).toLocaleDateString(localeStr) : '';
  return {
    customerName: name,
    orderNo,
    customerEmail: String(order.customer_email ?? ''),
    orderDate: created,
    extraNote,
  };
}

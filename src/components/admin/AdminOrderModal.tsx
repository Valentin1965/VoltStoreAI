import React, { useState, useEffect } from 'react';
import { X, Package, Download, Mail, Phone, MapPin, Truck, Users, MessageSquare,
  Building2, Activity, Save, Loader2, Trash2 } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { sendStatusChangeEmail, OrderStatus } from '../../services/emailService';
import { escapeHtml } from '../../utils/messageTemplate';
import { ORDER_STATUSES, OrderStatusEdit } from './adminTypes';
import { AdminMarketingFunnelPanel } from './AdminMarketingFunnelPanel';
import { AdminOrderCorrespondence } from './AdminOrderCorrespondence';

interface AdminOrderModalProps {
  order: any;
  onClose: () => void;
  onUpdated: (updated: any) => void;
  /** After permanent DB delete — remove from list and close modal */
  onDeleted?: (orderId: string) => void;
}

const STATUS_ICONS: Record<OrderStatus, string> = {
  accepted: '✅',
  in_progress: '🔧',
  awaiting_transport: '📦',
  in_transit: '🚚',
  delivered: '📬',
  cancelled: '❌',
};

const STATUS_LABEL_KEYS: Record<OrderStatus, string> = {
  accepted: 'admin_status_accepted',
  in_progress: 'admin_status_in_progress',
  awaiting_transport: 'admin_status_awaiting',
  in_transit: 'admin_status_in_transit',
  delivered: 'admin_status_delivered',
  cancelled: 'admin_status_cancelled',
};

function buildStatusEmailCorrespondenceSubject(
  t: (key: string) => string,
  orderNo: string,
  status: OrderStatus,
): string {
  return `${STATUS_ICONS[status]} #${orderNo} — ${t(STATUS_LABEL_KEYS[status])}`;
}

function buildStatusEmailCorrespondenceHtml(
  t: (key: string) => string,
  status: OrderStatus,
  shippingDate?: string,
  arrivalDate?: string,
): string {
  const label = t(STATUS_LABEL_KEYS[status]);
  const intro = escapeHtml(t('admin_order_corr_status_email_log_intro'));
  let html = `<p style="margin:0 0 10px;font-size:12px;color:#64748b;line-height:1.5">${intro}</p>`;
  html += `<p style="margin:0 0 8px;font-size:14px;color:#111827"><strong>${escapeHtml(t('admin_col_status'))}</strong> ${STATUS_ICONS[status]} ${escapeHtml(label)}</p>`;
  if (shippingDate?.trim()) {
    html += `<p style="margin:0 0 4px;font-size:13px;color:#374151"><strong>${escapeHtml(t('cabinet_shipped_label'))}:</strong> ${escapeHtml(shippingDate.trim())}</p>`;
  }
  if (arrivalDate?.trim()) {
    html += `<p style="margin:0;font-size:13px;color:#374151"><strong>${escapeHtml(t('cabinet_arrival_label'))}:</strong> ${escapeHtml(arrivalDate.trim())}</p>`;
  }
  return html;
}

export const AdminOrderModal: React.FC<AdminOrderModalProps> = ({ order: o, onClose, onUpdated, onDeleted }) => {
  const { addNotification } = useNotification();
  const { t, language } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';
  const [isSaving, setIsSaving] = useState(false);
  /** Bumps after a status-email row is logged so correspondence thread refetches */
  const [correspondenceRefreshKey, setCorrespondenceRefreshKey] = useState(0);
  const [statusEdit, setStatusEdit] = useState<OrderStatusEdit>({
    status: o.order_status || 'accepted',
    shipping_date: o.shipping_date?.slice(0, 10) || '',
    arrival_date: o.arrival_date?.slice(0, 10) || '',
  });

  useEffect(() => {
    setStatusEdit({
      status: o.order_status || 'accepted',
      shipping_date: o.shipping_date?.slice(0, 10) || '',
      arrival_date: o.arrival_date?.slice(0, 10) || '',
    });
  }, [o.id, o.order_status, o.shipping_date, o.arrival_date]);

  const items: any[] = Array.isArray(o.items) ? o.items : [];
  const addr     = [o.street, o.house_number].filter(Boolean).join(' ');
  const city     = [o.postal_code, o.city, o.country].filter(Boolean).join(', ');
  const delAddr  = o.delivery_same_as_billing ? addr : [o.delivery_street, o.delivery_house_number].filter(Boolean).join(' ');
  const delCity  = o.delivery_same_as_billing ? city : [o.delivery_postal_code, o.delivery_city, o.delivery_country].filter(Boolean).join(', ');
  const orderDate = o.created_at ? new Date(o.created_at).toLocaleDateString(localeStr) : '-';
  const orderNo   = o.order_number || ('GLS-' + String(o.id || '').slice(0, 8).toUpperCase());
  /** Cart/checkout stores line totals ex VAT; 25% moms for DK/EU display */
  const VAT_RATE = 0.25;
  const totalExVat = Number(o.total_price) || 0;
  const totalIncVat = totalExVat * (1 + VAT_RATE);

  const orderIdForRpc = String(o?.id ?? '').trim();

  const saveStatus = async () => {
    const adminKey = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
    if (!adminKey) {
      addNotification(t('admin_calc_no_admin_key'), 'error');
      return;
    }
    if (!orderIdForRpc) {
      addNotification(t('admin_order_corr_bad_order_id'), 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('admin_update_order_status', {
        p_key: adminKey,
        p_order_id: orderIdForRpc,
        p_order_status: statusEdit.status,
        p_shipping_date: statusEdit.shipping_date || null,
        p_arrival_date: statusEdit.arrival_date || null,
      });
      if (error) {
        addNotification(`${t('admin_order_status_save_error')}: ${error.message}`, 'error');
        return;
      }
      onUpdated({
        ...o,
        order_status: statusEdit.status,
        shipping_date: statusEdit.shipping_date ? statusEdit.shipping_date : null,
        arrival_date: statusEdit.arrival_date ? statusEdit.arrival_date : null,
      });
      addNotification(t('admin_order_status_saved_toast'), 'success');
    } finally {
      setIsSaving(false);
    }

    void (async () => {
      const adminKeyLog = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
      try {
        const emailRes = await sendStatusChangeEmail({
          customerName: `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name || '',
          customerEmail: o.customer_email,
          orderNo,
          newStatus: statusEdit.status as OrderStatus,
          shippingDate: statusEdit.shipping_date || undefined,
          arrivalDate: statusEdit.arrival_date || undefined,
          lang: o.lang || 'da',
        });
        if (emailRes.ok && adminKeyLog && orderIdForRpc) {
          const cx = String(o.customer_email ?? '').trim();
          if (cx) {
            const { error: logCorrErr } = await supabase.rpc('admin_log_correspondence', {
              p_key: adminKeyLog,
              p_inquiry_id: null,
              p_order_id: orderIdForRpc,
              p_template_id: null,
              p_locale: String(o.lang || 'da'),
              p_to_email: cx,
              p_subject: buildStatusEmailCorrespondenceSubject(t, orderNo, statusEdit.status as OrderStatus),
              p_body: buildStatusEmailCorrespondenceHtml(
                t,
                statusEdit.status as OrderStatus,
                statusEdit.shipping_date || undefined,
                statusEdit.arrival_date || undefined,
              ),
            });
            if (logCorrErr) console.warn('[status correspondence log]', logCorrErr.message);
            else setCorrespondenceRefreshKey((n) => n + 1);
          }
        }
      } catch {
        /* non-blocking */
      }
      if (o.client_id) {
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              type: 'status_update',
              clientId: o.client_id,
              orderNo,
              newStatus: statusEdit.status,
            },
          });
        } catch {
          /* push not critical */
        }
      }
    })();
  };

  const cancelOrder = async () => {
    if (statusEdit.status === 'cancelled') return;
    const ok = window.confirm(t('admin_order_cancel_confirm'));
    if (!ok) return;
    const adminKey = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
    if (!adminKey) {
      addNotification(t('admin_calc_no_admin_key'), 'error');
      return;
    }
    if (!orderIdForRpc) {
      addNotification(t('admin_order_corr_bad_order_id'), 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('admin_update_order_status', {
        p_key: adminKey,
        p_order_id: orderIdForRpc,
        p_order_status: 'cancelled',
        p_shipping_date: null,
        p_arrival_date: null,
      });
      if (error) {
        addNotification(`${t('admin_order_status_save_error')}: ${error.message}`, 'error');
        return;
      }

      setStatusEdit(prev => ({ ...prev, status: 'cancelled' }));
      onUpdated({ ...o, order_status: 'cancelled', shipping_date: null, arrival_date: null });
      addNotification(t('admin_order_cancelled_toast'), 'success');
    } finally {
      setIsSaving(false);
    }

    void (async () => {
      const adminKeyLog = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
      try {
        const emailRes = await sendStatusChangeEmail({
          customerName: `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name || '',
          customerEmail: o.customer_email,
          orderNo,
          newStatus: 'cancelled' as OrderStatus,
          lang: o.lang || 'da',
        });
        if (emailRes.ok && adminKeyLog && orderIdForRpc) {
          const cx = String(o.customer_email ?? '').trim();
          if (cx) {
            const { error: logCorrErr } = await supabase.rpc('admin_log_correspondence', {
              p_key: adminKeyLog,
              p_inquiry_id: null,
              p_order_id: orderIdForRpc,
              p_template_id: null,
              p_locale: String(o.lang || 'da'),
              p_to_email: cx,
              p_subject: buildStatusEmailCorrespondenceSubject(t, orderNo, 'cancelled'),
              p_body: buildStatusEmailCorrespondenceHtml(t, 'cancelled'),
            });
            if (logCorrErr) console.warn('[status correspondence log]', logCorrErr.message);
            else setCorrespondenceRefreshKey((n) => n + 1);
          }
        }
      } catch {
        /* non-blocking */
      }
      if (o.client_id) {
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              type: 'status_update',
              clientId: o.client_id,
              orderNo,
              newStatus: 'cancelled',
            },
          });
        } catch {
          /* push not critical */
        }
      }
    })();
  };

  /** Permanent remove from DB — icon-only, same style as product row trash */
  const deleteOrderPermanently = async () => {
    if (!window.confirm(t('admin_order_delete_confirm'))) return;
    const adminKey = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim();
    if (!adminKey) {
      addNotification(t('admin_order_delete_no_key'), 'error');
      return;
    }
    if (!orderIdForRpc) {
      addNotification(t('admin_order_corr_bad_order_id'), 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('admin_delete_order', {
        p_key: adminKey,
        p_order_id: orderIdForRpc,
      });
      if (error) {
        addNotification(`${t('admin_order_delete_fail')}: ${error.message}`, 'error');
        return;
      }
      addNotification(t('admin_order_delete_toast'), 'success');
      onDeleted?.(String(o.id));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const exportWord = async () => {
    const border  = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (text: string, bold = false, shade = false, w = 4680) =>
      new TableCell({
        borders, width: { size: w, type: WidthType.DXA },
        shading: shade ? { fill: 'F0FDF4', type: ShadingType.CLEAR } : { fill: 'FFFFFF', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [new Paragraph({ children: [new TextRun({ text, bold, font: 'Arial', size: 20 })] })],
      });
    const row = (label: string, value: string) =>
      new TableRow({ children: [cell(label, true, true, 3000), cell(value || '—', false, false, 6360)] });

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 0 }, children: [new TextRun({ text: 'GREEN LIGHT SCANDINAVIA', bold: true, size: 32, color: '10b981', font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Katmosevej 16, Viborg 8800, Denmark', size: 16, color: '6B7280', font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'sales@glsolargroup.dk  |  +45 61 48 52 19', size: 16, color: '6B7280', font: 'Arial' })] }),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '10b981', space: 1 } }, spacing: { after: 360 }, children: [] }),
          new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: `ORDER  #${orderNo}`, bold: true, size: 36, font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: `Date: ${orderDate}  |  Status: ${o.status || 'processing'}  |  Currency: ${o.currency || 'EUR'}`, size: 18, color: '6B7280', font: 'Arial' })] }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: 'CLIENT INFORMATION', bold: true, size: 24, font: 'Arial', color: '111827' })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 6360],
            rows: [
              row('Type', o.client_type === 'business' ? 'Business' : 'Private'),
              ...(o.company_name ? [row('Company', o.company_name)] : []),
              ...(o.vat_number   ? [row('VAT / CVR', o.vat_number)] : []),
              row('Name',             `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name || ''),
              row('Email',            o.customer_email || ''),
              row('Phone',            o.customer_phone || ''),
              row('Billing address',  [addr, city].filter(Boolean).join('\n') || o.department || ''),
              row('Delivery address', [delAddr, delCity].filter(Boolean).join('\n')),
            ],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 480, after: 120 }, children: [new TextRun({ text: 'ORDER ITEMS', bold: true, size: 24, font: 'Arial', color: '111827' })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [4800, 1600, 1480, 1480],
            rows: [
              new TableRow({ tableHeader: true, children: [
                new TableCell({ borders, width: { size: 4800, type: WidthType.DXA }, shading: { fill: '111827', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: [new TextRun({ text: 'Product',  bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: '111827', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Category', bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders, width: { size: 1480, type: WidthType.DXA }, shading: { fill: '111827', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Qty',      bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders, width: { size: 1480, type: WidthType.DXA }, shading: { fill: '111827', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Price',    bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })] })] }),
              ]}),
              ...items.map((it, i) => new TableRow({ children: [
                new TableCell({ borders, width: { size: 4800, type: WidthType.DXA }, shading: { fill: i % 2 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text: String(it.name || ''),         font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: i % 2 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.category || ''), font: 'Arial', size: 18, color: '6B7280' })] })] }),
                new TableCell({ borders, width: { size: 1480, type: WidthType.DXA }, shading: { fill: i % 2 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(it.quantity || 1), bold: true, font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders, width: { size: 1480, type: WidthType.DXA }, shading: { fill: i % 2 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${((it.price || 0) * (it.quantity || 1)).toFixed(2)} ${o.currency || 'EUR'}`, font: 'Arial', size: 20 })] })] }),
              ]})),
              new TableRow({ children: [
                new TableCell({ borders, width: { size: 7880, type: WidthType.DXA }, columnSpan: 3, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL (incl. 25% VAT)', bold: true, font: 'Arial', size: 22 })] })] }),
                new TableCell({ borders, width: { size: 1480, type: WidthType.DXA }, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, margins: { top: 120, bottom: 120, left: 160, right: 160 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${(o.total_price || 0).toFixed(2)} ${o.currency || 'EUR'}`, bold: true, color: '10b981', font: 'Arial', size: 24 })] })] }),
              ]}),
            ],
          }),
          ...(o.customer_message ? [
            new Paragraph({ spacing: { before: 480, after: 120 }, children: [new TextRun({ text: 'CLIENT MESSAGE', bold: true, size: 22, font: 'Arial', color: '6B7280' })] }),
            new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: o.customer_message, font: 'Arial', size: 20, italics: true, color: '374151' })] }),
          ] : []),
          new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 1 } }, spacing: { before: 600, after: 80 }, children: [new TextRun({ text: 'Green Light Scandinavia  ·  Katmosevej 16, 8800 Viborg  ·  sales@glsolargroup.dk  ·  +45 61 48 52 19', size: 16, color: '9CA3AF', font: 'Arial' })] }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `GLS-Order-${orderNo}.docx`);
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[10002] flex items-center justify-center overflow-y-auto overscroll-contain px-4 py-6 sm:py-10 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-[min(100%,62.4rem)] rounded-[2.5rem] shadow-3xl relative border border-slate-100 flex flex-col max-h-[68.85vh] min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg"><Package size={20} /></div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-900">Ordre #{orderNo}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{orderDate} · {o.status}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void cancelOrder()}
              disabled={isSaving || statusEdit.status === 'cancelled'}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-40 disabled:pointer-events-none"
              title={t('admin_order_cancel_button')}
            >
              <Trash2 size={14} /> {t('admin_order_cancel_button')}
            </button>
            <button
              type="button"
              onClick={() => void exportWord()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg"
            >
              <Download size={14} /> Word
            </button>
            <button
              type="button"
              onClick={() => void deleteOrderPermanently()}
              disabled={isSaving}
              title={t('admin_order_delete_button')}
              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash2 size={14} />
            </button>
            <button type="button" onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all text-slate-400"><X size={20} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-8 space-y-6">

          {/* Client info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                <Users size={11} /> Kontaktperson
              </div>
              {o.company_name && <div className="flex items-center gap-2"><Building2 size={13} className="text-emerald-500 shrink-0" /><span className="text-[11px] font-black text-slate-900">{o.company_name}</span>{o.vat_number && <span className="text-[9px] text-slate-400">({o.vat_number})</span>}</div>}
              <div className="text-sm font-black text-slate-900">{`${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name}</div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500"><Mail size={12} className="text-emerald-500" />{o.customer_email}</div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500"><Phone size={12} className="text-emerald-500" />{o.customer_phone}</div>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase ${o.client_type === 'business' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {o.client_type === 'business' ? 'Virksomhed' : 'Privat'}
              </div>
            </div>
            <div className="space-y-3 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                <MapPin size={11} /> Adresser
              </div>
              <div>
                <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('admin_order_billing')}</div>
                <div className="text-[10px] text-slate-700 leading-relaxed">{addr || o.department || '—'}<br />{city}</div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1"><Truck size={10} /> Levering</div>
                {o.delivery_same_as_billing
                  ? <div className="text-[9px] text-slate-400 italic">{t('admin_order_delivery_same')}</div>
                  : <div className="text-[10px] text-slate-700 leading-relaxed">{delAddr}<br />{delCity}</div>}
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Package size={11} /> Ordrevarer</div>
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest">{t('admin_order_col_product')}</th>
                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-center">{t('admin_order_col_category')}</th>
                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-center">{t('admin_order_col_qty')}</th>
                    <th className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-right">{t('admin_order_col_price')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((it: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-900">{it.name}</td>
                      <td className="px-4 py-3 text-[9px] text-slate-400 text-center">{it.category}</td>
                      <td className="px-4 py-3 text-[10px] font-black text-center">{it.quantity}</td>
                      <td className="px-4 py-3 text-[10px] font-black text-right">{((it.price || 0) * (it.quantity || 1)).toFixed(2)} {o.currency || 'EUR'}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={3} className="px-4 py-3 text-[10px] font-black uppercase text-right text-slate-800">{t('admin_order_main_ex_vat')}</td>
                    <td className="px-4 py-3 text-lg font-black text-slate-900 text-right tabular-nums">{totalExVat.toFixed(2)} {o.currency || 'EUR'}</td>
                  </tr>
                  <tr className="bg-emerald-50 border-t border-emerald-100">
                    <td colSpan={3} className="px-4 py-3 text-[9px] font-bold uppercase text-right text-slate-500">{t('admin_order_sub_incl_vat')}</td>
                    <td className="px-4 py-3 text-sm font-black text-emerald-600 text-right tabular-nums">{totalIncVat.toFixed(2)} {o.currency || 'EUR'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Message */}
          {o.customer_message && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1"><MessageSquare size={10} /> Besked fra kunde</div>
              <div className="text-[10px] text-slate-700 italic leading-relaxed">"{o.customer_message}"</div>
            </div>
          )}

          <AdminOrderCorrespondence
            key={String(o.id ?? '')}
            order={o as Record<string, unknown>}
            correspondenceRefreshKey={correspondenceRefreshKey}
          />

          <AdminMarketingFunnelPanel
            customerEmail={o.customer_email || ''}
            customerName={`${o.first_name || ''} ${o.last_name || ''}`.trim() || o.customer_name || ''}
            emailLang={o.lang || 'da'}
          />

          {/* Status panel */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity size={11} /> Ordrestatus
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_STATUSES.map(s => (
                <button key={s.key} type="button"
                  onClick={() => setStatusEdit(prev => ({ ...prev, status: s.key }))}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all ${statusEdit.status === s.key ? s.color + ' border-current font-black' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusEdit.status === s.key ? s.dot : 'bg-slate-200'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{({accepted: t('admin_status_accepted'), in_progress: t('admin_status_in_progress'), awaiting_transport: t('admin_status_awaiting'), in_transit: t('admin_status_in_transit'), delivered: t('admin_status_delivered'), cancelled: t('admin_status_cancelled')} as Record<string,string>)[s.key] || s.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Truck size={9} /> Dato afsendelse</label>
                <input type="date" value={statusEdit.shipping_date}
                  onChange={e => setStatusEdit(prev => ({ ...prev, shipping_date: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-emerald-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={9} /> Dato ankomst</label>
                <input type="date" value={statusEdit.arrival_date}
                  onChange={e => setStatusEdit(prev => ({ ...prev, arrival_date: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-emerald-400 transition-all" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void saveStatus()}
              disabled={isSaving}
              className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Gem status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

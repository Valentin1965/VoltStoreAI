import React from 'react';
import { X, Download, MapPin, Truck, Phone, Building2, Package, MessageSquare,
  Loader2, UserCheck, Percent, Hash, Shield, Mail, Calendar } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';

/* ═══════════════════════════════════════════════
   CLIENT HISTORY MODAL
═══════════════════════════════════════════════ */
interface ClientHistoryModalProps {
  client: any;
  history: any[];
  isLoading: boolean;
  onClose: () => void;
}

export const AdminClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  client: c, history: clientHistory, isLoading: isLoadingClientHistory, onClose,
}) => {
  const { t, language } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';
  const fullName    = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  const billingAddr = [c.street, c.house_number, c.apartment].filter(Boolean).join(' ');
  const billingCity = [c.postal_code, c.city, c.country].filter(Boolean).join(', ');
  const totalSpent  = clientHistory.reduce((s: number, o: any) => s + (o.total_price || 0), 0);
  const currency    = clientHistory[0]?.currency || 'EUR';

  const statusLabel = (o: any) => {
    const map: Record<string, { label: string; cls: string }> = {
      in_transit:         { label: t('status_in_transit'),          cls: 'text-emerald-600 bg-emerald-50' },
      awaiting_transport: { label: t('status_awaiting_transport'), cls: 'text-purple-600 bg-purple-50' },
      in_progress:        { label: t('status_in_progress'),          cls: 'text-amber-600 bg-amber-50' },
      accepted:           { label: t('status_accepted'),           cls: 'text-blue-600 bg-blue-50' },
    };
    return map[o.order_status] || { label: o.order_status || '—', cls: 'text-slate-400 bg-slate-50' };
  };

  const exportHistoryWord = async () => {
    const border  = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cell = (
      text: string,
      bold = false,
      shade = false,
      w = 2340,
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
    ) =>
      new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: { fill: shade ? 'F0FDF4' : 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ alignment: align, children: [new TextRun({ text: String(text || '—'), bold, font: 'Arial', size: 19 })] })] });
    const hdrCell = (
      text: string,
      w: number,
      align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
    ) =>
      new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: { fill: '0f172a', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold: true, color: 'FFFFFF', font: 'Arial', size: 18 })] })] });
    const infoRow = (label: string, value: string) => new TableRow({ children: [
      new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Arial', size: 19, color: '374151' })] })] }),
      new TableCell({ borders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: 'FFFFFF', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: value || '—', font: 'Arial', size: 19 })] })] }),
    ]});

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Arial', size: 19 } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: [
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'GREEN LIGHT SCANDINAVIA', bold: true, size: 30, color: '10b981', font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: 'Katmosevej 16, Viborg 8800, Denmark  ·  sales@glsolargroup.dk  ·  +45 61 48 52 19', size: 15, color: '6B7280', font: 'Arial' })] }),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '10b981', space: 1 } }, spacing: { after: 320 }, children: [] }),
          new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: 'KØBSHISTORIK', bold: true, size: 34, font: 'Arial' })] }),
          new Paragraph({ spacing: { after: 320 }, children: [new TextRun({ text: `Udskrevet: ${new Date().toLocaleDateString(localeStr, { day: '2-digit', month: 'long', year: 'numeric' })}  |  Ordrer: ${clientHistory.length}  |  Samlet: ${totalSpent.toFixed(2)} ${currency}`, size: 17, color: '6B7280', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 160, after: 120 }, children: [new TextRun({ text: 'KLIENTOPLYSNINGER', bold: true, size: 22, color: '111827', font: 'Arial' })] }),
          new Table({
            width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 6560],
            rows: [
              infoRow('Navn',       fullName),
              infoRow('Email',      c.email || ''),
              infoRow('Telefon',    c.phone || ''),
              infoRow('Type',       c.client_type === 'business' ? 'Virksomhed' : 'Privat'),
              ...(c.company_name ? [infoRow('Virksomhed', c.company_name)] : []),
              ...(c.vat_number   ? [infoRow('VAT / CVR',  c.vat_number)]   : []),
              infoRow('Adresse',    [billingAddr, billingCity].filter(Boolean).join(', ')),
            ],
          }),
          new Paragraph({ spacing: { before: 400, after: 120 }, children: [new TextRun({ text: 'ORDREHISTORIK', bold: true, size: 22, color: '111827', font: 'Arial' })] }),
          ...clientHistory.map((o: any, oi: number) => {
            const oDate   = o.created_at ? new Date(o.created_at).toLocaleDateString(localeStr) : '—';
            const oNo     = o.order_number || ('GLS-' + String(o.id || '').slice(0, 8).toUpperCase());
            const oItems: any[] = Array.isArray(o.items) ? o.items : [];
            const sLabel  = statusLabel(o).label;
            return [
              new Paragraph({ spacing: { before: oi === 0 ? 0 : 280, after: 100 }, children: [
                new TextRun({ text: `#${oNo}`, bold: true, size: 22, font: 'Arial', color: '10b981' }),
                new TextRun({ text: `   ${oDate}   ·   ${sLabel}`, size: 18, font: 'Arial', color: '6B7280' }),
                ...(o.shipping_date ? [new TextRun({ text: `   · Afsendt: ${new Date(o.shipping_date).toLocaleDateString(localeStr)}`, size: 16, font: 'Arial', color: '9CA3AF' })] : []),
                ...(o.arrival_date  ? [new TextRun({ text: `   · Ankomst: ${new Date(o.arrival_date).toLocaleDateString(localeStr)}`,  size: 16, font: 'Arial', color: '9CA3AF' })] : []),
              ]}),
              new Table({
                width: { size: 9360, type: WidthType.DXA }, columnWidths: [5000, 1500, 1430, 1430],
                rows: [
                  new TableRow({ tableHeader: true, children: [hdrCell('Produkt', 5000), hdrCell('Kategori', 1500, AlignmentType.CENTER), hdrCell('Antal', 1430, AlignmentType.CENTER), hdrCell('Pris', 1430, AlignmentType.RIGHT)] }),
                  ...oItems.map((it: any, ii: number) => new TableRow({ children: [
                    cell(String(it.name || ''), false, false, 5000),
                    cell(String(it.category || ''), false, ii % 2 === 1, 1500, AlignmentType.CENTER),
                    cell(String(it.quantity || 1), true, ii % 2 === 1, 1430, AlignmentType.CENTER),
                    cell(`${((it.price || 0) * (it.quantity || 1)).toFixed(2)} ${o.currency || 'EUR'}`, false, ii % 2 === 1, 1430, AlignmentType.RIGHT),
                  ]})),
                  new TableRow({ children: [
                    new TableCell({ borders, width: { size: 7930, type: WidthType.DXA }, columnSpan: 3, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL inkl. moms', bold: true, font: 'Arial', size: 20 })] })] }),
                    new TableCell({ borders, width: { size: 1430, type: WidthType.DXA }, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${(o.total_price || 0).toFixed(2)} ${o.currency || 'EUR'}`, bold: true, color: '10b981', font: 'Arial', size: 20 })] })] }),
                  ]}),
                ],
              }),
            ];
          }).flat(),
          new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 1 } }, spacing: { before: 480, after: 0 }, children: [new TextRun({ text: 'Green Light Scandinavia  ·  Katmosevej 16, 8800 Viborg  ·  sales@glsolargroup.dk  ·  +45 61 48 52 19', size: 15, color: '9CA3AF', font: 'Arial' })] }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `GLS-Historie-${fullName.replace(/\s+/g, '-')}.docx`);
  };

  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-100">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${c.client_type === 'business' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
              {c.client_type === 'business' ? <Building2 size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-tighter text-slate-900">{fullName}</div>
              {c.company_name && <div className="text-[10px] font-bold text-slate-500">{c.company_name}</div>}
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportHistoryWord}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">
              <Download size={14} /> Word
            </button>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-200 rounded-xl transition-all text-slate-400"><X size={20} /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-8 space-y-6">
          {/* Info chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Telefon',    value: c.phone || '—',                                         icon: <Phone size={11} /> },
              { label: 'Land',       value: c.country || '—',                                       icon: <MapPin size={11} /> },
              { label: 'By',         value: [c.postal_code, c.city].filter(Boolean).join(' ') || '—', icon: <MapPin size={11} /> },
              { label: 'Postnummer', value: c.postal_code || '—',                                   icon: null },
            ].map(f => (
              <div key={f.label} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1">{f.icon}{f.label}</div>
                <div className="text-[11px] font-black text-slate-900">{f.value}</div>
              </div>
            ))}
          </div>

          {c.client_type === 'business' && (c.company_name || c.vat_number) && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
              <Building2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">{t('admin_client_company_info')}</div>
                <div className="flex flex-wrap gap-4">
                  {c.company_name && <div><span className="text-[8px] text-blue-400 font-bold uppercase">{t('admin_client_name')} </span><span className="text-[11px] font-black text-slate-900">{c.company_name}</span></div>}
                  {c.vat_number   && <div><span className="text-[8px] text-blue-400 font-bold uppercase">{t('admin_client_vat')} </span><span className="text-[11px] font-black text-slate-900">{c.vat_number}</span></div>}
                </div>
              </div>
            </div>
          )}

          {(billingAddr || billingCity) && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('admin_client_billing')}</div>
                <div className="text-[11px] font-bold text-slate-700">{billingAddr}</div>
                <div className="text-[10px] text-slate-400">{billingCity}</div>
              </div>
              {!c.delivery_same_as_billing && (c.delivery_street || c.delivery_city) ? (
                <div className="flex-1 pl-4 border-l border-slate-200">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Truck size={9} /> Leveringsadresse</div>
                  <div className="text-[11px] font-bold text-slate-700">{[c.delivery_street, c.delivery_house_number].filter(Boolean).join(' ') || '—'}</div>
                  <div className="text-[10px] text-slate-400">{[c.delivery_postal_code, c.delivery_city, c.delivery_country].filter(Boolean).join(', ')}</div>
                  {c.delivery_phone && <div className="text-[9px] text-slate-400 mt-0.5"><Phone size={9} className="inline mr-1" />{c.delivery_phone}</div>}
                </div>
              ) : c.delivery_same_as_billing ? (
                <div className="flex-1 pl-4 border-l border-slate-200">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Truck size={9} /> Levering</div>
                  <div className="text-[9px] text-slate-400 italic">{t('admin_client_delivery_same')}</div>
                </div>
              ) : null}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-5 bg-slate-900 rounded-2xl text-center">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('admin_client_orders')}</div>
              <div className="text-3xl font-black text-white">{clientHistory.length}</div>
            </div>
            <div className="p-5 bg-emerald-500 rounded-2xl text-center">
              <div className="text-[8px] font-black text-emerald-100 uppercase tracking-widest mb-2">{t('admin_client_total_bought')}</div>
              <div className="text-2xl font-black text-white">{totalSpent.toFixed(0)}<span className="text-sm ml-1">{currency}</span></div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl text-center border border-slate-100">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('admin_client_avg_order')}</div>
              <div className="text-2xl font-black text-slate-900">{clientHistory.length ? (totalSpent / clientHistory.length).toFixed(0) : '—'}<span className="text-sm ml-1 text-slate-400">{currency}</span></div>
            </div>
          </div>

          {/* Orders list */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Package size={11} /> Ordrehistorik</div>
            {isLoadingClientHistory && <div className="flex items-center justify-center py-12 gap-3 text-slate-400"><Loader2 size={20} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">{t('admin_client_loading')}</span></div>}
            {!isLoadingClientHistory && clientHistory.length === 0 && <div className="text-center py-10 text-[10px] text-slate-300 font-black uppercase tracking-widest">{t('admin_client_no_orders')}</div>}
            <div className="space-y-3">
              {clientHistory.map((o: any) => {
                const oDate  = o.created_at ? new Date(o.created_at).toLocaleDateString(localeStr) : '—';
                const oNo    = o.order_number || ('GLS-' + String(o.id || '').slice(0, 8).toUpperCase());
                const oItems: any[] = Array.isArray(o.items) ? o.items : [];
                const st     = statusLabel(o);
                return (
                  <div key={o.id} className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex-wrap gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-600">#{oNo}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{oDate}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        {o.shipping_date && <span className="text-[8px] text-slate-400 font-bold">📤 {new Date(o.shipping_date).toLocaleDateString(localeStr)}</span>}
                        {o.arrival_date  && <span className="text-[8px] text-slate-400 font-bold">📥 {new Date(o.arrival_date).toLocaleDateString(localeStr)}</span>}
                      </div>
                      <span className="text-[12px] font-black text-emerald-600">{(o.total_price || 0).toFixed(2)} {o.currency || 'EUR'}</span>
                    </div>
                    <div className="px-5 py-3 space-y-1.5">
                      {oItems.map((it: any, ii: number) => (
                        <div key={ii} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-700 font-bold">{it.quantity}× {it.name}</span>
                          <span className="text-slate-400 font-bold">{((it.price || 0) * (it.quantity || 1)).toFixed(2)} {o.currency || 'EUR'}</span>
                        </div>
                      ))}
                      {o.customer_message && <div className="mt-2 text-[9px] text-slate-400 italic flex items-start gap-1"><MessageSquare size={9} className="mt-0.5 shrink-0" />"{o.customer_message}"</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   INSPECT USER MODAL (discount editor)
═══════════════════════════════════════════════ */
interface InspectUserModalProps {
  client: any;
  onClose: () => void;
  onDiscountSaved: (clientId: string, discount: number) => void;
}

export const AdminInspectUserModal: React.FC<InspectUserModalProps> = ({ client, onClose, onDiscountSaved }) => {
  const { language, t } = useLanguage();
  const localeStr = language === 'da' ? 'da-DK' : language === 'no' ? 'nb-NO' : language === 'se' ? 'sv-SE' : 'en-GB';
  const { addNotification } = useNotification();
  const { updateUserDiscount } = useUser(); // kept for currentUser sync
  const adminKey = import.meta.env.VITE_ADMIN_PASSWORD;
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in text-left">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl relative border-2 border-slate-950 flex flex-col animate-modal-in overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl text-emerald-500 shadow-lg"><UserCheck size={20} /></div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">{fullName}</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                {client.client_type === 'business' ? `🏢 ${client.company_name || 'Erhvervskunde'}` : '👤 Privatkunde'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={10} className="text-emerald-500" /> Email Address</div>
              <div className="text-xs font-black text-slate-900 break-all">{client.email}</div>
            </div>
            <div className="space-y-1.5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Hash size={10} className="text-emerald-500" /> System ID</div>
              <div className="text-xs font-black text-slate-900">UID-{String(client.id).slice(0, 8).toUpperCase()}</div>
            </div>
          </div>

          <div className="space-y-6 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><Shield size={16} className="text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest">{t('admin_verify_status')}</span></div>
                <span className="px-3 py-1 bg-emerald-500 text-[8px] font-black uppercase rounded-full">{t('admin_active')}</span>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><Percent size={16} className="text-amber-500" /><span className="text-[10px] font-black uppercase tracking-widest">{t('admin_yield_discount')}</span></div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" defaultValue={client.discount || 0} id="inspect-discount-input"
                    className="w-16 bg-white/10 border border-white/20 rounded-xl px-2 py-1 text-center text-sm font-black text-amber-400 outline-none focus:border-amber-500" />
                  <span className="text-amber-500 font-black">%</span>
                  <button onClick={async () => {
                    const val = Number((document.getElementById('inspect-discount-input') as HTMLInputElement)?.value || 0);
                    try {
                      const { error } = await supabase.rpc('admin_update_discount', {
                        p_key: adminKey, p_client_id: client.id, p_discount: val,
                      });
                      if (error) throw error;
                      // also sync UserContext if this is the logged-in user
                      await updateUserDiscount(client.id, val);
                      onDiscountSaved(client.id, val);
                      addNotification(`Rabat opdateret: ${val}%`, 'success');
                    } catch (err: any) {
                      addNotification(`Fejl: ${err.message}`, 'error');
                    }
                  }} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-[9px] font-black uppercase transition-all">
                    Gem
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Calendar size={16} className="text-blue-500" /><span className="text-[10px] font-black uppercase tracking-widest">{t('admin_member_since')}</span></div>
                <span className="text-[10px] font-black text-slate-400 italic">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString(localeStr) : 'Recently Synchronized'}
                </span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5"><UserCheck size={120} /></div>
          </div>
        </div>

        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button onClick={onClose} className="bg-slate-900 px-12 py-4 rounded-2xl text-[10px] font-black uppercase text-white shadow-xl hover:bg-slate-800 transition-all">{t('admin_close_audit')}</button>
        </div>
      </div>
    </div>
  );
};

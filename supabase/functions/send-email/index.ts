// Supabase Edge Function — send-email  (multilingual: da / en / no / se)
// Deploy: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
// Business rules:
// - General inquiries: info@
// - Cart/orders: sales@
const SALES_EMAIL    = 'sales@glsolargroup.dk';
const INFO_EMAIL     = 'info@glsolargroup.dk';
const COMPANY_NAME   = 'Green Light Scandinavia';
// Resend blocks unverified sender domains. Configure RESEND_FROM after verifying domain in Resend.
// Fallback to a Resend-provided sender so the function still works in the meantime.
const FROM           = Deno.env.get('RESEND_FROM') ?? `${COMPANY_NAME} <onboarding@resend.dev>`;
// Optional global override (kept for backwards compatibility). For per-email reply-to we set it below.
const DEFAULT_REPLY_TO = Deno.env.get('RESEND_REPLY_TO') ?? '';

const ALLOWED_ORIGINS = ['https://glsolargroup.dk', 'https://www.glsolargroup.dk'];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin  = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ── Translations ──────────────────────────────────────────────────────────────

type Lang = 'da' | 'en' | 'no' | 'se';

const TR: Record<string, Record<Lang, string>> = {
  label_order:      { da: 'Ordre',        en: 'Order',      no: 'Ordre',       se: 'Order'       },
  label_date:       { da: 'Dato',         en: 'Date',       no: 'Dato',        se: 'Datum'       },
  greeting_co:      { da: 'Hej,',         en: 'Hello,',     no: 'Hei,',        se: 'Hej,'        },
  new_order_from:   {
    da: 'Ny ordre #{no} fra {name}.',
    en: 'New order #{no} from {name}.',
    no: 'Ny ordre #{no} fra {name}.',
    se: 'Ny order #{no} från {name}.',
  },
  greeting_cx:      {
    da: 'Hej {name},',
    en: 'Hello {name},',
    no: 'Hei {name},',
    se: 'Hej {name},',
  },
  order_received:   {
    da: 'Tak for din ordre! Vi har modtaget din bestilling #{no} og vender tilbage snarest.',
    en: 'Thank you for your order! We have received order #{no} and will be in touch shortly.',
    no: 'Takk for din bestilling! Vi har mottatt din ordre #{no} og kommer tilbake snart.',
    se: 'Tack för din beställning! Vi har tagit emot order #{no} och återkommer snart.',
  },
  sect_client:      { da: 'Klientoplysninger', en: 'Client information', no: 'Kundeinformasjon', se: 'Kundinformation' },
  sect_items:       { da: 'Ordrevarer',        en: 'Order items',        no: 'Ordrevarer',       se: 'Ordervaror'      },
  col_product:      { da: 'Produkt',  en: 'Product', no: 'Produkt',  se: 'Produkt' },
  col_cat:          { da: 'Kat.',     en: 'Cat.',    no: 'Kat.',     se: 'Kat.'    },
  col_qty:          { da: 'Antal',    en: 'Qty',     no: 'Antall',   se: 'Antal'   },
  col_price:        { da: 'Pris',     en: 'Price',   no: 'Pris',     se: 'Pris'    },
  total_line:       {
    da: 'TOTAL inkl. 25% moms',
    en: 'TOTAL incl. 25% VAT',
    no: 'TOTAL inkl. 25% mva',
    se: 'TOTALT inkl. 25% moms',
  },
  lbl_billing:      { da: 'Fakturering', en: 'Billing',  no: 'Fakturering', se: 'Fakturering' },
  lbl_delivery:     { da: 'Levering',    en: 'Delivery', no: 'Levering',    se: 'Leverans'    },
  cx_msg_title:     {
    da: 'Besked fra kunde',
    en: 'Message from customer',
    no: 'Beskjed fra kunde',
    se: 'Meddelande från kund',
  },
  cabinet_btn:      {
    da: 'Se dine ordrer i Min Konto',
    en: 'View your orders in My Account',
    no: 'Se dine ordrer i Min Konto',
    se: 'Se dina ordrar i Mitt Konto',
  },
  login_with:       {
    da: 'Log ind med din email',
    en: 'Log in with your email',
    no: 'Logg inn med din e-post',
    se: 'Logga in med din e-post',
  },
  subj_order:       {
    da: 'Din ordre #{no} er modtaget — {co}',
    en: 'Your order #{no} has been received — {co}',
    no: 'Din ordre #{no} er mottatt — {co}',
    se: 'Din order #{no} är mottagen — {co}',
  },
  // Status
  status_header:    { da: 'Statusopdatering',  en: 'Status update',     no: 'Statusoppdatering', se: 'Statusuppdatering' },
  timeline_title:   { da: 'Ordreforløb',       en: 'Order timeline',    no: 'Ordreforløp',       se: 'Orderförlopp'      },
  questions:        {
    da: 'Har du spørgsmål, kontakt os på',
    en: 'If you have questions, contact us at',
    no: 'Har du spørsmål, kontakt oss på',
    se: 'Har du frågor, kontakta oss på',
  },
  q_or:             { da: 'eller', en: 'or', no: 'eller', se: 'eller' },
  status_btn:       {
    da: 'Min Konto — Se ordrestatus',
    en: 'My Account — View order status',
    no: 'Min Konto — Se ordrestatus',
    se: 'Mitt Konto — Se orderstatus',
  },
  date_ship:        { da: 'Afsendelsesdato',   en: 'Shipping date',   no: 'Sendingsdato',   se: 'Avsändningsdatum' },
  date_arrive:      { da: 'Forventet ankomst', en: 'Expected arrival', no: 'Forventet ankomst', se: 'Beräknad ankomst' },
};

function tr(key: string, lang: Lang, vars: Record<string, string> = {}): string {
  let s = TR[key]?.[lang] ?? TR[key]?.da ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function getLang(raw: unknown): Lang {
  return (['da','en','no','se'] as Lang[]).includes(raw as Lang) ? (raw as Lang) : 'da';
}

// ── Status metadata ───────────────────────────────────────────────────────────

type SK = 'accepted' | 'in_progress' | 'awaiting_transport' | 'in_transit' | 'cancelled';

const SM: Record<SK, { icon: string; color: string; bg: string; label: Record<Lang,string>; msg: Record<Lang,string> }> = {
  accepted: {
    icon:'✅', color:'#1d4ed8', bg:'#eff6ff',
    label: { da:'Ordre modtaget',  en:'Order received',  no:'Ordre mottatt',   se:'Order mottagen'     },
    msg:   { da:'Vi har modtaget din ordre og behandler den snarest.',
             en:'We have received your order and will process it shortly.',
             no:'Vi har mottatt din ordre og behandler den snarest.',
             se:'Vi har tagit emot din order och behandlar den snart.' },
  },
  in_progress: {
    icon:'🔧', color:'#d97706', bg:'#fffbeb',
    label: { da:'I arbejde',          en:'In progress',       no:'Under arbeid',       se:'Under bearbetning'  },
    msg:   { da:'Din ordre er nu under behandling af vores team.',
             en:'Your order is now being processed by our team.',
             no:'Din ordre behandles nå av vårt team.',
             se:'Din order bearbetas nu av vårt team.' },
  },
  awaiting_transport: {
    icon:'📦', color:'#7c3aed', bg:'#f5f3ff',
    label: { da:'Afventer transport', en:'Awaiting transport', no:'Venter på transport', se:'Väntar på transport' },
    msg:   { da:'Din ordre er klar og afventer afhentning af transportøren.',
             en:'Your order is ready and awaiting pickup by the carrier.',
             no:'Din ordre er klar og venter på henting av transportøren.',
             se:'Din order är klar och väntar på upphämtning av transportören.' },
  },
  in_transit: {
    icon:'🚚', color:'#059669', bg:'#f0fdf4',
    label: { da:'I transit — på vej til dig', en:'In transit — on its way', no:'I transitt — på vei til deg', se:'Under transport — på väg' },
    msg:   { da:'Din ordre er sendt og er nu på vej til leveringsadressen.',
             en:'Your order has been shipped and is on its way to the delivery address.',
             no:'Din ordre er sendt og er nå på vei til leveringsadressen.',
             se:'Din order har skickats och är nu på väg till leveransadressen.' },
  },
  cancelled: {
    icon:'❌', color:'#e11d48', bg:'#fff1f2',
    label: { da:'Ordre annulleret', en:'Order cancelled', no:'Ordre kansellert', se:'Order annullerad' },
    msg:   {
      da:'Din ordre er blevet annulleret. Hvis dette er en fejl, så kontakt os — vi hjælper gerne.',
      en:'Your order has been cancelled. If this is a mistake, please contact us — we will help.',
      no:'Din ordre er kansellert. Hvis dette er en feil, kontakt oss — vi hjelper gjerne.',
      se:'Din order har annullerats. Om detta är ett misstag, kontakta oss — vi hjälper gärna.',
    },
  },
};

// ── HTML builders ─────────────────────────────────────────────────────────────

function buildOrderHTML(data: any, isCompany: boolean): string {
  const lang = getLang(data.lang);

  const itemRows = (data.items ?? []).map((it: any, i: number) => `
    <tr style="background:${i%2===0?'#ffffff':'#f9fafb'}">
      <td style="padding:10px 14px;font-size:12px;color:#111827">${it.name}</td>
      <td style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:center">${it.category??''}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;text-align:center">${it.quantity}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;text-align:right">${((it.price??0)*(it.quantity??1)).toFixed(2)} ${data.currency}</td>
    </tr>`).join('');

  const greeting = isCompany
    ? `<p style="margin:0 0 8px;font-size:14px;color:#374151">${tr('greeting_co',lang)}</p>
       <p style="margin:0;font-size:14px;color:#374151">${tr('new_order_from',lang,{no:data.orderNo,name:data.customerName})}</p>`
    : `<p style="margin:0 0 8px;font-size:14px;color:#374151">${tr('greeting_cx',lang,{name:data.customerName})}</p>
       <p style="margin:0;font-size:14px;color:#374151">${tr('order_received',lang,{no:data.orderNo})}</p>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f172a;padding:28px 32px">
    <div style="font-size:20px;font-weight:900;color:#10b981">GREEN LIGHT SCANDINAVIA</div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px">Katmosevej 16, 8800 Viborg · sales@glsolargroup.dk · +45 61 48 52 19</div>
  </div>
  <div style="background:#f0fdf4;border-bottom:1px solid #d1fae5;padding:18px 32px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280">${tr('label_order',lang)}</div>
      <div style="font-size:22px;font-weight:900;color:#111827">#${data.orderNo}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280">${tr('label_date',lang)}</div>
      <div style="font-size:14px;font-weight:700;color:#374151">${data.orderDate}</div>
    </div>
  </div>
  <div style="padding:28px 32px">
    ${greeting}
    <div style="margin-top:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#10b981;margin-bottom:12px">${tr('sect_client',lang)}</div>
      ${data.clientType==='business'&&data.companyName?`<div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:4px">${data.companyName}${data.vatNumber?` <span style="color:#6b7280;font-weight:400">(${data.vatNumber})</span>`:''}</div>`:''}
      <div style="font-size:13px;color:#374151;line-height:1.8">
        <strong>${data.customerName}</strong><br>${data.customerEmail}<br>${data.customerPhone}<br>
        <span style="color:#6b7280;font-size:11px">${tr('lbl_billing',lang)}: ${data.billingAddress}</span><br>
        <span style="color:#6b7280;font-size:11px">${tr('lbl_delivery',lang)}: ${data.deliveryAddress}</span>
      </div>
    </div>
    <div style="margin-top:20px">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280;margin-bottom:10px">${tr('sect_items',lang)}</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
        <thead><tr style="background:#111827">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:left">${tr('col_product',lang)}</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:center">${tr('col_cat',lang)}</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:center">${tr('col_qty',lang)}</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:right">${tr('col_price',lang)}</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr style="background:#f0fdf4;border-top:2px solid #d1fae5">
          <td colspan="3" style="padding:12px 14px;font-size:12px;font-weight:900;text-align:right;color:#374151">${tr('total_line',lang)}</td>
          <td style="padding:12px 14px;font-size:16px;font-weight:900;text-align:right;color:#10b981">${(data.totalPrice??0).toFixed(2)} ${data.currency}</td>
        </tr></tfoot>
      </table>
    </div>
    ${data.customerMessage?`<div style="margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px"><div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#d97706;margin-bottom:6px">${tr('cx_msg_title',lang)}</div><div style="font-size:13px;color:#374151;font-style:italic">"${data.customerMessage}"</div></div>`:''}
    ${!isCompany?`
    <div style="margin-top:28px;text-align:center">
      <a href="https://glsolargroup.dk/#cabinet" style="display:inline-block;background:#10b981;color:#ffffff;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;padding:14px 32px;border-radius:12px;text-decoration:none">
        📋 ${tr('cabinet_btn',lang)}
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#9ca3af">${tr('login_with',lang)}: <strong>${data.customerEmail}</strong></p>
    </div>`:''}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center">
    <div style="font-size:11px;color:#9ca3af">Green Light Scandinavia · Katmosevej 16, 8800 Viborg · sales@glsolargroup.dk</div>
  </div>
</div></body></html>`;
}

function buildStatusHTML(data: any): string {
  const lang = getLang(data.lang);
  const sk   = (data.newStatus ?? 'accepted') as SK;
  const meta = SM[sk] ?? SM.accepted;
  const steps: SK[] = ['accepted','in_progress','awaiting_transport','in_transit','cancelled'];
  const idx  = steps.indexOf(sk);

  const dateBlock = (data.shippingDate||data.arrivalDate) ? `
    <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
      ${data.shippingDate?`<div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">📅 ${tr('date_ship',lang)}</div><div style="font-size:15px;font-weight:900;color:#111827">${data.shippingDate}</div></div>`:''}
      ${data.arrivalDate?`<div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">🏠 ${tr('date_arrive',lang)}</div><div style="font-size:15px;font-weight:900;color:#111827">${data.arrivalDate}</div></div>`:''}
    </div>` : '';

  const timeline = steps.map((s,i) => {
    const m = SM[s]; const done = i<=idx;
    return `<div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0">
      <div style="width:26px;height:26px;border-radius:50%;background:${done?m.color:'#e5e7eb'};color:${done?'#fff':'#9ca3af'};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:2px">${done?'✓':'○'}</div>
      <div style="font-size:12px;font-weight:${done?'900':'500'};color:${done?'#111827':'#9ca3af'}">${m.label[lang]}</div>
    </div>${i<steps.length-1?`<div style="margin-left:13px;width:1px;height:10px;background:${i<idx?m.color:'#e5e7eb'}"></div>`:''}`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f172a;padding:24px 32px">
    <div style="font-size:18px;font-weight:900;color:#10b981">GREEN LIGHT SCANDINAVIA</div>
    <div style="font-size:10px;color:#6b7280;margin-top:3px">sales@glsolargroup.dk · +45 61 48 52 19</div>
  </div>
  <div style="background:${meta.bg};border-bottom:3px solid ${meta.color};padding:24px 32px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${meta.color};margin-bottom:6px">${tr('status_header',lang)}</div>
    <div style="font-size:26px;font-weight:900;color:#111827">${meta.icon} ${meta.label[lang]}</div>
    <div style="font-size:10px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase">${tr('label_order',lang)} #${data.orderNo}</div>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 8px;font-size:14px;color:#374151">${tr('greeting_cx',lang,{name:data.customerName})}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151">${meta.msg[lang]}</p>
    ${dateBlock}
    <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280;margin-bottom:14px">${tr('timeline_title',lang)}</div>
      ${timeline}
    </div>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;line-height:1.6">${tr('questions',lang)} <a href="mailto:sales@glsolargroup.dk" style="color:#10b981;font-weight:700">sales@glsolargroup.dk</a> ${tr('q_or',lang)} <a href="tel:+4561485219" style="color:#10b981;font-weight:700">+45 61 48 52 19</a>.</p>
    <div style="margin-top:20px;text-align:center">
      <a href="https://glsolargroup.dk/#cabinet" style="display:inline-block;background:#0f172a;color:#10b981;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding:12px 28px;border-radius:10px;text-decoration:none;border:1px solid #10b981">
        📋 ${tr('status_btn',lang)}
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <div style="font-size:10px;color:#9ca3af">Green Light Scandinavia · Katmosevej 16, 8800 Viborg, Denmark</div>
  </div>
</div></body></html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
  if (!RESEND_API_KEY) return new Response(
    JSON.stringify({ error: 'RESEND_API_KEY not set' }),
    { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
  );

  try {
    const body = await req.json();
    const { type, ...data } = body;
    const lang = getLang(data.lang);

    const send = async (to: string, subject: string, html: string, replyTo?: string) => {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: FROM,
          to,
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : (DEFAULT_REPLY_TO ? { reply_to: DEFAULT_REPLY_TO } : {})),
        }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    };

    if (type === 'order') {
      await Promise.all([
        // Admin notification about new order → SALES
        send(
          SALES_EMAIL,
          `Ny ordre #${data.orderNo} — ${data.customerName}`,
          buildOrderHTML(data, true),
          SALES_EMAIL,
        ),
        // Customer confirmation → reply to SALES (cart/orders flow)
        send(data.customerEmail, tr('subj_order', lang, { no: data.orderNo, co: COMPANY_NAME }),
             buildOrderHTML(data, false),
             SALES_EMAIL),
      ]);
    } else if (type === 'status') {
      const meta = SM[(data.newStatus??'accepted') as SK] ?? SM.accepted;
      await send(
        data.customerEmail,
        `${meta.icon} ${tr('label_order',lang)} #${data.orderNo} — ${meta.label[lang]}`,
        buildStatusHTML(data),
        SALES_EMAIL
      );
    } else {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[send-email]', err);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});

// Supabase Edge Function — send-email
// Resend API key lives here as a Supabase secret (never exposed to browser)
// Deploy: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const COMPANY_EMAIL  = 'sales@glsolargroup.dk';
const COMPANY_NAME   = 'Green Light Scandinavia';
const FROM           = `${COMPANY_NAME} <noreply@glsolargroup.dk>`;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ──────────────────────────────────────────────
// HTML BUILDERS
// ──────────────────────────────────────────────

function buildOrderHTML(data: any, isCompany: boolean): string {
  const itemRows = (data.items ?? []).map((it: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
      <td style="padding:10px 14px;font-size:12px;color:#111827">${it.name}</td>
      <td style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:center">${it.category ?? ''}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;text-align:center">${it.quantity}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;text-align:right">${((it.price ?? 0) * (it.quantity ?? 1)).toFixed(2)} ${data.currency}</td>
    </tr>`).join('');

  const greeting = isCompany
    ? `<p style="margin:0 0 8px;font-size:14px;color:#374151">Hej,</p><p style="margin:0;font-size:14px;color:#374151">Ny ordre <strong>#${data.orderNo}</strong> fra <strong>${data.customerName}</strong>.</p>`
    : `<p style="margin:0 0 8px;font-size:14px;color:#374151">Hej <strong>${data.customerName}</strong>,</p><p style="margin:0;font-size:14px;color:#374151">Tak for din ordre! Vi har modtaget din bestilling <strong>#${data.orderNo}</strong> og vender tilbage snarest.</p>`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f172a;padding:28px 32px">
    <div style="font-size:20px;font-weight:900;color:#10b981">GREEN LIGHT SCANDINAVIA</div>
    <div style="font-size:11px;color:#6b7280;margin-top:4px">Katmosevej 16, 8800 Viborg · sales@glsolargroup.dk · +45 61 48 52 19</div>
  </div>
  <div style="background:#f0fdf4;border-bottom:1px solid #d1fae5;padding:18px 32px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280">Ordre</div>
      <div style="font-size:22px;font-weight:900;color:#111827">#${data.orderNo}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#6b7280">Dato</div>
      <div style="font-size:14px;font-weight:700;color:#374151">${data.orderDate}</div>
    </div>
  </div>
  <div style="padding:28px 32px">
    ${greeting}
    <div style="margin-top:24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#10b981;margin-bottom:12px">Klientoplysninger</div>
      ${data.clientType === 'business' && data.companyName ? `<div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:4px">${data.companyName}${data.vatNumber ? ` <span style="color:#6b7280;font-weight:400">(${data.vatNumber})</span>` : ''}</div>` : ''}
      <div style="font-size:13px;color:#374151;line-height:1.8">
        <strong>${data.customerName}</strong><br>
        ${data.customerEmail}<br>${data.customerPhone}<br>
        <span style="color:#6b7280;font-size:11px">Fakturering: ${data.billingAddress}</span><br>
        <span style="color:#6b7280;font-size:11px">Levering: ${data.deliveryAddress}</span>
      </div>
    </div>
    <div style="margin-top:20px">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280;margin-bottom:10px">Ordrevarer</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
        <thead><tr style="background:#111827">
          <th style="padding:10px 14px;font-size:10px;font-weight:700;text-transform:uppercase;color:#ffffff;text-align:left">Produkt</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:center">Kat.</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:center">Antal</th>
          <th style="padding:10px 14px;font-size:10px;color:#9ca3af;text-align:right">Pris</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr style="background:#f0fdf4;border-top:2px solid #d1fae5">
          <td colspan="3" style="padding:12px 14px;font-size:12px;font-weight:900;text-align:right;color:#374151">TOTAL inkl. 25% moms</td>
          <td style="padding:12px 14px;font-size:16px;font-weight:900;text-align:right;color:#10b981">${(data.totalPrice ?? 0).toFixed(2)} ${data.currency}</td>
        </tr></tfoot>
      </table>
    </div>
    ${data.customerMessage ? `<div style="margin-top:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px"><div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#d97706;margin-bottom:6px">Besked fra kunde</div><div style="font-size:13px;color:#374151;font-style:italic">"${data.customerMessage}"</div></div>` : ''}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center">
    <div style="font-size:11px;color:#9ca3af">Green Light Scandinavia · Katmosevej 16, 8800 Viborg · sales@glsolargroup.dk · +45 61 48 52 19</div>
  </div>
</div></body></html>`;
}

const STATUS_META: Record<string, { label: string; icon: string; color: string; bg: string; message: string }> = {
  accepted:           { label: 'Ordre modtaget',          icon: '✅', color: '#1d4ed8', bg: '#eff6ff', message: 'Vi har modtaget din ordre og behandler den snarest.' },
  in_progress:        { label: 'I arbejde',               icon: '🔧', color: '#d97706', bg: '#fffbeb', message: 'Din ordre er nu under behandling af vores team.' },
  awaiting_transport: { label: 'Afventer transport',      icon: '📦', color: '#7c3aed', bg: '#f5f3ff', message: 'Din ordre er klar og afventer afhentning af transportøren.' },
  in_transit:         { label: 'I transit — på vej til dig', icon: '🚚', color: '#059669', bg: '#f0fdf4', message: 'Din ordre er sendt og er nu på vej til leveringsadressen.' },
};

function buildStatusHTML(data: any): string {
  const meta = STATUS_META[data.newStatus] ?? STATUS_META.accepted;
  const steps = ['accepted', 'in_progress', 'awaiting_transport', 'in_transit'];
  const currentIdx = steps.indexOf(data.newStatus);

  const dateBlock = (data.shippingDate || data.arrivalDate) ? `
    <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
      ${data.shippingDate ? `<div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">📅 Afsendelsesdato</div><div style="font-size:15px;font-weight:900;color:#111827">${data.shippingDate}</div></div>` : ''}
      ${data.arrivalDate  ? `<div style="flex:1;min-width:140px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px">🏠 Forventet ankomst</div><div style="font-size:15px;font-weight:900;color:#111827">${data.arrivalDate}</div></div>` : ''}
    </div>` : '';

  const timeline = steps.map((s, i) => {
    const m = STATUS_META[s];
    const done = i <= currentIdx;
    return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 0">
        <div style="width:26px;height:26px;border-radius:50%;background:${done ? m.color : '#e5e7eb'};color:${done ? '#fff' : '#9ca3af'};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:2px">${done ? '✓' : '○'}</div>
        <div style="font-size:12px;font-weight:${done ? '900' : '500'};color:${done ? '#111827' : '#9ca3af'}">${m.label}</div>
      </div>
      ${i < steps.length - 1 ? `<div style="margin-left:13px;width:1px;height:10px;background:${i < currentIdx ? m.color : '#e5e7eb'}"></div>` : ''}`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f172a;padding:24px 32px">
    <div style="font-size:18px;font-weight:900;color:#10b981">GREEN LIGHT SCANDINAVIA</div>
    <div style="font-size:10px;color:#6b7280;margin-top:3px">sales@glsolargroup.dk · +45 61 48 52 19</div>
  </div>
  <div style="background:${meta.bg};border-bottom:3px solid ${meta.color};padding:24px 32px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${meta.color};margin-bottom:6px">Statusopdatering</div>
    <div style="font-size:26px;font-weight:900;color:#111827">${meta.icon} ${meta.label}</div>
    <div style="font-size:10px;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase">Ordre #${data.orderNo}</div>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 8px;font-size:14px;color:#374151">Hej <strong>${data.customerName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151">${meta.message}</p>
    ${dateBlock}
    <div style="margin-top:24px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280;margin-bottom:14px">Ordreforløb</div>
      ${timeline}
    </div>
    <p style="margin-top:24px;font-size:12px;color:#6b7280;line-height:1.6">Har du spørgsmål, kontakt os på <a href="mailto:sales@glsolargroup.dk" style="color:#10b981;font-weight:700">sales@glsolargroup.dk</a> eller <a href="tel:+4561485219" style="color:#10b981;font-weight:700">+45 61 48 52 19</a>.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <div style="font-size:10px;color:#9ca3af">Green Light Scandinavia · Katmosevej 16, 8800 Viborg, Denmark</div>
  </div>
</div></body></html>`;
}

// ──────────────────────────────────────────────
// HANDLER
// ──────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY secret not set. Run: supabase secrets set RESEND_API_KEY=re_xxxxx' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { type, ...data } = body; // type: 'order' | 'status'

    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM, to, subject, html }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend error ${res.status}: ${err}`);
      }
      return res.json();
    };

    if (type === 'order') {
      // Send to company + customer simultaneously
      await Promise.all([
        sendEmail(
          COMPANY_EMAIL,
          `Ny ordre #${data.orderNo} — ${data.customerName}`,
          buildOrderHTML(data, true)
        ),
        sendEmail(
          data.customerEmail,
          `Din ordre #${data.orderNo} er modtaget — ${COMPANY_NAME}`,
          buildOrderHTML(data, false)
        ),
      ]);
    } else if (type === 'status') {
      const meta = STATUS_META[data.newStatus] ?? STATUS_META.accepted;
      await sendEmail(
        data.customerEmail,
        `${meta.icon} Ordre #${data.orderNo} — ${meta.label}`,
        buildStatusHTML(data)
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[send-email]', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

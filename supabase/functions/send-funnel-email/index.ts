// Supabase Edge Function — marketing email funnel only (Resend)
// Deploy: supabase functions deploy send-funnel-email
// Secrets: same as send-email — RESEND_API_KEY, optional RESEND_FROM

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SALES_EMAIL = 'sales@glsolargroup.dk';
const COMPANY_NAME = 'Green Light Scandinavia';
const FROM = Deno.env.get('RESEND_FROM') ?? `${COMPANY_NAME} <onboarding@resend.dev>`;

const ALLOWED_ORIGINS = ['https://glsolargroup.dk', 'https://www.glsolargroup.dk'];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

type Lang = 'da' | 'en' | 'no' | 'se';

const TR: Record<string, Record<Lang, string>> = {
  greeting_cx: {
    da: 'Hej {name},',
    en: 'Hello {name},',
    no: 'Hei {name},',
    se: 'Hej {name},',
  },
  questions: {
    da: 'Har du spørgsmål, kontakt os på',
    en: 'If you have questions, contact us at',
    no: 'Har du spørsmål, kontakt oss på',
    se: 'Har du frågor, kontakta oss på',
  },
  q_or: { da: 'eller', en: 'or', no: 'eller', se: 'eller' },
};

function tr(key: string, lang: Lang, vars: Record<string, string> = {}): string {
  let s = TR[key]?.[lang] ?? TR[key]?.da ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function getLang(raw: unknown): Lang {
  return (['da', 'en', 'no', 'se'] as Lang[]).includes(raw as Lang) ? (raw as Lang) : 'da';
}

type FunnelStepKey = 'welcome' | 'nurture_1' | 'nurture_2';

const FUNNEL_STEPS: readonly FunnelStepKey[] = ['welcome', 'nurture_1', 'nurture_2'];

const FUNNEL: Record<FunnelStepKey, {
  accent: string;
  subj: Record<Lang, string>;
  headline: Record<Lang, string>;
  paragraphs: [Record<Lang, string>, Record<Lang, string>, Record<Lang, string>];
}> = {
  welcome: {
    accent: '#059669',
    subj: {
      da: 'Velkommen til Green Light Scandinavia',
      en: 'Welcome to Green Light Scandinavia',
      no: 'Velkommen til Green Light Scandinavia',
      se: 'Välkommen till Green Light Scandinavia',
    },
    headline: {
      da: 'Tak for din interesse i bæredygtig energi',
      en: 'Thank you for your interest in sustainable energy',
      no: 'Takk for din interesse i bærekraftig energi',
      se: 'Tack för ditt intresse för hållbar energi',
    },
    paragraphs: [
      {
        da: 'Du er nu med i vores e-mailserie med korte tips om solceller, lagring og installation i Norden.',
        en: 'You are now part of our short email series with practical tips on solar, storage and installation in the Nordics.',
        no: 'Du er nå med i vår e-postserie med korte tips om solceller, lagring og installasjon i Norden.',
        se: 'Du är nu med i vår e-postserie med korta tips om solceller, lagring och installation i Norden.',
      },
      {
        da: 'Vi hjælper både private og erhverv med kvalitetsprodukter og personlig rådgivning.',
        en: 'We help both private customers and businesses with quality products and personal guidance.',
        no: 'Vi hjelper både privatpersoner og bedrifter med kvalitetsprodukter og personlig veiledning.',
        se: 'Vi hjälper både privatpersoner och företag med kvalitetsprodukter och personlig rådgivning.',
      },
      {
        da: 'Har du spørgsmål, svarer vi gerne på sales@glsolargroup.dk eller +45 61 48 52 19.',
        en: 'If you have questions, we are happy to help at sales@glsolargroup.dk or +45 61 48 52 19.',
        no: 'Har du spørsmål, hjelper vi gjerne på sales@glsolargroup.dk eller +45 61 48 52 19.',
        se: 'Har du frågor når du oss gärna på sales@glsolargroup.dk eller +45 61 48 52 19.',
      },
    ],
  },
  nurture_1: {
    accent: '#1d4ed8',
    subj: {
      da: 'Tip: Sådan får du mere ud af din solenergi',
      en: 'Tip: Getting more from your solar setup',
      no: 'Tips: Slik får du mer ut av solenergien',
      se: 'Tips: Så får du mer ut av din solenergi',
    },
    headline: {
      da: 'Optimering af dit solcelleanlæg',
      en: 'Optimising your solar installation',
      no: 'Optimalisering av ditt solcelleanlegg',
      se: 'Optimera din solcellsanläggning',
    },
    paragraphs: [
      {
        da: 'Et veldimensioneret batteri og den rigtige inverter kan reducere dit netforbrug og øge selvforbruget.',
        en: 'Right-sized battery storage and the right inverter can cut grid use and increase self-consumption.',
        no: 'Riktig dimensjonert batteri og riktig inverter kan redusere nettforbruket og øke egenforbruket.',
        se: 'Rätt dimensionerat batteri och rätt inverter kan minska nätanvändningen och öka egenförbrukningen.',
      },
      {
        da: 'Vores team kan hjælpe med at matche komponenter til dit tag og dit forbrug.',
        en: 'Our team can help match components to your roof and your consumption.',
        no: 'Teamet vårt kan hjelpe med å matche komponenter til taket og forbruket ditt.',
        se: 'Vårt team kan hjälpa till att matcha komponenter mot ditt tak och din förbrukning.',
      },
      {
        da: 'Se udvalget og kontakt os, når du er klar til næste skridt.',
        en: 'Browse the catalogue and contact us when you are ready for the next step.',
        no: 'Se utvalget og kontakt oss når du er klar for neste steg.',
        se: 'Se utbudet och kontakta oss när du är redo för nästa steg.',
      },
    ],
  },
  nurture_2: {
    accent: '#7c3aed',
    subj: {
      da: 'Hvorfor vælge Green Light Scandinavia?',
      en: 'Why choose Green Light Scandinavia?',
      no: 'Hvorfor velge Green Light Scandinavia?',
      se: 'Varför välja Green Light Scandinavia?',
    },
    headline: {
      da: 'Kvalitet, gennemsigtighed og nordisk support',
      en: 'Quality, transparency and Nordic support',
      no: 'Kvalitet, åpenhet og nordisk support',
      se: 'Kvalitet, transparens och nordisk support',
    },
    paragraphs: [
      {
        da: 'Vi leverer dokumenterede mærker og står klar med rådgivning før og efter køb.',
        en: 'We supply proven brands and support you before and after purchase.',
        no: 'Vi leverer dokumenterte merker og er klare med rådgivning før og etter kjøp.',
        se: 'Vi leverer dokumenterade varumärken och finns med före och efter köpet.',
      },
      {
        da: 'Din ordre og service kan følges i Min Konto på vores website.',
        en: 'You can follow orders and service in My Account on our website.',
        no: 'Du kan følge ordre og service i Min konto på nettsiden vår.',
        se: 'Du kan följa order och service i Mitt konto på vår webbplats.',
      },
      {
        da: 'Besøg glsolargroup.dk eller skriv til os — vi glæder os til at høre fra dig.',
        en: 'Visit glsolargroup.dk or write to us — we look forward to hearing from you.',
        no: 'Besøk glsolargroup.dk eller skriv til oss — vi gleder oss til å høre fra deg.',
        se: 'Besök glsolargroup.dk eller skriv till oss — vi ser fram emot att höra från dig.',
      },
    ],
  },
};

function funnelSubject(step: FunnelStepKey, lang: Lang): string {
  return FUNNEL[step].subj[lang] ?? FUNNEL[step].subj.da;
}

function buildFunnelHTML(data: Record<string, unknown>, step: FunnelStepKey): string {
  const lang = getLang(data.lang);
  const meta = FUNNEL[step];
  const name = String(data.customerName ?? '').trim() || (lang === 'da' ? 'kunde' : 'customer');
  const paras = meta.paragraphs.map((p) =>
    `<p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.65">${p[lang] ?? p.da}</p>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:#0f172a;padding:24px 32px">
    <div style="font-size:18px;font-weight:900;color:#10b981">GREEN LIGHT SCANDINAVIA</div>
    <div style="font-size:10px;color:#6b7280;margin-top:3px">${COMPANY_NAME} · ${SALES_EMAIL}</div>
  </div>
  <div style="background:#f8fafc;border-bottom:3px solid ${meta.accent};padding:22px 32px">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:${meta.accent};margin-bottom:8px">${lang === 'da' ? 'E-mail serie' : lang === 'en' ? 'Email series' : lang === 'no' ? 'E-postserie' : 'E-postserie'}</div>
    <div style="font-size:22px;font-weight:900;color:#111827">${meta.headline[lang] ?? meta.headline.da}</div>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 16px;font-size:14px;color:#374151">${tr('greeting_cx', lang, { name })}</p>
    ${paras}
    <p style="margin:20px 0 0;font-size:12px;color:#6b7280;line-height:1.6">${tr('questions', lang)} <a href="mailto:${SALES_EMAIL}" style="color:#10b981;font-weight:700">${SALES_EMAIL}</a> ${tr('q_or', lang)} <a href="tel:+4561485219" style="color:#10b981;font-weight:700">+45 61 48 52 19</a>.</p>
    <div style="margin-top:24px;text-align:center">
      <a href="https://glsolargroup.dk/" style="display:inline-block;background:#0f172a;color:#10b981;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding:12px 28px;border-radius:10px;text-decoration:none;border:1px solid #10b981">
        glsolargroup.dk
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <div style="font-size:10px;color:#9ca3af">${COMPANY_NAME} · Katmosevej 16, 8800 Viborg, Denmark</div>
  </div>
</div></body></html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: getCorsHeaders(req) });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });
  }
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not set' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }

  try {
    const data = await req.json() as Record<string, unknown>;
    const lang = getLang(data.lang);
    const step = String(data.step ?? '') as FunnelStepKey;

    if (!FUNNEL_STEPS.includes(step)) {
      return new Response(
        JSON.stringify({ error: `Unknown step: ${data.step}. Use: ${FUNNEL_STEPS.join(', ')}` }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const to = String(data.customerEmail ?? '').trim();
    if (!to.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'customerEmail required' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    const html = buildFunnelHTML(data, step);
    const subject = funnelSubject(step, lang);

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to,
        subject,
        html,
        // Match send-email customer mails: reply_to sales (4th arg in send())
        reply_to: SALES_EMAIL,
      }),
    });

    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-funnel-email]', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

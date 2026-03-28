import { createMollieClient } from '@mollie/api-client';
import { createClient } from '@supabase/supabase-js';

const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY as string 
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.MOLLIE_API_KEY) {
    console.error('MOLLIE_API_KEY is not set');
    return res.status(503).json({ error: 'Card payment is not configured', message: 'MOLLIE_API_KEY missing' });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase admin env missing: SUPABASE_URL or VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY');
    return res.status(503).json({
      error: 'Card payment is not configured',
      message: 'Supabase service credentials missing for payment handler',
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { amount, orderId, customerEmail } = body;

    if (!amount || !orderId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    // 1. Створюємо платіж (використовуємо any для обходу помилок типізації SDK)
    const baseUrl = (process.env.SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.glsolargroup.dk')).replace(/\/$/, '');

    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: Number(amount).toFixed(2),
      },
      description: `Order #${orderId.slice(0, 8)}`,
      redirectUrl: `${baseUrl}/?view=success&id=${orderId}`,
      webhookUrl: `${baseUrl}/api/webhook`, 
      metadata: {
        orderId: orderId,
        customerEmail: customerEmail
      },
      // billingEmail використовується Mollie для попереднього заповнення форми
      billingEmail: customerEmail,
    }) as any;

    // 2. Оновлюємо замовлення в базі даних
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .update({ 
        mollie_id: payment.id,
        status: 'pending' 
      })
      .eq('id', orderId);

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error(
        `Failed to link Mollie ID to order: ${dbError.message}. Ensure orders.mollie_id column exists (see supabase_migration.sql).`,
      );
    }

    const checkoutUrl = (payment as any).getCheckoutUrl?.() ?? null;
    if (!checkoutUrl) {
      console.error('Mollie payment created but no checkout URL', payment?.id);
      return res.status(502).json({
        error: 'No checkout URL',
        message: 'Mollie did not return a checkout link for this payment.',
      });
    }

    return res.status(200).json({
      checkoutUrl,
      paymentId: payment.id,
    });

  } catch (error: any) {
    console.error('Mollie Payment Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}
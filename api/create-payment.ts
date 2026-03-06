import { createMollieClient } from '@mollie/api-client';
import { createClient } from '@supabase/supabase-js';

const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY as string 
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, orderId, customerEmail } = req.body;

    if (!amount || !orderId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    // 1. Створюємо платіж (використовуємо any для обходу помилок типізації SDK)
    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: Number(amount).toFixed(2),
      },
      description: `VoltStore Order #${orderId.slice(0, 8)}`,
      redirectUrl: `https://volt-store-ai.vercel.app/order-success?id=${orderId}`,
      webhookUrl: `https://volt-store-ai.vercel.app/api/webhook`, 
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
      throw new Error('Failed to link Mollie ID to order');
    }

    // 3. Повертаємо посилання на оплату
    return res.status(200).json({ 
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id 
    });

  } catch (error: any) {
    console.error('Mollie Payment Error:', error.message);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}
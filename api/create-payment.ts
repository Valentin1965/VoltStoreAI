import { createMollieClient } from '@mollie/api-client';
import { createClient } from '@supabase/supabase-js';

// Ініціалізація клієнтів
// Використовуйте змінні середовища для безпеки
const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY as string 
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string // Ключ з повними правами доступу
);

export default async function handler(req: any, res: any) {
  // Дозволяємо лише POST запити
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, orderId, customerEmail, customerName } = req.body;

    if (!amount || !orderId || !customerEmail) {
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    // 1. Створюємо платіж у Mollie
    const payment = await mollieClient.payments.create({
      amount: {
        currency: 'EUR', // Можна замінити на 'DKK' або іншу валюту з вашої таблиці
        value: amount.toFixed(2),
      },
      description: `VoltStore Order #${orderId}`,
      redirectUrl: `https://volt-store-ai.vercel.app/order-success?id=${orderId}`,
      webhookUrl: `https://volt-store-ai.vercel.app/api/webhook`, // Mollie сповістить цей URL про статус
      metadata: {
        orderId: orderId, // Передаємо ID, щоб впізнати замовлення у вебхуку
      },
      consumerEmail: customerEmail,
      billingEmail: customerEmail,
    });

    // 2. Оновлюємо замовлення в базі даних
    // Записуємо отриманий mollie_id у вашу таблицю orders
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .update({ 
        mollie_id: payment.id,
        status: 'pending' // Переконуємось, що статус правильний
      })
      .eq('id', orderId);

    if (dbError) {
      console.error('Database update error:', dbError);
      throw new Error('Failed to link Mollie ID to order');
    }

    // 3. Повертаємо посилання на оплату фронтенду
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
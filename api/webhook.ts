import { createMollieClient } from '@mollie/api-client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// 1. Ініціалізація клієнтів (використовуємо змінні середовища)
const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY as string 
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string // Ключ з повними правами
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  // Mollie надсилає ID платежу через POST запит у форматі x-www-form-urlencoded або JSON
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const paymentId = req.body.id;

    if (!paymentId) {
      console.error('Webhook received without payment ID');
      return res.status(400).send('Missing ID');
    }

    // 2. Отримуємо актуальний статус платежу від Mollie
    const payment = await mollieClient.payments.get(paymentId);
    const orderId = payment.metadata?.orderId;

    if (!orderId) {
      console.error(`Order ID not found in metadata for payment ${paymentId}`);
      return res.status(200).send('OK'); // Повертаємо 200, щоб Mollie не повторювала запит
    }

    // 3. Визначаємо новий статус замовлення
    let newStatus = 'pending';
    if (payment.isPaid() && !payment.hasRefunds() && !payment.hasChargebacks()) {
      newStatus = 'paid';
    } else if (payment.isCanceled()) {
      newStatus = 'cancelled';
    } else if (payment.isFailed()) {
      newStatus = 'failed';
    } else if (payment.isExpired()) {
      newStatus = 'expired';
    }

    // 4. Отримуємо дані замовлення з бази Supabase перед оновленням
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      console.error('Error fetching order:', fetchError);
      throw new Error('Order not found');
    }

    // 5. Оновлюємо статус у базі даних
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus,
        payment_method: `Mollie (${payment.method || 'online'})`
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // 6. Якщо оплата успішна — надсилаємо Email підтвердження
    if (newStatus === 'paid') {
      // Генеруємо рядки таблиці товарів з JSONB
      const itemsTableRows = order.items.map((item: any) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
            <strong style="color: #0f172a;">${item.name}</strong> <br />
            <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Кількість: ${item.quantity}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #0f172a; text-align: right; font-weight: bold;">
            ${(item.price * item.quantity).toFixed(2)} ${order.currency || 'EUR'}
          </td>
        </tr>
      `).join('');

      await resend.emails.send({
        from: 'VoltStore <orders@yourdomain.com>', // Замініть на свій домен у Resend
        to: [order.customer_email],
        subject: `Підтвердження замовлення #${order.id.slice(0, 8)}`,
        html: `
          <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; padding: 40px; border-radius: 24px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
              <span style="background-color: #f0fdf4; color: #16a34a; padding: 8px 16px; border-radius: 99px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
                Оплата успішна
              </span>
            </div>

            <h2 style="color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 8px; text-align: center; letter-spacing: -0.02em;">Дякуємо за замовлення!</h2>
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 40px; line-height: 1.6;">
              Вітаємо, ${order.customer_name}! Ми отримали вашу оплату. Ваше замовлення вже готується до відправки.
            </p>
            
            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 16px; border-bottom: 2px solid #f8fafc; padding-bottom: 8px;">Склад замовлення</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${itemsTableRows}
                <tr>
                  <td style="padding: 24px 0 0 0; font-size: 16px; font-weight: 900; color: #0f172a;">Разом</td>
                  <td style="padding: 24px 0 0 0; font-size: 20px; font-weight: 900; color: #10b981; text-align: right;">${Number(order.total_price).toFixed(2)} ${order.currency || 'EUR'}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #f8fafc; border-radius: 20px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
              <h4 style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 12px;">Адреса доставки</h4>
              <p style="margin: 0; font-size: 13px; color: #334155; font-weight: bold; line-height: 1.5;">
                ${order.city}<br />
                ${order.department}
              </p>
            </div>

            <div style="text-align: center; font-size: 10px; color: #cbd5e1; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 40px;">
              VoltStore — Ваша енергетична незалежність
            </div>
          </div>
        `
      });
      console.log(`Success email sent for order ${orderId}`);
    }

    return res.status(200).send('OK');

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    // Mollie очікує 200 OK навіть якщо щось пішло не так на вашому боці, 
    // щоб не спамити вебхуками, але ми повернемо 500 для логів Vercel.
    return res.status(500).send('Internal Server Error');
  }
}
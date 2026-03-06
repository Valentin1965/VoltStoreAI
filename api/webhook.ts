import { createMollieClient, PaymentStatus } from '@mollie/api-client';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY as string 
});

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const paymentId = req.body.id;

    if (!paymentId) {
      return res.status(400).send('Missing ID');
    }

    // 1. Отримуємо платіж (використовуємо await для Promise)
    const payment = await mollieClient.payments.get(paymentId);
    
    // Безпечне отримання orderId з метаданих
    const metadata = payment.metadata as any;
    const orderId = metadata?.orderId;

    if (!orderId) {
      console.error(`Metadata error for payment ${paymentId}`);
      return res.status(200).send('OK'); 
    }

    // 2. Визначаємо статус (виправляємо помилки TypeScript)
    let newStatus = 'pending';
    
    switch (payment.status) {
      case PaymentStatus.paid:
        newStatus = 'paid';
        break;
      case PaymentStatus.canceled:
        newStatus = 'cancelled';
        break;
      case PaymentStatus.failed:
        newStatus = 'failed';
        break;
      case PaymentStatus.expired:
        newStatus = 'expired';
        break;
      default:
        newStatus = 'pending';
    }

    // 3. Оновлення бази даних
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Order not found');

    await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus,
        payment_method: `Mollie (${payment.method || 'online'})`,
        mollie_id: paymentId // Зберігаємо ID для адмінки
      })
      .eq('id', orderId);

    // 4. Відправка Email при успішній оплаті
    if (newStatus === 'paid') {
      const itemsTableRows = order.items.map((item: any) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
            <strong style="color: #0f172a;">${item.name}</strong> <br />
            <span style="font-size: 11px; color: #94a3b8;">QTY: ${item.quantity}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">
            ${(item.price * item.quantity).toFixed(2)} ${order.currency || 'EUR'}
          </td>
        </tr>
      `).join('');

      await resend.emails.send({
        from: 'VoltStore <orders@voltstore.ai>', // Вкажіть ваш підтверджений домен
        to: [order.customer_email],
        subject: `Order Confirmed #${order.id.slice(0, 8)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border-radius: 24px; border: 1px solid #f1f5f9;">
            <div style="text-align: center; margin-bottom: 20px;">
              <span style="background: #f0fdf4; color: #16a34a; padding: 8px 16px; border-radius: 99px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                Payment Success
              </span>
            </div>
            <h2 style="text-align: center;">Order #${order.id.slice(0, 8)}</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemsTableRows}
              <tr>
                <td style="padding-top: 20px; font-weight: 900;">Total</td>
                <td style="padding-top: 20px; text-align: right; font-size: 20px; color: #10b981; font-weight: 900;">
                  ${Number(order.total_price).toFixed(2)} ${order.currency || 'EUR'}
                </td>
              </tr>
            </table>
          </div>
        `
      });
    }

    return res.status(200).send('OK');

  } catch (error: any) {
    console.error('Webhook processing failed:', error.message);
    return res.status(500).send('Internal Server Error');
  }
}
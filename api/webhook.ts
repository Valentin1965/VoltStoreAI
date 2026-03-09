import { Resend } from 'resend';
// Поки ми не працюємо з Mollie активно, імпорт залишаємо, 
// але пам'ятайте про необхідність перенесення в dependencies пізніше.
// import { createMollieClient } from '@mollie/api-client';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  // 1. Перевірка методу (Mollie та інші сервіси надсилають POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Тут буде ваша логіка обробки даних від Mollie
    // const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });
    // const payment = await mollieClient.payments.get(req.body.id);

    // 2. Відправка імейла через Resend (Email Order)
    // Використовуємо дані з тіла запиту (req.body)
    const { data, error } = await resend.emails.send({
      from: 'VoltStore <orders@glsolargroup.dk>', // Замініть на ваш підтверджений домен
      to: [req.body.customer_email || 'admin@glsolargroup.dk'],
      subject: `Order Confirmation #${req.body.orderNumber || 'New'}`,
      html: `
        <h1>Thank you for your order!</h1>
        <p>We have received your Email Order and are processing it.</p>
        <p>Order ID: ${req.body.id}</p>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      // Повертаємо 200, щоб платіжна система не зациклювала запити, 
      // але логуємо помилку відправки листа
      return res.status(200).json({ warning: 'Webhook received, but email failed', error });
    }

    return res.status(200).json({ success: true, message: 'Webhook processed and email sent', id: data?.id });

  } catch (err: any) {
    console.error('General Webhook Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
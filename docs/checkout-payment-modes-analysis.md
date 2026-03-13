# Аналіз режимів оплати в кошику (Checkout)

## Два режими в коді

| Режим | Код (state) | Що відбувається після створення замовлення в БД |
|-------|-------------|--------------------------------------------------|
| **Email Order** | `paymentMethod === 'Email Order'` | Викликається **Supabase Edge Function** `send-email` (Resend). Потім: повідомлення «Замовлення прийнято», очищення кошика, перехід на success. |
| **Credit Card (Mollie)** | `paymentMethod === 'Credit Card'` | Викликається **`POST /api/create-payment`** (Vercel serverless). Якщо у відповіді є `checkoutUrl` — браузер робить редирект на сторінку Mollie. Інакше — показується помилка. |

Обидва режими **не** використовують одне й те саме посилання. Це два різні шляхи в `CheckoutPage.tsx` (рядки 150 і 168).

---

## Чому може здаватися, що «обидва йдуть через Email Order»

1. **За замовчуванням обрано Email Order**  
   `useState<'Email Order' | 'Credit Card'>('Email Order')` — якщо не натиснути явно «Card payment (Mollie)», при сабміті завжди виконується гілка Email Order.

2. **Mollie не виконується на проді**  
   Якщо на домені (наприклад, glsolargroup.dk) маршрут `/api/create-payment` не існує або повертає 404/500:
   - при виборі Credit Card користувач отримує помилку типу «Unable to start card payment (status 404)»;
   - редиректу на Mollie не буде — здається, що «нічого не підключено».

3. **Візуально не помітно вибір**  
   Якщо не натиснути другу картку (Mollie), залишається обраним Email Order — тоді й після сабміту спрацьовує лише send-email (і можлива помилка `FUNCTION_INVOCATION_FAILED` через Resend).

---

## Що перевірити, щоб Mollie працювала

1. **Деплой API**  
   На хостингу (наприклад, Vercel) має бути зібрана/підключена папка `api/` (файл `api/create-payment.ts`), щоб `POST https://www.glsolargroup.dk/api/create-payment` реально виконувався.

2. **Змінні оточення на сервері**  
   Для `api/create-payment.ts`: `MOLLIE_API_KEY`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Без них функція може падати або повертати 500.

3. **Redirect і webhook після оплати**  
   У `api/create-payment.ts` зараз захардкоджені URL для іншого домену (`volt-store-ai.vercel.app`). Для glsolargroup.dk потрібно використовувати поточний домен (наприклад, через `SITE_URL` у Vercel env), щоб після оплати Mollie повертав клієнта на ваш сайт, а не на сторонній.

---

## Висновок

- **Email Order** і **Mollie** у коді розділені: перший — через Supabase `send-email`, другий — через `/api/create-payment` і редирект на Mollie.
- Якщо здається, що «обидва в одному посиланні», це через те, що за замовчуванням обрано Email Order і/або через те, що `/api/create-payment` на проді не відповідає (404/500), тому Mollie ніколи не відкривається.
- Щоб Mollie була справді підключена на glsolargroup.dk: потрібен робочий деплой `api/create-payment`, правильні env і коректні redirect/webhook URL для вашого домену.

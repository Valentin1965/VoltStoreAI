# Чек-лист: відправка повідомлень і зміна текстів

Короткий гайд для перевірки e-mail і того, **де саме** правити тексти.

---

## A. Передумови (один раз / після змін інфраструктури)

- [ ] У Supabase задано секрет **`RESEND_API_KEY`** (`supabase secrets set RESEND_API_KEY=…`).
- [ ] Задеплоєно **`send-email`**: `supabase functions deploy send-email`.
- [ ] (За потреби) **`RESEND_FROM`** — домен підтверджено в Resend; інакше можливий fallback-відправник.
- [ ] У проєкті на клієнті коректні **`VITE_SUPABASE_URL`** та **`VITE_SUPABASE_ANON_KEY`** (виклик `functions.invoke` з браузера).
- [ ] Для **шаблонів з адмінки** / імпорту повідомлень з замовлення виконано SQL: **`supabase/sql_message_correspondence.sql`** (або відповідний блок у **`supabase_migration.sql`**).
- [ ] У **`app_config`** є **`admin_key`** = значенню **`VITE_ADMIN_PASSWORD`** (як для інших адмін-RPC).

---

## B. Перевірка відправки (по сценаріях)

### B1. Замовлення з чекауту (транзакційний лист)

- [ ] Оформити тестове замовлення з реальною поштою (режим **Email order** / після збереження order).
- [ ] У DevTools → **Network** знайти виклик **`send-email`**, тіло з `type: "order"`.
- [ ] Лист клієнту та нотифікація на **sales@** (логіка в edge-функції).
- [ ] Якщо помилка: відповідь тіла (Resend 4xx), наявність ключа, ліміти Resend.

### B2. Зміна статусу замовлення в адмінці

- [ ] Відкрити замовлення → змінити статус → **Gem status**.
- [ ] Перевірити виклик **`send-email`** з `type: "status"`.
- [ ] Текст листа відповідає новому статусу та мові **`order.lang`** (якщо зберігається в order).

### B3. Лист з шаблону (адмінка → Messages + модалка замовлення)

- [ ] Вкладка **Messages**: шаблони завантажуються без помилки RPC.
- [ ] У модалці замовлення блок **Correspondence**: вибір шаблону, мова клієнта, прев’ю, **Send email**.
- [ ] У Network: **`send-email`** з `type: "custom"`.
- [ ] У БД з’являється рядок у **`correspondence_messages`** (журнал).

#### B3a. Логи Edge для `type: "custom"` (чи викликається Resend)

У **Supabase Dashboard** → **Edge Functions** → **send-email** → **Logs** (або **Logs Explorer** з фільтром по функції) після натискання **Send email** мають з’явитися рядки в такому порядку:

1. `[send-email] type=custom: payload received (will validate then call Resend if ok)` — запит типу `custom` дійшов до функції.
2. `[send-email] type=custom: invoking external Resend (POST https://api.resend.com/emails)` + JSON з `recipientDomain`, `subjectLength`, `htmlByteLength`, `fromLabel` — **зовнішній виклик до Resend виконується**.
3. `[send-email] type=custom: Resend API accepted message` + JSON з `resendEmailId` — Resend **прийняв** лист (HTTP 200 і id від провайдера).

Якщо є крок 1, але **немає** кроку 2 — валідація не пройшла (`Missing customerEmail` / `Missing subject`) або викид до `fetch`. Якщо є крок 2, але **помилка** `Resend HTTP error` — відхилення на боці Resend (ключ, домен `from`, тіло листа тощо); текст відповіді в логах.

**Після кроку 3** Edge-функція **не керує** доставкою в «Вхідні» vs **Спам**: це вже поштові сервери одержувача, SPF/DKIM/DMARC для вашого домену відправника, репутація IP Resend, вміст листа. Перевірте: **Resend Dashboard** → **Emails** (статус доставки), підтверджений домен для **`RESEND_FROM`**, тестову скриньку без агресивних фільтрів.

### B4. Маркетингова воронка (якщо використовується)

- [ ] Окремо: **`send-funnel-email`**, секрети ті самі що для Resend — див. **`docs/MARKETING_FUNNEL.md`**.

### B5. Діагностика без Resend

- [ ] `POST` на **`send-email`** з тілом `{ "type": "_health" }` — у відповіді `resendKeyConfigured: true/false`.

---

## C. Де змінювати тексти

| Що саме | Де правити | Після змін |
|--------|------------|------------|
| Стандартні листи **order** / **status** (теми, таблиці, футер, багатомовність `TR`) | **`supabase/functions/send-email/index.ts`** | `supabase functions deploy send-email` |
| Кастомний лист з адмінки (обгортка, «Har du spørgsmål…») | Там само — функція **`buildCustomEmailHTML`** + блок **`type === 'custom'`** | Deploy **`send-email`** |
| Шаблони **переписки** (4 мови, `{{customerName}}`, …) | Адмінка → вкладка **Messages**, або таблиця **`message_templates`** в SQL/редакторі БД | Без deploy edge — лише збереження в БД |
| Тексти кнопок / підказок адмінки (не листи) | **`src/utils/translations.ts`** | Звичайний деплой фронту |

---

## D. Швидка діагностика проблем

- [ ] **FUNCTION_INVOCATION_FAILED** / 5xx — логи функції в Supabase Dashboard → Edge Functions → **send-email** → Logs.
- [ ] **CORS** — origin сайту в списку **`BASE_ORIGINS`** / **`CORS_EXTRA_ORIGINS`** у **`send-email/index.ts`**.
- [ ] Лист не приходить, але API **200** — папка Спам, неправильний **`to`**, або Resend прийняв, але домен отримувача відхиляє.
- [ ] Шаблони в адмінці порожні — не застосовано **`sql_message_correspondence.sql`** або помилка **`admin_key`**.

---

## E. Мінімальний порядок після редагування коду edge

1. Зберегти зміни в **`supabase/functions/send-email/index.ts`**.  
2. `supabase functions deploy send-email`.  
3. Повторити пункт **B1** або **B3** з тестовою поштою.

Якщо змінювали лише **`message_templates`** у БД або через UI адмінки — **deploy edge не потрібен**.

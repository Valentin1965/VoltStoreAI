# Аналіз взаємодії сайту з БД (Supabase)

Мета: уникнути помилок типу `null value in column "X" violates not-null constraint` та узгодити дані форми з колонками таблиць.

---

## 1. Таблиця `orders`

**Де записується:** `CheckoutPage.tsx` — `supabase.from('orders').insert([orderData])`.

**Обов'язкові поля (NOT NULL у БД):**
- `department` — передається як `'Online'` для замовлень з сайту.

**Рекомендований payload при створенні замовлення:**
- `client_id`, `customer_name`, `customer_email`, `customer_phone`, `client_type`, `company_name`, `vat_number`
- Адреса: `country`, `city`, `street`, `house_number`, `postal_code`
- Доставка: `delivery_same_as_billing`, `delivery_street`, `delivery_city`, `delivery_country`, `delivery_postal_code`, `delivery_house_number`, `delivery_phone`
- Сума та оплата: `total_price`, `currency`, `payment_method`, `items`, `customer_message`, `status`, `lang`, `department`

Якщо в БД з’являться нові NOT NULL колонки без DEFAULT — їх потрібно додати в `orderData` у `CheckoutPage.tsx`.

---

## 2. Таблиця `clients`

**Де записується:** тільки через RPC `register_client` у `UserContext.tsx`. Прямих `insert` у `clients` з клієнтського коду немає.

**Обов'язкові поля (з міграції):** `email`, `client_type`, `first_name`, `last_name`. Решта опційні або мають DEFAULT.

Передавати всі параметри в `register_client` згідно з `RegisterData`.

---

## 3. Таблиця `bookings`

**Де записується:** `WishlistContext.tsx` — `insert`, `update` (status).

Переконатися, що payload при створенні броні відповідає схемі таблиці (усі NOT NULL поля заповнені).

---

## 4. Admin: продукти, зображення, курси

- **Products:** `ProductsContext.tsx` — `insert`/`update` по таблиці з адмінки; `AdminProductModal.tsx` — оновлення/створення продукту.
- **Storage:** `AdminProductModal.tsx` — `supabase.storage.from('product-assets').upload(...)`.
- **Курси валют:** `LanguageContext.tsx` / адмін — RPC `admin_update_rates`; читання — RPC `get_exchange_rates`.

Потрібно, щоб payload для продуктів містив усі обов’язкові колонки таблиці продуктів.

---

## 5. Читання даних

- **orders:** `OrderSuccessPage.tsx`, `orderService.getOrdersByEmail` — `select`.
- **clients:** через RPC `get_client_by_id`, `login_client_by_email`, `admin_get_clients` (з admin_key).
- **bookings:** `WishlistContext`, `AdminPanel` — `select`.

---

## 6. Що зроблено для запобігання помилкам

1. **orders.department:** у `CheckoutPage` при insert передається `department: 'Online'`, щоб не порушувати NOT NULL.
2. **Повнота адреси доставки:** у `orderData` додано `delivery_country`, `delivery_postal_code`, `delivery_house_number`, `delivery_phone` для узгодженості з колонками БД.
3. **Лейбли форми чекауту:** додано переклади ключів `checkout_placeholder_*`, `checkout_billing_title`, `checkout_payment_title`, `checkout_summary_title`, `checkout_place_order_btn`, щоб у полях вводу відображалися людські назви, а не ключі/назви колонок БД.

При додаванні нових NOT NULL колонок у `orders` або зміні RPC варто оновити цей документ і відповідний код.

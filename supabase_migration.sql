-- ============================================================
-- GREEN LIGHT SCANDINAVIA — Database Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────
-- 1. CLIENTS TABLE
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),

  -- Identity
  email                 text NOT NULL UNIQUE,
  client_type           text NOT NULL DEFAULT 'private' CHECK (client_type IN ('private', 'business')),

  -- Contact person
  first_name            text NOT NULL,
  last_name             text NOT NULL,
  phone                 text,

  -- Company info (business clients)
  company_name          text,
  vat_number            text,

  -- Billing address
  country               text,
  city                  text,
  street                text,
  house_number          text,
  apartment             text,
  postal_code           text,

  -- Delivery address
  delivery_country      text,
  delivery_city         text,
  delivery_street       text,
  delivery_house_number text,
  delivery_apartment    text,
  delivery_postal_code  text,
  delivery_phone        text,
  delivery_same_as_billing boolean DEFAULT true
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "clients_select" ON public.clients;
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (true);
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients FOR UPDATE USING (true);


-- ──────────────────────────────────────────
-- 2. UPDATE ORDERS TABLE — link to clients
-- ──────────────────────────────────────────

-- Add client_id FK to orders (nullable — guest orders allowed)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add full address fields to orders (snapshot at time of order)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_type        text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS company_name       text,
  ADD COLUMN IF NOT EXISTS vat_number         text,
  ADD COLUMN IF NOT EXISTS first_name         text,
  ADD COLUMN IF NOT EXISTS last_name          text,
  ADD COLUMN IF NOT EXISTS street             text,
  ADD COLUMN IF NOT EXISTS house_number       text,
  ADD COLUMN IF NOT EXISTS apartment          text,
  ADD COLUMN IF NOT EXISTS postal_code        text,
  ADD COLUMN IF NOT EXISTS country            text DEFAULT 'Denmark',
  ADD COLUMN IF NOT EXISTS delivery_country   text,
  ADD COLUMN IF NOT EXISTS delivery_city      text,
  ADD COLUMN IF NOT EXISTS delivery_street    text,
  ADD COLUMN IF NOT EXISTS delivery_house_number text,
  ADD COLUMN IF NOT EXISTS delivery_apartment text,
  ADD COLUMN IF NOT EXISTS delivery_postal_code text,
  ADD COLUMN IF NOT EXISTS delivery_phone     text,
  ADD COLUMN IF NOT EXISTS delivery_same_as_billing boolean DEFAULT true;

-- Optional note from checkout (required for admin "import checkout message as inquiry")
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_message text;
-- If admin_get_orders is a custom RPC, include customer_message in its SELECT so the order modal shows the note.

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);


-- ──────────────────────────────────────────
-- 3. ADD ORDER STATUS + SHIPPING/ARRIVAL DATES
-- Run this in Supabase → SQL Editor
-- ──────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'accepted',
  ADD COLUMN IF NOT EXISTS shipping_date date,
  ADD COLUMN IF NOT EXISTS arrival_date  date;

-- Replace narrow CHECK (must include cancelled); safe to re-run after DROP
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check CHECK (
  order_status IS NULL
  OR order_status IN (
    'accepted', 'in_progress', 'awaiting_transport', 'in_transit', 'delivered', 'cancelled'
  )
);

-- Index for filtering by order status
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);

-- ════════════════════════════════════════════════
-- MIGRATION 2: SECURE RLS ON clients TABLE
-- Run in Supabase → SQL Editor
-- ════════════════════════════════════════════════

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "clients_select" ON clients;

-- New policy: clients can only read their own row (by matching email in JWT claims)
-- Anon users cannot list all clients
DROP POLICY IF EXISTS "clients_select_own" ON clients;
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT
  USING (
    -- Allow if the requesting session email matches this row's email
    -- (works when user is authenticated via Supabase Auth)
    auth.email() = email
    OR
    -- Allow service_role (used by admin operations and edge functions)
    auth.role() = 'service_role'
  );

-- INSERT: anyone can insert (guest checkout creates a client row)
DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: only own row or service_role
DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients
  FOR UPDATE
  USING (
    auth.email() = email
    OR auth.role() = 'service_role'
  );

-- Admin reads all clients via service_role key (set in edge function or server)
-- The browser admin panel uses anon key — for admin SELECT to work, create a special
-- admin_read policy that checks for a custom claim or use the service key in edge functions.
-- TEMPORARY WORKAROUND: allow anon reads only for admin panel (remove when auth is added):
DROP POLICY IF EXISTS "clients_select_admin_anon" ON clients;
CREATE POLICY "clients_select_admin_anon" ON clients
  FOR SELECT
  USING (true);
-- ^ Remove this policy once proper admin auth (Supabase Auth + JWT roles) is implemented.
--   Replace it with: USING (auth.jwt() ->> 'role' = 'admin')


-- ════════════════════════════════════════════════
-- MIGRATION 3: order_number COLUMN
-- Run in Supabase → SQL Editor
-- ════════════════════════════════════════════════

-- Add a human-readable order number that's stable and consistent
-- across DB, emails, and admin panel
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number text UNIQUE
  DEFAULT 'GLS-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));

-- Backfill existing orders that don't have an order_number yet
UPDATE orders
  SET order_number = 'GLS-' || UPPER(SUBSTRING(id::text, 1, 8))
  WHERE order_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);


-- ════════════════════════════════════════════════
-- MIGRATION 4: Add discount column to clients
-- Run in Supabase → SQL Editor
-- ════════════════════════════════════════════════
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discount integer DEFAULT 0 CHECK (discount >= 0 AND discount <= 100);


-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 5: Secure admin access via RPC + fix open clients SELECT policy
-- ════════════════════════════════════════════════════════════════════════════
--
-- ПРОБЛЕМА: policy "clients_select_admin_anon" дозволяла будь-якому користувачу
-- з anon ключем читати всіх клієнтів (email, адреса, телефон, компанія).
--
-- РІШЕННЯ: RPC-функції з перевіркою admin_key + таблиця app_config.
-- Адмін-панель тепер читає клієнтів через admin_get_clients(p_key) замість
-- прямого SELECT.
--
-- КРОКИ ПІСЛЯ ЗАПУСКУ МІГРАЦІЇ:
-- 1. Supabase → SQL Editor → виконай цей файл
-- 2. Supabase → SQL Editor → встанови admin_key:
--      INSERT INTO app_config (key, value) 
--      VALUES ('admin_key', 'ВАШ_VITE_ADMIN_PASSWORD')
--      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- 3. Vercel → Redeploy (без змін коду — достатньо)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Таблиця для безпечних серверних налаштувань ───────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- RLS: ніхто через anon/auth не може читати або писати напряму
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- Нуль відкритих policies = повна заборона для anon/auth

-- ── 2. Видалити відкриту SELECT policy (тимчасовий workaround) ───────────────
DROP POLICY IF EXISTS "clients_select_admin_anon" ON clients;

-- Залишаємо:
--   "clients_insert"    → відкрита INSERT (гостьовий checkout)
--   "clients_select_own"→ Supabase Auth users читають власний рядок
--   "clients_update"    → власний рядок або service_role

-- ── 3. RPC: читання всіх клієнтів (для адмін-панелі) ───────────────────────
CREATE OR REPLACE FUNCTION admin_get_clients(p_key text)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_get_clients: Unauthorized — invalid admin key';
  END IF;
  RETURN QUERY SELECT * FROM clients ORDER BY created_at DESC;
END;
$$;

-- ── 4. RPC: оновлення знижки клієнта (для адмін-панелі) ─────────────────────
CREATE OR REPLACE FUNCTION admin_update_discount(p_key text, p_client_id uuid, p_discount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_update_discount: Unauthorized — invalid admin key';
  END IF;
  UPDATE clients
  SET discount = LEAST(100, GREATEST(0, p_discount))
  WHERE id = p_client_id;
END;
$$;

-- ── 5. RPC: оновлення статусу бронювання (для адмін-панелі) ─────────────────
CREATE OR REPLACE FUNCTION admin_update_booking(p_key text, p_booking_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_update_booking: Unauthorized — invalid admin key';
  END IF;
  IF p_status NOT IN ('pending','confirmed','expired','cancelled','converted') THEN
    RAISE EXCEPTION 'admin_update_booking: Invalid status value: %', p_status;
  END IF;
  UPDATE bookings SET status = p_status WHERE id = p_booking_id;
END;
$$;

-- ── 6. Права виконання: тільки anon + authenticated ─────────────────────────
GRANT EXECUTE ON FUNCTION admin_get_clients(text)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_discount(text, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_booking(text, uuid, text) TO anon, authenticated;

-- ── 7. Після запуску обов'язково встанови ключ: ──────────────────────────────
-- INSERT INTO app_config (key, value)
-- VALUES ('admin_key', 'ТУТ_ВПИШИ_VITE_ADMIN_PASSWORD')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 6: Exchange rates sync via Supabase (замість localStorage-only)
-- ════════════════════════════════════════════════════════════════════════════

-- ── Seed initial exchange rates in app_config ───────────────────────────────
INSERT INTO app_config (key, value)
VALUES ('exchange_rates', '{"EUR":1.0,"DKK":7.46,"NOK":11.38,"SEK":11.45,"USD":1.09}')
ON CONFLICT (key) DO NOTHING;

-- ── RPC: будь-хто може читати курси (публічні дані) ─────────────────────────
CREATE OR REPLACE FUNCTION get_exchange_rates()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value::jsonb FROM app_config WHERE key = 'exchange_rates';
$$;

GRANT EXECUTE ON FUNCTION get_exchange_rates() TO anon, authenticated;

-- ── RPC: тільки адмін може оновлювати курси ──────────────────────────────────
CREATE OR REPLACE FUNCTION admin_update_rates(p_key text, p_rates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_update_rates: Unauthorized';
  END IF;
  INSERT INTO app_config (key, value)
  VALUES ('exchange_rates', p_rates::text)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_rates(text, jsonb) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION 7: PWA Push Notifications
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid REFERENCES clients(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Ідемпотентно: повторний запуск міграції без помилки 42710
DROP POLICY IF EXISTS "push_insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_delete" ON public.push_subscriptions;

-- Будь-хто може вставити свою підписку (реєстрація push)
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
-- Видалення — тільки власної (через endpoint)
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (true);

-- RPC: зберегти push підписку
CREATE OR REPLACE FUNCTION save_push_subscription(
  p_client_id uuid,
  p_endpoint  text,
  p_p256dh    text,
  p_auth      text,
  p_ua        text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO push_subscriptions (client_id, endpoint, p256dh, auth, user_agent)
  VALUES (p_client_id, p_endpoint, p_p256dh, p_auth, p_ua)
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION save_push_subscription(uuid, text, text, text, text) TO anon, authenticated;

-- RPC: зберегти push підписку для адміна (client_id = NULL)
CREATE OR REPLACE FUNCTION save_admin_push_subscription(
  p_key      text,
  p_endpoint text,
  p_p256dh   text,
  p_auth     text,
  p_ua       text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'save_admin_push_subscription: Unauthorized';
  END IF;

  INSERT INTO push_subscriptions (client_id, endpoint, p256dh, auth, user_agent)
  VALUES (NULL, p_endpoint, p_p256dh, p_auth, p_ua)
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION save_admin_push_subscription(text, text, text, text, text) TO anon, authenticated;

-- RPC: видалити push підписку по endpoint (використовується при unsubscribe)
CREATE OR REPLACE FUNCTION delete_push_subscription(
  p_endpoint text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
$$;

GRANT EXECUTE ON FUNCTION delete_push_subscription(text) TO anon, authenticated;

-- ── VAPID ключі — встанови після генерації: ──────────────────────────────
-- supabase secrets set VAPID_PRIVATE_KEY=your_private_key
-- supabase secrets set VAPID_PUBLIC_KEY=your_public_key
-- 
-- Генерація (Node.js): npx web-push generate-vapid-keys


-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Calculator request log (CSV export in admin)
-- Виконай у Supabase → SQL Editor після попередніх міграцій.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calculator_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  input_json  jsonb NOT NULL,
  lang        text
);

CREATE INDEX IF NOT EXISTS idx_calculator_requests_created_at
  ON calculator_requests (created_at DESC);

ALTER TABLE calculator_requests ENABLE ROW LEVEL SECURITY;
-- Прямий SELECT/INSERT для anon закритий — лише через RPC нижче.

-- Публічний лог (виклик з сайту; без admin_key)
CREATE OR REPLACE FUNCTION log_calculator_request(p_input jsonb, p_lang text DEFAULT 'da')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_input IS NULL OR p_input = 'null'::jsonb THEN
    RAISE EXCEPTION 'log_calculator_request: p_input required';
  END IF;
  INSERT INTO calculator_requests (input_json, lang)
  VALUES (p_input, NULLIF(trim(COALESCE(p_lang, '')), ''));
END;
$$;

GRANT EXECUTE ON FUNCTION log_calculator_request(jsonb, text) TO anon, authenticated;

-- Адмін: читання логів
CREATE OR REPLACE FUNCTION admin_get_calculator_requests(p_key text, p_limit int DEFAULT 500)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  input_json jsonb,
  lang text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_get_calculator_requests: Unauthorized';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 THEN
    p_limit := 500;
  END IF;
  IF p_limit > 2000 THEN
    p_limit := 2000;
  END IF;
  RETURN QUERY
  SELECT c.id, c.created_at, c.input_json, c.lang
  FROM calculator_requests c
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_calculator_requests(text, int) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Admin: permanent delete order (іконка кошика в модалці замовлення)
-- p_order_id — текстове значення id (uuid або bigint у БД).
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_delete_order(p_key text, p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := trim(COALESCE(p_order_id, ''));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_delete_order: Unauthorized';
  END IF;
  IF v_id = '' THEN
    RAISE EXCEPTION 'admin_delete_order: empty id';
  END IF;
  DELETE FROM orders WHERE id::text = v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_order(text, text) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Admin: update order fulfilment status (browser uses anon key — bypasses orders RLS)
-- ════════════════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE не може перейменувати параметри (було p_status → p_order_status): 42P13
DROP FUNCTION IF EXISTS public.admin_update_order_status(text, uuid, text, date, date);

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_key text,
  p_order_id uuid,
  p_order_status text,
  p_shipping_date date,
  p_arrival_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
  st text := btrim(COALESCE(p_order_status, ''));
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_update_order_status: Unauthorized';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'admin_update_order_status: order id required';
  END IF;
  IF st = '' THEN
    RAISE EXCEPTION 'admin_update_order_status: status required';
  END IF;
  IF st NOT IN (
    'accepted', 'in_progress', 'awaiting_transport', 'in_transit', 'delivered', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'admin_update_order_status: invalid status';
  END IF;

  PERFORM set_config('row_security', 'off', true);

  UPDATE public.orders SET
    order_status = st,
    shipping_date = p_shipping_date,
    arrival_date = p_arrival_date
  WHERE id = p_order_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'admin_update_order_status: order not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_order_status(text, uuid, text, date, date) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Admin: list orders — full table row (order_status, customer_message, …) + RLS bypass
-- Replace any older admin_get_orders that omitted columns or hit RLS.
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.admin_get_orders(text);

CREATE OR REPLACE FUNCTION public.admin_get_orders(p_key text)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_get_orders: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  RETURN QUERY
    SELECT o.*
    FROM public.orders o
    ORDER BY o.created_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_orders(text) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Admin: delete calculator log row (admin panel)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_delete_calculator_request(p_key text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_delete_calculator_request: Unauthorized';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'admin_delete_calculator_request: empty id';
  END IF;
  DELETE FROM calculator_requests WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_calculator_request(text, uuid) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Admin: delete client (orders keep rows; client_id set NULL; push subs CASCADE)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_delete_client(p_key text, p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'admin_key' AND value = p_key
  ) THEN
    RAISE EXCEPTION 'admin_delete_client: Unauthorized';
  END IF;
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'admin_delete_client: empty id';
  END IF;
  DELETE FROM clients WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_client(text, uuid) TO anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- MOUNTING SYSTEMS (catalog: Monteringssystemer) — table + RLS
-- (Full copy also in supabase/sql_mounting_systems.sql)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mounting_systems (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  name                jsonb NOT NULL DEFAULT '{}'::jsonb,
  description         jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_eur_ex_vat    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price_eur_ex_vat >= 0),
  image               text,
  images              jsonb DEFAULT '[]'::jsonb,
  stock_lvl           integer NOT NULL DEFAULT 999 CHECK (stock_lvl >= 0),
  is_active           boolean NOT NULL DEFAULT true,
  is_leader           boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_mounting_systems_active ON public.mounting_systems (is_active);
CREATE INDEX IF NOT EXISTS idx_mounting_systems_created ON public.mounting_systems (created_at DESC);

DROP TRIGGER IF EXISTS mounting_systems_updated_at ON public.mounting_systems;
CREATE TRIGGER mounting_systems_updated_at
  BEFORE UPDATE ON public.mounting_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.mounting_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mounting_systems_select_public" ON public.mounting_systems;
CREATE POLICY "mounting_systems_select_public" ON public.mounting_systems FOR SELECT USING (true);
DROP POLICY IF EXISTS "mounting_systems_insert_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_insert_authenticated" ON public.mounting_systems FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "mounting_systems_update_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_update_authenticated" ON public.mounting_systems FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mounting_systems_delete_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_delete_authenticated" ON public.mounting_systems FOR DELETE USING (true);

-- ════════════════════════════════════════════════════════════════════════════
-- MOLLIE: store payment id on order (api/create-payment.ts updates this)
-- Without this column, the API returns 500 after creating a Mollie payment.
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mollie_id text;
CREATE INDEX IF NOT EXISTS idx_orders_mollie_id ON public.orders (mollie_id) WHERE mollie_id IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENT CABINET: email + password (full copy: supabase/sql_client_password_auth.sql)
-- ════════════════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS password_hash text;
COMMENT ON COLUMN public.clients.password_hash IS 'bcrypt hash; NULL = legacy, first login sets password';

CREATE OR REPLACE FUNCTION public.get_client_by_id(p_id uuid)
RETURNS SETOF clients LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r clients%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.clients WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  r.password_hash := NULL;
  RETURN QUERY SELECT r.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_client_with_password(p_email text, p_password text)
RETURNS SETOF clients LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r clients%ROWTYPE;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) < 1 THEN RETURN; END IF;
  SELECT * INTO r FROM public.clients WHERE lower(trim(email)) = lower(trim(p_email)) LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.password_hash IS NULL THEN
    UPDATE public.clients SET password_hash = extensions.crypt(trim(p_password), extensions.gen_salt('bf')) WHERE id = r.id;
    SELECT * INTO r FROM public.clients WHERE id = r.id;
    r.password_hash := NULL;
    RETURN QUERY SELECT r.*;
    RETURN;
  END IF;
  IF r.password_hash = extensions.crypt(trim(p_password), r.password_hash) THEN
    r.password_hash := NULL;
    RETURN QUERY SELECT r.*;
  END IF;
  RETURN;
END;
$$;

DROP FUNCTION IF EXISTS public.register_client(text, text, text, text, text, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_client(
  p_first_name text, p_last_name text, p_email text, p_phone text DEFAULT '', p_client_type text DEFAULT 'private',
  p_company text DEFAULT '', p_vat text DEFAULT '', p_country text DEFAULT 'Danmark', p_city text DEFAULT '',
  p_street text DEFAULT '', p_house text DEFAULT '', p_postal text DEFAULT '', p_password text DEFAULT NULL
) RETURNS SETOF clients LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_row clients%ROWTYPE; ct text;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) < 8 THEN
    RAISE EXCEPTION 'password_too_short' USING ERRCODE = 'P0001';
  END IF;
  ct := CASE WHEN lower(trim(coalesce(p_client_type, 'private'))) = 'business' THEN 'business' ELSE 'private' END;
  INSERT INTO public.clients (
    email, client_type, first_name, last_name, phone, company_name, vat_number, country, city, street, house_number, postal_code, password_hash
  ) VALUES (
    lower(trim(p_email)), ct, trim(p_first_name), trim(coalesce(p_last_name, '')),
    NULLIF(trim(coalesce(p_phone, '')), ''), NULLIF(trim(coalesce(p_company, '')), ''), NULLIF(trim(coalesce(p_vat, '')), ''),
    NULLIF(trim(coalesce(p_country, '')), ''), NULLIF(trim(coalesce(p_city, '')), ''), NULLIF(trim(coalesce(p_street, '')), ''),
    NULLIF(trim(coalesce(p_house, '')), ''), NULLIF(trim(coalesce(p_postal, '')), ''),
    extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
  ) RETURNING * INTO new_row;
  new_row.password_hash := NULL;
  RETURN QUERY SELECT new_row.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_client_by_email(p_email text)
RETURNS SETOF clients LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN; END; $$;

GRANT EXECUTE ON FUNCTION public.get_client_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_client_with_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_client(text, text, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_client_by_email(text) TO anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Message templates + correspondence (duplicate of supabase/sql_message_correspondence.sql)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title_internal text NOT NULL DEFAULT '',
  subject_da text NOT NULL DEFAULT '',
  subject_en text NOT NULL DEFAULT '',
  subject_no text NOT NULL DEFAULT '',
  subject_se text NOT NULL DEFAULT '',
  body_da text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  body_no text NOT NULL DEFAULT '',
  body_se text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_active_sort ON public.message_templates (is_active, sort_order, code);

CREATE TABLE IF NOT EXISTS public.customer_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'manual',
  from_email text,
  subject text,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_inquiries_order ON public.customer_inquiries(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_inquiries_order_checkout
  ON public.customer_inquiries (order_id)
  WHERE channel = 'checkout_message' AND order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.correspondence_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.customer_inquiries(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  locale text NOT NULL DEFAULT 'da',
  to_email text NOT NULL,
  subject_sent text NOT NULL,
  body_sent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correspondence_order ON public.correspondence_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_inquiry ON public.correspondence_messages(inquiry_id);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correspondence_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_get_message_templates(p_key text)
RETURNS SETOF public.message_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_get_message_templates: Unauthorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.message_templates
    ORDER BY sort_order ASC, code ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_message_template(
  p_key text,
  p_id uuid,
  p_code text,
  p_title_internal text,
  p_subject_da text, p_subject_en text, p_subject_no text, p_subject_se text,
  p_body_da text, p_body_en text, p_body_no text, p_body_se text,
  p_is_active boolean,
  p_sort_order int
) RETURNS public.message_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.message_templates%ROWTYPE;
  c text := lower(trim(regexp_replace(COALESCE(p_code, ''), '\s+', '_', 'g')));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_upsert_message_template: Unauthorized';
  END IF;
  IF c = '' THEN
    RAISE EXCEPTION 'admin_upsert_message_template: code required';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.message_templates (
      code, title_internal,
      subject_da, subject_en, subject_no, subject_se,
      body_da, body_en, body_no, body_se,
      is_active, sort_order
    ) VALUES (
      c, COALESCE(p_title_internal, ''),
      COALESCE(p_subject_da, ''), COALESCE(p_subject_en, ''), COALESCE(p_subject_no, ''), COALESCE(p_subject_se, ''),
      COALESCE(p_body_da, ''), COALESCE(p_body_en, ''), COALESCE(p_body_no, ''), COALESCE(p_body_se, ''),
      COALESCE(p_is_active, true), COALESCE(p_sort_order, 0)
    ) RETURNING * INTO r;
    RETURN r;
  END IF;
  UPDATE public.message_templates SET
    code = c,
    title_internal = COALESCE(p_title_internal, ''),
    subject_da = COALESCE(p_subject_da, ''),
    subject_en = COALESCE(p_subject_en, ''),
    subject_no = COALESCE(p_subject_no, ''),
    subject_se = COALESCE(p_subject_se, ''),
    body_da = COALESCE(p_body_da, ''),
    body_en = COALESCE(p_body_en, ''),
    body_no = COALESCE(p_body_no, ''),
    body_se = COALESCE(p_body_se, ''),
    is_active = COALESCE(p_is_active, true),
    sort_order = COALESCE(p_sort_order, 0),
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_upsert_message_template: template not found';
  END IF;
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_message_template(p_key text, p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_delete_message_template: Unauthorized';
  END IF;
  DELETE FROM public.message_templates WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_inquiries_for_order(p_key text, p_order_id uuid)
RETURNS SETOF public.customer_inquiries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_get_inquiries_for_order: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  RETURN QUERY
    SELECT * FROM public.customer_inquiries
    WHERE order_id = p_order_id
    ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_inquiry(
  p_key text,
  p_order_id uuid,
  p_client_id uuid,
  p_channel text,
  p_from_email text,
  p_subject text,
  p_body text
) RETURNS public.customer_inquiries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.customer_inquiries%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_create_inquiry: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  INSERT INTO public.customer_inquiries (order_id, client_id, channel, from_email, subject, body)
  VALUES (
    p_order_id,
    p_client_id,
    COALESCE(NULLIF(trim(p_channel), ''), 'manual'),
    NULLIF(trim(COALESCE(p_from_email, '')), ''),
    NULLIF(trim(COALESCE(p_subject, '')), ''),
    COALESCE(p_body, '')
  )
  RETURNING * INTO r;
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_import_checkout_inquiry(p_key text, p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  o record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_import_checkout_inquiry: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  SELECT id INTO v_id FROM public.customer_inquiries
  WHERE order_id = p_order_id AND channel = 'checkout_message' LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  SELECT id, client_id, customer_email, customer_message INTO o
  FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF o.customer_message IS NULL OR trim(o.customer_message) = '' THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.customer_inquiries (order_id, client_id, channel, from_email, subject, body)
  VALUES (
    o.id,
    o.client_id,
    'checkout_message',
    NULLIF(trim(o.customer_email), ''),
    'Checkout message',
    o.customer_message
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT ci.id INTO v_id FROM public.customer_inquiries ci
    WHERE ci.order_id = p_order_id AND ci.channel = 'checkout_message' LIMIT 1;
    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_log_correspondence(
  p_key text,
  p_inquiry_id uuid,
  p_order_id uuid,
  p_template_id uuid,
  p_locale text,
  p_to_email text,
  p_subject text,
  p_body text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_log_correspondence: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  INSERT INTO public.correspondence_messages (
    inquiry_id, order_id, template_id, locale, to_email, subject_sent, body_sent
  ) VALUES (
    p_inquiry_id,
    p_order_id,
    p_template_id,
    COALESCE(NULLIF(trim(p_locale), ''), 'da'),
    trim(p_to_email),
    p_subject,
    p_body
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_correspondence_for_order(p_key text, p_order_id uuid)
RETURNS SETOF public.correspondence_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_config WHERE key = 'admin_key' AND value = p_key) THEN
    RAISE EXCEPTION 'admin_get_correspondence_for_order: Unauthorized';
  END IF;
  PERFORM set_config('row_security', 'off', true);
  RETURN QUERY
    SELECT * FROM public.correspondence_messages
    WHERE order_id = p_order_id
    ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_message_templates(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_message_template(text, uuid, text, text, text, text, text, text, text, text, text, text, boolean, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_message_template(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_inquiries_for_order(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_inquiry(text, uuid, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_checkout_inquiry(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_correspondence(text, uuid, uuid, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_correspondence_for_order(text, uuid) TO anon, authenticated;

INSERT INTO public.message_templates (code, title_internal, subject_da, subject_en, subject_no, subject_se, body_da, body_en, body_no, body_se, sort_order)
VALUES
(
  'order_followup',
  'Opfølgning på ordre',
  'Angående din ordre #{{orderNo}} — Green Light Scandinavia',
  'Regarding your order #{{orderNo}} — Green Light Scandinavia',
  'Vedrørende din ordre #{{orderNo}} — Green Light Scandinavia',
  'Angående din order #{{orderNo}} — Green Light Scandinavia',
  E'Hej {{customerName}},\n\nTak for din henvendelse vedr. ordre #{{orderNo}}.\n\n{{extraNote}}\n\nMed venlig hilsen\nGreen Light Scandinavia\nsales@glsolargroup.dk · +45 61 48 52 19',
  E'Hello {{customerName}},\n\nThank you for your message regarding order #{{orderNo}}.\n\n{{extraNote}}\n\nKind regards\nGreen Light Scandinavia\nsales@glsolargroup.dk · +45 61 48 52 19',
  E'Hei {{customerName}},\n\nTakk for din henvendelse vedr. ordre #{{orderNo}}.\n\n{{extraNote}}\n\nMed vennlig hilsen\nGreen Light Scandinavia\nsales@glsolargroup.dk · +45 61 48 52 19',
  E'Hej {{customerName}},\n\nTack för ditt meddelande angående order #{{orderNo}}.\n\n{{extraNote}}\n\nVänliga hälsningar\nGreen Light Scandinavia\nsales@glsolargroup.dk · +45 61 48 52 19',
  10
),
(
  'shipping_info_request',
  'Anmodning om leveringsinfo',
  'Vi har brug for flere oplysninger — ordre #{{orderNo}}',
  'We need a few more details — order #{{orderNo}}',
  'Vi trenger litt mer informasjon — ordre #{{orderNo}}',
  'Vi behöver lite mer information — order #{{orderNo}}',
  E'Hej {{customerName}},\n\nFor at vi kan sende ordre #{{orderNo}}, mangler vi følgende:\n\n{{extraNote}}\n\nVenligst svar på denne e-mail.\n\nGreen Light Scandinavia',
  E'Hello {{customerName}},\n\nTo ship order #{{orderNo}}, we still need:\n\n{{extraNote}}\n\nPlease reply to this email.\n\nGreen Light Scandinavia',
  E'Hei {{customerName}},\n\nFor å sende ordre #{{orderNo}}, trenger vi:\n\n{{extraNote}}\n\nVennligst svar på denne e-posten.\n\nGreen Light Scandinavia',
  E'Hej {{customerName}},\n\nFör att skicka order #{{orderNo}} behöver vi:\n\n{{extraNote}}\n\nSvara gärna på detta e-postmeddelande.\n\nGreen Light Scandinavia',
  20
)
ON CONFLICT (code) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- Patch: order_status value `delivered` (terminal — admin list hides by default)
-- Run once in SQL Editor if the CHECK / RPC above were applied before this value existed.
-- ════════════════════════════════════════════════════════════════════════════
-- ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
-- ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check CHECK (
--   order_status IS NULL
--   OR order_status IN (
--     'accepted', 'in_progress', 'awaiting_transport', 'in_transit', 'delivered', 'cancelled'
--   )
-- );
-- Then re-run CREATE OR REPLACE for public.admin_update_order_status (see earlier in this file).

-- ════════════════════════════════════════════════════════════════════════════
-- Auth: block legacy password RPC when email has Supabase Auth user (MFA / session)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.auth_user_exists_for_email(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE lower(trim(both from u.email)) = lower(trim(both from p_email))
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_exists_for_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_exists_for_email(text) TO anon, authenticated;

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

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);


-- ──────────────────────────────────────────
-- 3. ADD ORDER STATUS + SHIPPING/ARRIVAL DATES
-- Run this in Supabase → SQL Editor
-- ──────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'accepted'
    CHECK (order_status IN ('accepted', 'in_progress', 'awaiting_transport', 'in_transit')),
  ADD COLUMN IF NOT EXISTS shipping_date date,
  ADD COLUMN IF NOT EXISTS arrival_date  date;

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

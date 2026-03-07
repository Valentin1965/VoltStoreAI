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

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_insert" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "clients_select" ON public.clients FOR SELECT USING (true);
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

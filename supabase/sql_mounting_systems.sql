-- ============================================================
-- MOUNTING SYSTEMS (Monteringssystemer) — full DDL + RLS
-- Run in Supabase → SQL Editor (after existing migrations)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mounting_systems (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Localized content (JSON: { "da", "en", "no", "se" })
  name                jsonb NOT NULL DEFAULT '{}'::jsonb,
  description         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Price EUR excluding VAT (same convention as other product tables)
  price_eur_ex_vat    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (price_eur_ex_vat >= 0),

  -- Optional media (catalog cards)
  image               text,
  images              jsonb DEFAULT '[]'::jsonb,

  stock_lvl           integer NOT NULL DEFAULT 999 CHECK (stock_lvl >= 0),
  is_active           boolean NOT NULL DEFAULT true,
  is_leader           boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.mounting_systems IS 'Mounting / racking systems — catalog category Monteringssystemer';

CREATE INDEX IF NOT EXISTS idx_mounting_systems_active ON public.mounting_systems (is_active);
CREATE INDEX IF NOT EXISTS idx_mounting_systems_created ON public.mounting_systems (created_at DESC);

DROP TRIGGER IF EXISTS mounting_systems_updated_at ON public.mounting_systems;
CREATE TRIGGER mounting_systems_updated_at
  BEFORE UPDATE ON public.mounting_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.mounting_systems ENABLE ROW LEVEL SECURITY;

-- Open policies (anon + authenticated) — align with other catalog tables using the public anon key.
DROP POLICY IF EXISTS "mounting_systems_select_public" ON public.mounting_systems;
CREATE POLICY "mounting_systems_select_public"
  ON public.mounting_systems FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "mounting_systems_insert_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_insert_authenticated"
  ON public.mounting_systems FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "mounting_systems_update_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_update_authenticated"
  ON public.mounting_systems FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "mounting_systems_delete_authenticated" ON public.mounting_systems;
CREATE POLICY "mounting_systems_delete_authenticated"
  ON public.mounting_systems FOR DELETE
  USING (true);

-- Requires function update_updated_at() from main migration (clients section).

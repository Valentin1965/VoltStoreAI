-- ═══════════════════════════════════════════════════════════════════════════
-- Client cabinet: email + password (bcrypt via pgcrypto)
-- Run in Supabase → SQL Editor after main migration.
-- Guest checkout unchanged (orders.insert from CheckoutPage).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN public.clients.password_hash IS 'bcrypt hash; never expose to client; NULL = legacy row, first login sets password';

-- ── Mask hash in API responses ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_by_id(p_id uuid)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r clients%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.clients WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  r.password_hash := NULL;
  RETURN QUERY SELECT r.*;
END;
$$;

-- ── Login: email + password. If password_hash IS NULL, set it on first success. ──
CREATE OR REPLACE FUNCTION public.login_client_with_password(p_email text, p_password text)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r clients%ROWTYPE;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) < 1 THEN RETURN; END IF;

  SELECT * INTO r FROM public.clients WHERE lower(trim(email)) = lower(trim(p_email)) LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  IF r.password_hash IS NULL THEN
    UPDATE public.clients
    SET password_hash = extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
    WHERE id = r.id;
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

-- Drop legacy 12-arg signature so only password version remains
DROP FUNCTION IF EXISTS public.register_client(text, text, text, text, text, text, text, text, text, text, text, text);

-- ── Register (requires password min 8 chars) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.register_client(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_client_type text DEFAULT 'private',
  p_company text DEFAULT '',
  p_vat text DEFAULT '',
  p_country text DEFAULT 'Danmark',
  p_city text DEFAULT '',
  p_street text DEFAULT '',
  p_house text DEFAULT '',
  p_postal text DEFAULT '',
  p_password text DEFAULT NULL
)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row clients%ROWTYPE;
  ct text;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) < 8 THEN
    RAISE EXCEPTION 'password_too_short' USING ERRCODE = 'P0001';
  END IF;

  ct := CASE WHEN lower(trim(coalesce(p_client_type, 'private'))) = 'business' THEN 'business' ELSE 'private' END;

  INSERT INTO public.clients (
    email, client_type, first_name, last_name, phone,
    company_name, vat_number, country, city, street, house_number, postal_code,
    password_hash
  ) VALUES (
    lower(trim(p_email)),
    ct,
    trim(p_first_name),
    trim(coalesce(p_last_name, '')),
    NULLIF(trim(coalesce(p_phone, '')), ''),
    NULLIF(trim(coalesce(p_company, '')), ''),
    NULLIF(trim(coalesce(p_vat, '')), ''),
    NULLIF(trim(coalesce(p_country, '')), ''),
    NULLIF(trim(coalesce(p_city, '')), ''),
    NULLIF(trim(coalesce(p_street, '')), ''),
    NULLIF(trim(coalesce(p_house, '')), ''),
    NULLIF(trim(coalesce(p_postal, '')), ''),
    extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
  )
  RETURNING * INTO new_row;

  new_row.password_hash := NULL;
  RETURN QUERY SELECT new_row.*;
END;
$$;

-- ── Deprecated: email-only login disabled (returns no rows) ────────────────
CREATE OR REPLACE FUNCTION public.login_client_by_email(p_email text)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_client_with_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_client(text, text, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_client_by_email(text) TO anon, authenticated;

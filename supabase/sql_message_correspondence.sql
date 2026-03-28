-- Message templates + customer inquiries + outbound correspondence log
-- Run in Supabase SQL Editor after main migration (requires app_config.admin_key pattern).

-- Checkout note stored on orders (CheckoutPage sends customer_message on insert)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_message text;

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

-- No policies: access only via SECURITY DEFINER RPCs below.

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

-- Seed templates (idempotent)
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

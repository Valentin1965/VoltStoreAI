-- Links Supabase Auth phone sessions to public.clients by matching digits in clients.phone.
-- Run once in Supabase → SQL Editor (authenticated users only).
CREATE OR REPLACE FUNCTION public.find_client_profile_after_phone_auth()
RETURNS SETOF public.clients
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_phone       text;
  jwt_digits      text;
BEGIN
  jwt_phone := coalesce(auth.jwt() ->> 'phone', '');
  jwt_phone := trim(jwt_phone);
  IF jwt_phone = '' THEN
    RETURN;
  END IF;

  jwt_digits := regexp_replace(jwt_phone, '\D', '', 'g');
  IF jwt_digits = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.*
  FROM public.clients c
  WHERE c.phone IS NOT NULL
    AND regexp_replace(c.phone, '\D', '', 'g') = jwt_digits
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_client_profile_after_phone_auth() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_client_profile_after_phone_auth() TO authenticated;

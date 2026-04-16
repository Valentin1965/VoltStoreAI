-- Run in Supabase SQL Editor (once). Prevents legacy RPC login from bypassing MFA when the same email exists in auth.users.

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

-- Lets the login page tell "wrong password" apart from "no such account" so a registered user with a
-- mistyped password is not pushed to the sign-up page. Returns only a boolean.
CREATE OR REPLACE FUNCTION public.email_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email)));
$$;

REVOKE ALL ON FUNCTION public.email_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_registered(TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- Fixes "Database error saving new user" — root cause found via Postgres
-- Logs: `type "seller_type" does not exist` (SQL state 42704).
--
-- handle_new_user() is SECURITY DEFINER but never pinned its own
-- search_path, so it inherits whatever search_path the CALLING role has
-- in effect. The trigger fires from an INSERT into auth.users performed
-- by supabase_auth_admin (Supabase's internal Auth role), whose
-- search_path doesn't include `public` — so the bare `::seller_type` cast
-- couldn't resolve the type, even though public.seller_type exists and
-- every other check (grants, the INSERT itself in isolation, the trigger
-- text) came back clean. Classic SECURITY DEFINER search_path gotcha —
-- see https://www.postgresql.org/docs/current/sql-createfunction.html
-- ("Writing SECURITY DEFINER Functions Safely").
--
-- Fix: explicitly qualify the type, and pin the function's own
-- search_path so it never again depends on whichever role happens to
-- call it.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sellers (user_id, name, type, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'seller_type')::public.seller_type,
      'PERSONAL_SELLER'
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

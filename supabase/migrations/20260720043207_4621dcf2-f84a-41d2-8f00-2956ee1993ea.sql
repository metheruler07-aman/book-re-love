
-- 1) Fix orders_init search_path
CREATE OR REPLACE FUNCTION public.orders_init()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.delivery_mode = 'self' THEN
    NEW.handoff_code := lpad(floor(random()*10000)::text, 4, '0');
    NEW.status := 'awaiting_handoff';
  ELSE
    NEW.status := 'awaiting_delivery';
  END IF;
  RETURN NEW;
END; $function$;

-- 2) Guard profile privileged fields (is_admin, blocked, strike_count) via trigger
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.is_admin := OLD.is_admin;
  NEW.blocked := OLD.blocked;
  NEW.strike_count := OLD.strike_count;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_profile_admin_fields ON public.profiles;
CREATE TRIGGER guard_profile_admin_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin_fields();

-- 3) Restrict profile SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4) Revoke public/anon EXECUTE on trigger + internal functions; keep has_role/is_blocked callable by authenticated for RLS
REVOKE ALL ON FUNCTION public.guard_note_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_book_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_support_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_book_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_note_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_new() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_support_query() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_rec_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.orders_init() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;

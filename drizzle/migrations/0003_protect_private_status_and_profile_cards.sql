ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS seller_blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS seller_blocked boolean NOT NULL DEFAULT false;

UPDATE public.books b
SET seller_blocked = COALESCE(p.blocked, false)
FROM public.profiles p
WHERE p.id = b.seller_id;

UPDATE public.notes n
SET seller_blocked = COALESCE(p.blocked, false)
FROM public.profiles p
WHERE p.id = n.seller_id;

CREATE OR REPLACE FUNCTION public.sync_seller_block_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.books SET seller_blocked = NEW.blocked WHERE seller_id = NEW.id;
  UPDATE public.notes SET seller_blocked = NEW.blocked WHERE seller_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_seller_block_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS sync_seller_block_status_trg ON public.profiles;
CREATE TRIGGER sync_seller_block_status_trg
AFTER UPDATE OF blocked ON public.profiles
FOR EACH ROW
WHEN (OLD.blocked IS DISTINCT FROM NEW.blocked)
EXECUTE FUNCTION public.sync_seller_block_status();

CREATE OR REPLACE FUNCTION public.sync_seller_block_status_on_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(p.blocked, false) INTO NEW.seller_blocked
  FROM public.profiles p
  WHERE p.id = NEW.seller_id;
  NEW.seller_blocked := COALESCE(NEW.seller_blocked, false);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_seller_block_status_on_listing() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS books_sync_seller_blocked_trg ON public.books;
CREATE TRIGGER books_sync_seller_blocked_trg
BEFORE INSERT OR UPDATE OF seller_id ON public.books
FOR EACH ROW EXECUTE FUNCTION public.sync_seller_block_status_on_listing();
DROP TRIGGER IF EXISTS notes_sync_seller_blocked_trg ON public.notes;
CREATE TRIGGER notes_sync_seller_blocked_trg
BEFORE INSERT OR UPDATE OF seller_id ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.sync_seller_block_status_on_listing();

CREATE OR REPLACE FUNCTION public.guard_book_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_override := OLD.commission_override;
  NEW.removed := OLD.removed;
  NEW.seller_blocked := OLD.seller_blocked;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_note_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.commission_override := OLD.commission_override;
  NEW.removed := OLD.removed;
  NEW.seller_blocked := OLD.seller_blocked;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Approved books public" ON public.books;
CREATE POLICY "Approved books public" ON public.books
FOR SELECT USING (status = 'approved' AND NOT removed AND NOT seller_blocked);
DROP POLICY IF EXISTS "Approved notes public" ON public.notes;
CREATE POLICY "Approved notes public" ON public.notes
FOR SELECT USING (status = 'approved' AND NOT removed AND NOT seller_blocked);

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS DISTINCT FROM auth.uid()
      AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN false
    ELSE COALESCE((SELECT p.blocked FROM public.profiles p WHERE p.id = _user_id), false)
  END;
$$;
REVOKE ALL ON FUNCTION public.is_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read public profiles" ON public.public_profiles;
CREATE POLICY "Authenticated read public profiles" ON public.public_profiles
FOR SELECT TO authenticated USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.seller_id = public_profiles.id AND b.status = 'approved' AND NOT b.removed AND NOT b.seller_blocked
  )
  OR EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.seller_id = public_profiles.id AND n.status = 'approved' AND NOT n.removed AND NOT n.seller_blocked
  )
  OR EXISTS (
    SELECT 1 FROM public.community_requests cr WHERE cr.requester_id = public_profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.recommendations r WHERE r.recommender_id = public_profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.buyer_id = auth.uid() AND o.seller_id = public_profiles.id)
       OR (o.seller_id = auth.uid() AND o.buyer_id = public_profiles.id)
  )
  OR EXISTS (
    SELECT 1 FROM public.messages m
    WHERE (m.from_id = auth.uid() AND m.to_id = public_profiles.id)
       OR (m.to_id = auth.uid() AND m.from_id = public_profiles.id)
  )
);
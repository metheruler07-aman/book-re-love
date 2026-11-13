CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (book_id, buyer_id)
);

GRANT SELECT ON TABLE public.enquiries TO authenticated;
GRANT INSERT (book_id, buyer_id, seller_id, message) ON TABLE public.enquiries TO authenticated;
GRANT UPDATE (status) ON TABLE public.enquiries TO authenticated;
GRANT ALL ON TABLE public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.enquiry_seller_matches(_book_id uuid, _seller_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.books b
    WHERE b.id = _book_id AND b.seller_id = _seller_id
  );
$function$;

REVOKE ALL ON FUNCTION public.enquiry_seller_matches(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enquiry_seller_matches(uuid, uuid) TO authenticated;

CREATE POLICY enquiries_insert_as_buyer_for_real_seller
ON public.enquiries
FOR INSERT
TO authenticated
WITH CHECK (
  buyer_id = auth.uid()
  AND public.enquiry_seller_matches(book_id, seller_id)
);

CREATE POLICY enquiries_read_participants_and_admin
ON public.enquiries
FOR SELECT
TO authenticated
USING (
  buyer_id = auth.uid()
  OR seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY enquiries_seller_update_status
ON public.enquiries
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

CREATE FUNCTION public.guard_enquiry_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted', 'declined') THEN
      RAISE EXCEPTION 'Only pending enquiries can be accepted or declined';
    END IF;
    NEW.decided_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_enquiry_decision() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enquiries_guard_decision
BEFORE UPDATE OF status ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.guard_enquiry_decision();

CREATE FUNCTION public.notify_enquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, message, related_book_id)
    VALUES (NEW.seller_id, 'enquiry_new', 'You received a new enquiry about your book.', NEW.book_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    INSERT INTO public.notifications (user_id, type, message, related_book_id)
    VALUES (
      NEW.buyer_id,
      CASE WHEN NEW.status = 'accepted' THEN 'enquiry_accepted' ELSE 'enquiry_declined' END,
      CASE WHEN NEW.status = 'accepted' THEN 'Your enquiry was accepted.' ELSE 'Your enquiry was declined.' END,
      NEW.book_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_enquiry() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enquiries_notify_seller
AFTER INSERT ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.notify_enquiry();

CREATE TRIGGER enquiries_notify_buyer
AFTER UPDATE OF status ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.notify_enquiry();
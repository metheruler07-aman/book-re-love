ALTER TABLE public.enquiries
ADD COLUMN attempts integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.guard_enquiry_decision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.attempts IS DISTINCT FROM OLD.attempts
     AND NOT (
       OLD.status = 'declined'
       AND NEW.status = 'pending'
       AND NEW.attempts = OLD.attempts + 1
       AND auth.uid() = NEW.buyer_id
     ) THEN
    RAISE EXCEPTION 'Attempts can only increase when resubmitting a declined enquiry';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined') THEN
      NEW.decided_at := now();
    ELSIF OLD.status = 'declined'
       AND NEW.status = 'pending'
       AND NEW.attempts = OLD.attempts + 1
       AND auth.uid() = NEW.buyer_id THEN
      NEW.decided_at := NULL;
    ELSE
      RAISE EXCEPTION 'Only pending enquiries can be accepted or declined';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER enquiries_guard_decision ON public.enquiries;
CREATE TRIGGER enquiries_guard_decision
BEFORE UPDATE ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.guard_enquiry_decision();

CREATE FUNCTION public.request_enquiry(p_book_id uuid, p_message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_buyer_id uuid := auth.uid();
  v_seller_id uuid;
  v_enquiry_id uuid;
  v_status text;
  v_attempts integer;
BEGIN
  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT b.seller_id
  INTO v_seller_id
  FROM public.books AS b
  WHERE b.id = p_book_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  INSERT INTO public.enquiries (book_id, buyer_id, seller_id, message)
  VALUES (p_book_id, v_buyer_id, v_seller_id, p_message)
  ON CONFLICT (book_id, buyer_id) DO NOTHING
  RETURNING id INTO v_enquiry_id;

  IF v_enquiry_id IS NOT NULL THEN
    RETURN v_enquiry_id;
  END IF;

  SELECT e.id, e.status, e.attempts
  INTO v_enquiry_id, v_status, v_attempts
  FROM public.enquiries AS e
  WHERE e.book_id = p_book_id
    AND e.buyer_id = v_buyer_id
  FOR UPDATE;

  IF v_status = 'declined' THEN
    IF v_attempts >= 3 THEN
      RAISE EXCEPTION 'Enquiry limit reached';
    END IF;

    UPDATE public.enquiries
    SET status = 'pending',
        attempts = v_attempts + 1,
        message = p_message,
        decided_at = NULL
    WHERE id = v_enquiry_id;

    INSERT INTO public.notifications (user_id, type, message, related_book_id)
    VALUES (v_seller_id, 'enquiry_new', 'You received a new enquiry about your book.', p_book_id);

    RETURN v_enquiry_id;
  END IF;

  RAISE EXCEPTION 'Enquiry already open';
END;
$function$;

REVOKE ALL ON FUNCTION public.request_enquiry(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_enquiry(uuid, text) TO authenticated;
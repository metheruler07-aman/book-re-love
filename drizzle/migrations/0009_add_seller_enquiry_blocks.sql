CREATE TABLE public.seller_blocks (
  seller_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (seller_id, blocked_user_id)
);

GRANT SELECT, INSERT, DELETE ON TABLE public.seller_blocks TO authenticated;
GRANT ALL ON TABLE public.seller_blocks TO service_role;

ALTER TABLE public.seller_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY seller_blocks_select_own
ON public.seller_blocks
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY seller_blocks_insert_own
ON public.seller_blocks
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

CREATE POLICY seller_blocks_delete_own
ON public.seller_blocks
FOR DELETE
TO authenticated
USING (seller_id = auth.uid());

CREATE FUNCTION public.block_buyer(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_seller_id uuid := auth.uid();
BEGIN
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Buyer is required';
  END IF;

  INSERT INTO public.seller_blocks (seller_id, blocked_user_id)
  VALUES (v_seller_id, p_user_id)
  ON CONFLICT (seller_id, blocked_user_id) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.block_buyer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.block_buyer(uuid) TO authenticated;

CREATE FUNCTION public.unblock_buyer(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_seller_id uuid := auth.uid();
BEGIN
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Buyer is required';
  END IF;

  DELETE FROM public.seller_blocks
  WHERE seller_id = v_seller_id
    AND blocked_user_id = p_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.unblock_buyer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_buyer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_enquiry(p_book_id uuid, p_message text)
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

  IF EXISTS (
    SELECT 1
    FROM public.seller_blocks AS sb
    WHERE sb.seller_id = v_seller_id
      AND sb.blocked_user_id = v_buyer_id
  ) THEN
    RAISE EXCEPTION 'Seller is not accepting enquiries';
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
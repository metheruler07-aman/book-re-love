-- Restrict order changes to the buyer's resale preference; delivery changes require the validated RPC below.
DROP POLICY IF EXISTS "Participants update order" ON public.orders;
DROP POLICY IF EXISTS "Buyer can update own order not_for_resale" ON public.orders;
CREATE POLICY "Buyer updates own resale preference" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (not_for_resale) ON public.orders TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_order_delivery(
  _order_id uuid,
  _handoff_code text DEFAULT NULL,
  _received_photo text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  order_row public.orders%ROWTYPE;
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO order_row
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF order_row.delivery_mode = 'self'
     AND order_row.seller_id = caller_id
     AND order_row.status = 'awaiting_handoff'
     AND order_row.handoff_code IS NOT NULL
     AND _handoff_code = order_row.handoff_code THEN
    UPDATE public.orders
    SET status = 'delivered', delivered_at = now()
    WHERE id = order_row.id;
    RETURN true;
  END IF;

  IF order_row.delivery_mode = 'courier'
     AND order_row.buyer_id = caller_id
     AND order_row.status = 'awaiting_delivery'
     AND _received_photo IS NOT NULL
     AND length(_received_photo) BETWEEN 1 AND 20000000 THEN
    UPDATE public.orders
    SET status = 'delivered', received_photo = _received_photo, delivered_at = now()
    WHERE id = order_row.id;
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_order_delivery(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_delivery(uuid, text, text) TO authenticated;

-- The UPI recipient and default chat fee are intentionally shown to signed-in checkout users.
-- Keep the underlying settings table admin-only and expose only these two fields through a checked function.
DROP POLICY IF EXISTS "Authenticated read platform settings" ON public.platform_settings;
CREATE POLICY "Admins read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_public_platform_settings()
RETURNS TABLE(owner_upi_id text, default_chat_fee numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT settings.owner_upi_id, settings.default_chat_fee
  FROM public.platform_settings AS settings
  WHERE auth.uid() IS NOT NULL
  LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.get_public_platform_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_platform_settings() TO authenticated;

-- Recommendation interest identities are private; expose only aggregate counts to signed-in users.
DROP POLICY IF EXISTS "Authenticated read interests" ON public.recommendation_interests;
CREATE POLICY "Users read own recommendation interests" ON public.recommendation_interests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_recommendation_interest_counts()
RETURNS TABLE(recommendation_id uuid, interest_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT interests.recommendation_id, count(*)::bigint
  FROM public.recommendation_interests AS interests
  WHERE auth.uid() IS NOT NULL
  GROUP BY interests.recommendation_id;
$function$;
REVOKE ALL ON FUNCTION public.get_recommendation_interest_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommendation_interest_counts() TO authenticated;

-- Book photos are stored in a private bucket; only the uploader's folder may be read.
DROP POLICY IF EXISTS "Anyone can read book photos" ON storage.objects;
CREATE POLICY "Owners can read own book photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-photos'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
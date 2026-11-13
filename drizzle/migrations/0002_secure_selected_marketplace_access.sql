CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    _user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      )
      OR (
        _role = 'admin'::public.app_role
        AND COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = _user_id), false)
      )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_offer_seller_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() <> OLD.seller_id THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.book_id IS DISTINCT FROM OLD.book_id
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Offer identity and buyer amount cannot be changed';
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending offers can be answered';
  END IF;

  IF NEW.status = 'accepted' AND NEW.counter_amount IS NOT NULL THEN
    RAISE EXCEPTION 'A seller cannot accept an offer at a different amount';
  END IF;

  IF NEW.status = 'countered' AND (NEW.counter_amount IS NULL OR NEW.counter_amount <= 0) THEN
    RAISE EXCEPTION 'A counteroffer must include a positive amount';
  END IF;

  IF NEW.status NOT IN ('pending', 'accepted', 'declined', 'countered') THEN
    RAISE EXCEPTION 'Invalid offer status';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_offer_seller_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS offers_guard_seller_update ON public.offers;
CREATE TRIGGER offers_guard_seller_update
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.guard_offer_seller_update();

DROP POLICY IF EXISTS "Authenticated read commissions" ON public.commissions;
DROP POLICY IF EXISTS "Admins read commissions" ON public.commissions;
CREATE POLICY "Admins read commissions" ON public.commissions
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_public_commission_rates()
RETURNS TABLE(category text, percent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.category, c.percent FROM public.commissions c;
$$;
REVOKE ALL ON FUNCTION public.get_public_commission_rates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_commission_rates() TO authenticated;

DROP POLICY IF EXISTS "Authenticated read upvotes" ON public.community_upvotes;
DROP POLICY IF EXISTS "Users read own upvotes" ON public.community_upvotes;
CREATE POLICY "Users read own upvotes" ON public.community_upvotes
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_community_upvote_counts()
RETURNS TABLE(request_id uuid, upvote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.request_id, count(*)::bigint
  FROM public.community_upvotes u
  GROUP BY u.request_id;
$$;
REVOKE ALL ON FUNCTION public.get_community_upvote_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_upvote_counts() TO authenticated;

DROP POLICY IF EXISTS "Authenticated read likes" ON public.recommendation_likes;
DROP POLICY IF EXISTS "Users read own likes" ON public.recommendation_likes;
CREATE POLICY "Users read own likes" ON public.recommendation_likes
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_recommendation_like_counts()
RETURNS TABLE(recommendation_id uuid, like_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.recommendation_id, count(*)::bigint
  FROM public.recommendation_likes l
  GROUP BY l.recommendation_id;
$$;
REVOKE ALL ON FUNCTION public.get_recommendation_like_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recommendation_like_counts() TO authenticated;

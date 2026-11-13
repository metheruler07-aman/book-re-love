CREATE OR REPLACE FUNCTION public.can_view_public_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    _profile_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.books b
      WHERE b.seller_id = _profile_id AND b.status = 'approved' AND NOT b.removed AND NOT b.seller_blocked
    )
    OR EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.seller_id = _profile_id AND n.status = 'approved' AND NOT n.removed AND NOT n.seller_blocked
    )
    OR EXISTS (
      SELECT 1 FROM public.community_requests cr WHERE cr.requester_id = _profile_id
    )
    OR EXISTS (
      SELECT 1 FROM public.recommendations r WHERE r.recommender_id = _profile_id
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE (o.buyer_id = auth.uid() AND o.seller_id = _profile_id)
         OR (o.seller_id = auth.uid() AND o.buyer_id = _profile_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.from_id = auth.uid() AND m.to_id = _profile_id)
         OR (m.to_id = auth.uid() AND m.from_id = _profile_id)
    ),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_public_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated read public profiles" ON public.public_profiles;
CREATE POLICY "Authenticated read public profiles" ON public.public_profiles
FOR SELECT TO authenticated USING (public.can_view_public_profile(id));
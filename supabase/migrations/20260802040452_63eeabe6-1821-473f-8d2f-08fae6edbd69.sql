
-- 1. Profiles: restrict full-row reads to owner + admins
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Limited public card for other members
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT id, name, area, radius_km, ships_beyond_radius, payment_methods, created_at
  FROM public.profiles;
REVOKE ALL ON public.profiles_public FROM PUBLIC, anon;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT ALL ON public.profiles_public TO service_role;

-- 2. Prevent privilege escalation via self profile update (defense in depth alongside trigger)
CREATE OR REPLACE FUNCTION public.profile_flags_unchanged(_id uuid, _is_admin boolean, _blocked boolean, _strike integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _id AND p.is_admin = _is_admin AND p.blocked = _blocked AND p.strike_count = _strike
  )
$$;
REVOKE ALL ON FUNCTION public.profile_flags_unchanged(uuid, boolean, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_flags_unchanged(uuid, boolean, boolean, integer) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND public.profile_flags_unchanged(id, is_admin, blocked, strike_count));

-- 3. Restrict public config/community reads to authenticated users
DROP POLICY IF EXISTS "Everyone reads commissions" ON public.commissions;
CREATE POLICY "Authenticated read commissions" ON public.commissions
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.commissions FROM anon;

DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated read platform settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.platform_settings FROM anon;

DROP POLICY IF EXISTS "Requests public read" ON public.community_requests;
CREATE POLICY "Authenticated read requests" ON public.community_requests
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.community_requests FROM anon;

DROP POLICY IF EXISTS "Upvotes public read" ON public.community_upvotes;
CREATE POLICY "Authenticated read upvotes" ON public.community_upvotes
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.community_upvotes FROM anon;

DROP POLICY IF EXISTS "Recs public read" ON public.recommendations;
CREATE POLICY "Authenticated read recs" ON public.recommendations
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.recommendations FROM anon;

DROP POLICY IF EXISTS "Likes public read" ON public.recommendation_likes;
CREATE POLICY "Authenticated read likes" ON public.recommendation_likes
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.recommendation_likes FROM anon;

DROP POLICY IF EXISTS "Interests public read" ON public.recommendation_interests;
CREATE POLICY "Authenticated read interests" ON public.recommendation_interests
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.recommendation_interests FROM anon;

-- 4. Trigger-only SECURITY DEFINER function should not be callable by signed-in users
REVOKE ALL ON FUNCTION public.guard_book_chat_fee() FROM PUBLIC, anon, authenticated;

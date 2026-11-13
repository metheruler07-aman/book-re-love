DROP POLICY IF EXISTS "Authenticated read recs" ON public.recommendations;
DROP POLICY IF EXISTS "Owner reads own recs" ON public.recommendations;
CREATE POLICY "Owner reads own recs" ON public.recommendations
FOR SELECT TO authenticated USING (
  recommender_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.get_public_recommendations()
RETURNS TABLE(
  id uuid,
  recommender_id uuid,
  title text,
  author text,
  blurb text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.recommender_id, r.title, r.author, r.blurb, r.created_at
  FROM public.recommendations r
  ORDER BY r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_public_recommendations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_recommendations() TO authenticated;
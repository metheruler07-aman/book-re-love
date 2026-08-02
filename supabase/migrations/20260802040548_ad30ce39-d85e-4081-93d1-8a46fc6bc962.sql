
DROP VIEW IF EXISTS public.profiles_public;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP FUNCTION IF EXISTS public.profile_flags_unchanged(uuid, boolean, boolean, integer);

-- Column-level hardening: non-admin clients cannot write privileged columns at all
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name, area, radius_km, ships_beyond_radius, payment_methods) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  area text NOT NULL,
  radius_km integer NOT NULL,
  ships_beyond_radius boolean NOT NULL,
  payment_methods jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read public profiles" ON public.public_profiles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.public_profiles (id, name, area, radius_km, ships_beyond_radius, payment_methods, created_at)
  VALUES (NEW.id, NEW.name, NEW.area, NEW.radius_km, NEW.ships_beyond_radius, NEW.payment_methods, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, area = EXCLUDED.area, radius_km = EXCLUDED.radius_km,
    ships_beyond_radius = EXCLUDED.ships_beyond_radius, payment_methods = EXCLUDED.payment_methods;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.sync_public_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_public_profile_trg ON public.profiles;
CREATE TRIGGER sync_public_profile_trg
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

INSERT INTO public.public_profiles (id, name, area, radius_km, ships_beyond_radius, payment_methods, created_at)
SELECT id, name, area, radius_km, ships_beyond_radius, payment_methods, created_at FROM public.profiles
ON CONFLICT (id) DO NOTHING;

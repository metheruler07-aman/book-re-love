
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN _role = 'admin'::app_role THEN
        COALESCE((SELECT is_admin FROM public.profiles WHERE id = _user_id), false)
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
      ELSE
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    END
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deletion_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

GRANT UPDATE (phone, address, notifications_enabled, deletion_requested, deletion_requested_at) ON public.profiles TO authenticated;

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS sold boolean NOT NULL DEFAULT false;

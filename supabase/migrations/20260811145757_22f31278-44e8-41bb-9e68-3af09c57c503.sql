ALTER TABLE public.books ADD COLUMN IF NOT EXISTS thumb_url text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS thumb_url text;
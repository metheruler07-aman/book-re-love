ALTER TABLE public.books
  ADD COLUMN buyback_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN buyback_percent integer NOT NULL DEFAULT 50,
  ADD COLUMN buyback_min_condition text NOT NULL DEFAULT 'Fair',
  ADD COLUMN buyback_notes text;

UPDATE public.books
SET buyback_enabled = true,
    buyback_percent = 50;

ALTER TABLE public.books
  ADD CONSTRAINT books_buyback_percent_range
  CHECK (buyback_percent BETWEEN 25 AND 75);

ALTER TABLE public.orders
  ADD COLUMN buyback_terms jsonb;
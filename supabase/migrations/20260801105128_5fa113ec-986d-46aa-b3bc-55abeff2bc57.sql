ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS chat_activated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_fee numeric NOT NULL DEFAULT 49,
  ADD COLUMN IF NOT EXISTS chat_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_deadline_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS sold boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS settlement text NOT NULL DEFAULT 'escrow';

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'arranged_direct';

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  owner_upi_id text NOT NULL DEFAULT 'bookledger@upi',
  default_chat_fee numeric NOT NULL DEFAULT 49,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id)
);

GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Sellers may not self-set the chat fee; admins can.
CREATE OR REPLACE FUNCTION public.guard_book_chat_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.chat_fee := OLD.chat_fee;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.guard_book_chat_fee() FROM PUBLIC, anon;

CREATE TRIGGER guard_book_chat_fee_trg
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.guard_book_chat_fee();
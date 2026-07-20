
-- 1. Add buyback window to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS buyback_window_days integer NOT NULL DEFAULT 30;

-- 2. Add not_for_resale flag on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS not_for_resale boolean NOT NULL DEFAULT false;

-- 3. Buyback requests table
CREATE TABLE IF NOT EXISTS public.buyback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  book_id uuid NOT NULL,
  claimed_condition text NOT NULL,
  final_condition text,
  base_amount numeric NOT NULL,
  estimated_amount numeric NOT NULL,
  final_amount numeric,
  seller_note text,
  status text NOT NULL DEFAULT 'pending_inspection',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (order_id)
);

GRANT SELECT, INSERT, UPDATE ON public.buyback_requests TO authenticated;
GRANT ALL ON public.buyback_requests TO service_role;
ALTER TABLE public.buyback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can see own buyback requests"
  ON public.buyback_requests FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Buyer can create own buyback requests"
  ON public.buyback_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Seller or admin can update buyback requests"
  ON public.buyback_requests FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

-- 4. Buyback window extension requests
CREATE TABLE IF NOT EXISTS public.buyback_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  book_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (order_id)
);

GRANT SELECT, INSERT, UPDATE ON public.buyback_extensions TO authenticated;
GRANT ALL ON public.buyback_extensions TO service_role;
ALTER TABLE public.buyback_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer or seller can see extensions"
  ON public.buyback_extensions FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Buyer creates extension request"
  ON public.buyback_extensions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Seller decides extension"
  ON public.buyback_extensions FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- 5. Allow buyer to mark own order as not_for_resale
CREATE POLICY "Buyer can update own order not_for_resale"
  ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

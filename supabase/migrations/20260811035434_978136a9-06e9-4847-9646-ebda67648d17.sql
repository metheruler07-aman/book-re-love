CREATE OR REPLACE FUNCTION public.enforce_order_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b public.books%ROWTYPE;
  n public.notes%ROWTYPE;
  expected numeric := 0;
  offer_amt numeric;
  pct numeric;
  override numeric;
BEGIN
  IF NEW.book_id IS NOT NULL THEN
    SELECT * INTO b FROM public.books WHERE id = NEW.book_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid book for order'; END IF;

    IF NEW.kind = 'rent' THEN
      IF COALESCE(NEW.rental_weeks, 0) < 1 THEN
        RAISE EXCEPTION 'Invalid rental duration';
      END IF;
      expected := COALESCE(b.rent_per_week, 0) * NEW.rental_weeks;
    ELSE
      NEW.rental_weeks := NULL;
      SELECT COALESCE(o.counter_amount, o.amount) INTO offer_amt
      FROM public.offers o
      WHERE o.book_id = b.id
        AND o.buyer_id = NEW.buyer_id
        AND o.status = 'accepted'
      ORDER BY o.created_at DESC
      LIMIT 1;
      expected := COALESCE(offer_amt, b.price);
    END IF;

    NEW.seller_id := b.seller_id;
    override := b.commission_override;
  ELSIF NEW.note_id IS NOT NULL THEN
    SELECT * INTO n FROM public.notes WHERE id = NEW.note_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid note for order'; END IF;
    expected := n.price;
    NEW.seller_id := n.seller_id;
    NEW.rental_weeks := NULL;
    override := n.commission_override;
  ELSE
    RAISE EXCEPTION 'Order must reference a listing';
  END IF;

  IF NEW.settlement = 'direct' THEN
    NEW.amount := 0;
    NEW.commission_amount := 0;
    RETURN NEW;
  END IF;

  NEW.amount := expected;

  IF override IS NOT NULL THEN
    NEW.commission_amount := LEAST(GREATEST(override, 0), NEW.amount);
  ELSE
    SELECT c.percent INTO pct FROM public.commissions c
    WHERE c.category = COALESCE(b.category, 'notes');
    NEW.commission_amount := ROUND(NEW.amount * COALESCE(pct, 0) / 100.0, 2);
  END IF;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_amount() FROM anon, authenticated;

DROP TRIGGER IF EXISTS enforce_order_amount_trg ON public.orders;
CREATE TRIGGER enforce_order_amount_trg
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_amount();
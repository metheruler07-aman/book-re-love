-- 1) Merge seller → buyer (unified "user" role); admin stays separate
UPDATE public.user_roles SET role = 'buyer' WHERE role = 'seller';

-- 2) New signups all get the unified role. Pick up Google's full_name too.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END;
$$;

-- 3) Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  related_order_id uuid,
  related_book_id uuid,
  related_note_id uuid,
  related_thread_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications: select"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own notifications: update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own notifications: delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4) Trigger functions + triggers

-- Book status change → notify seller
CREATE OR REPLACE FUNCTION public.notify_book_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications(user_id, type, message, related_book_id)
    VALUES (NEW.seller_id, 'listing_approved',
      'Your listing "' || NEW.title || '" was approved and is now live.',
      NEW.id);
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, type, message, related_book_id)
    VALUES (NEW.seller_id, 'listing_rejected',
      'Your listing "' || NEW.title || '" was rejected.'
        || COALESCE(' Reason: ' || NEW.rejection_note, ''),
      NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_book_status
  AFTER UPDATE OF status ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.notify_book_status();

-- Note status change → notify seller
CREATE OR REPLACE FUNCTION public.notify_note_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications(user_id, type, message, related_note_id)
    VALUES (NEW.seller_id, 'listing_approved',
      'Your notes "' || NEW.title || '" were approved.', NEW.id);
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, type, message, related_note_id)
    VALUES (NEW.seller_id, 'listing_rejected',
      'Your notes "' || NEW.title || '" were rejected.', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_note_status
  AFTER UPDATE OF status ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notify_note_status();

-- New order → notify seller
CREATE OR REPLACE FUNCTION public.notify_order_new()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, message, related_order_id, related_book_id)
  VALUES (NEW.seller_id, 'order_new',
    'New order received (Paid — Held). Prepare handover.',
    NEW.id, NEW.book_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_order_new
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_new();

-- Order status change → notify the relevant party
CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'delivered' THEN
    INSERT INTO public.notifications(user_id, type, message, related_order_id, related_book_id)
    VALUES (NEW.buyer_id, 'order_delivered',
      'Seller marked your order delivered. Please confirm receipt.',
      NEW.id, NEW.book_id);
  ELSIF NEW.status = 'completed' THEN
    INSERT INTO public.notifications(user_id, type, message, related_order_id, related_book_id)
    VALUES (NEW.seller_id, 'order_completed',
      'Buyer confirmed receipt. Order completed.',
      NEW.id, NEW.book_id);
  ELSIF NEW.status = 'overdue_review' THEN
    INSERT INTO public.notifications(user_id, type, message, related_order_id, related_book_id)
    VALUES (NEW.buyer_id, 'order_overdue',
      'Your order is marked Overdue — Needs Review.',
      NEW.id, NEW.book_id);
    INSERT INTO public.notifications(user_id, type, message, related_order_id, related_book_id)
    VALUES (NEW.seller_id, 'order_overdue',
      'Your sale is marked Overdue — Needs Review.',
      NEW.id, NEW.book_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- New chat message → notify recipient
CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, message, related_thread_user_id, related_book_id)
  VALUES (NEW.to_id, 'message_new', 'New message received.', NEW.from_id, NEW.book_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message();

-- New support query on a listing → notify listing owner
CREATE OR REPLACE FUNCTION public.notify_support_query()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE seller uuid;
BEGIN
  IF NEW.book_id IS NULL THEN RETURN NEW; END IF;
  SELECT seller_id INTO seller FROM public.books WHERE id = NEW.book_id;
  IF seller IS NOT NULL AND seller <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, type, message, related_book_id)
    VALUES (seller, 'question_new',
      'New question on your listing: ' || NEW.subject, NEW.book_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_support_query
  AFTER INSERT ON public.support_queries
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_query();

-- Support reply → notify original question owner
CREATE OR REPLACE FUNCTION public.notify_support_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE owner_id uuid; bid uuid;
BEGIN
  SELECT user_id, book_id INTO owner_id, bid FROM public.support_queries WHERE id = NEW.query_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.from_id THEN
    INSERT INTO public.notifications(user_id, type, message, related_book_id)
    VALUES (owner_id, 'question_reply', 'You have a reply to your question.', bid);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_support_reply
  AFTER INSERT ON public.support_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_reply();

-- Recommendation upvote → notify the recommender
CREATE OR REPLACE FUNCTION public.notify_rec_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE recer uuid; rtitle text;
BEGIN
  SELECT recommender_id, title INTO recer, rtitle FROM public.recommendations WHERE id = NEW.recommendation_id;
  IF recer IS NOT NULL AND recer <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, type, message)
    VALUES (recer, 'recommendation_upvote',
      'Someone upvoted your recommendation: ' || rtitle);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_rec_like
  AFTER INSERT ON public.recommendation_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_rec_like();
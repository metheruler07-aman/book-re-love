
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('buyer','seller','admin');
CREATE TYPE public.listing_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.delivery_mode AS ENUM ('self','courier');
CREATE TYPE public.payment_key AS ENUM ('upi','card','wallet','cod');
CREATE TYPE public.order_status AS ENUM ('awaiting_handoff','awaiting_delivery','delivered','cancelled','overdue_review','completed');
CREATE TYPE public.order_kind AS ENUM ('buy','rent','buyback','notes');
CREATE TYPE public.condition_grade AS ENUM ('New','Like New','Good','Fair');
CREATE TYPE public.offer_status AS ENUM ('pending','accepted','declined','countered');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  radius_km int NOT NULL DEFAULT 5,
  ships_beyond_radius boolean NOT NULL DEFAULT false,
  payment_methods jsonb NOT NULL DEFAULT '{"upi":true,"card":false,"wallet":false,"cod":true}'::jsonb,
  blocked boolean NOT NULL DEFAULT false,
  strike_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES (separate table) ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_blocked(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT blocked FROM public.profiles WHERE id = _user_id), false);
$$;

-- Auto-create profile + buyer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Roles: users see own, admins see all; only admins modify
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ COMMISSIONS ============
CREATE TABLE public.commissions (
  category text PRIMARY KEY,
  percent numeric NOT NULL DEFAULT 10
);
GRANT SELECT ON public.commissions TO anon, authenticated;
GRANT ALL ON public.commissions TO service_role;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone reads commissions" ON public.commissions FOR SELECT USING (true);
CREATE POLICY "Admins write commissions" ON public.commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.commissions(category, percent) VALUES
  ('sale', 8),('rental', 12),('buyback', 5),('notes', 15);

-- ============ BOOKS ============
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text NOT NULL,
  cover text NOT NULL DEFAULT '📖',
  photos text[] NOT NULL DEFAULT '{}',
  price numeric NOT NULL,
  rent_per_week numeric,
  condition public.condition_grade NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  area text NOT NULL DEFAULT '',
  original_price numeric NOT NULL,
  description text,
  status public.listing_status NOT NULL DEFAULT 'pending',
  rejection_note text,
  commission_override numeric,
  self_deliver boolean NOT NULL DEFAULT true,
  courier boolean NOT NULL DEFAULT false,
  removed boolean NOT NULL DEFAULT false,
  listed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT SELECT ON public.books TO anon;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved books public" ON public.books FOR SELECT
  USING (status='approved' AND NOT removed AND NOT public.is_blocked(seller_id));
CREATE POLICY "Seller sees own books" ON public.books FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);
CREATE POLICY "Admin sees all books" ON public.books FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Seller creates own book" ON public.books FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id AND status='pending');
CREATE POLICY "Seller edits own book fields" ON public.books FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id AND NOT removed)
  WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Admin manages any book" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Prevent non-admin sellers from changing status/commission_override via trigger
CREATE OR REPLACE FUNCTION public.guard_book_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.status := OLD.status;
  NEW.commission_override := OLD.commission_override;
  NEW.removed := OLD.removed;
  RETURN NEW;
END; $$;
CREATE TRIGGER books_guard_admin BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.guard_book_admin_fields();

-- ============ NOTES ============
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  course text NOT NULL,
  price numeric NOT NULL,
  pages int NOT NULL DEFAULT 1,
  is_digital boolean NOT NULL DEFAULT true,
  photos text[] NOT NULL DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'pending',
  rejection_note text,
  commission_override numeric,
  removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT ON public.notes TO anon;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved notes public" ON public.notes FOR SELECT
  USING (status='approved' AND NOT removed AND NOT public.is_blocked(seller_id));
CREATE POLICY "Seller sees own notes" ON public.notes FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);
CREATE POLICY "Admin sees all notes" ON public.notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Seller creates own note" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id AND status='pending');
CREATE POLICY "Seller edits own note" ON public.notes FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id AND NOT removed) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Admin manages any note" ON public.notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.guard_note_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  NEW.status := OLD.status;
  NEW.commission_override := OLD.commission_override;
  NEW.removed := OLD.removed;
  RETURN NEW;
END; $$;
CREATE TRIGGER notes_guard_admin BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_note_admin_fields();

-- ============ COMMUNITY REQUESTS ============
CREATE TABLE public.community_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.community_requests TO authenticated;
GRANT SELECT ON public.community_requests TO anon;
GRANT ALL ON public.community_requests TO service_role;
ALTER TABLE public.community_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests public read" ON public.community_requests FOR SELECT USING (true);
CREATE POLICY "Auth creates request" ON public.community_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Owner or admin deletes" ON public.community_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.community_upvotes (
  request_id uuid REFERENCES public.community_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_upvotes TO authenticated;
GRANT SELECT ON public.community_upvotes TO anon;
GRANT ALL ON public.community_upvotes TO service_role;
ALTER TABLE public.community_upvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Upvotes public read" ON public.community_upvotes FOR SELECT USING (true);
CREATE POLICY "Users toggle own upvote" ON public.community_upvotes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own upvote" ON public.community_upvotes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ RECOMMENDATIONS ============
CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text NOT NULL,
  blurb text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.recommendations TO authenticated;
GRANT SELECT ON public.recommendations TO anon;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recs public read" ON public.recommendations FOR SELECT USING (true);
CREATE POLICY "Auth creates rec" ON public.recommendations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = recommender_id);
CREATE POLICY "Owner or admin removes rec" ON public.recommendations FOR DELETE TO authenticated
  USING (auth.uid() = recommender_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.recommendation_likes (
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (recommendation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.recommendation_likes TO authenticated;
GRANT SELECT ON public.recommendation_likes TO anon;
GRANT ALL ON public.recommendation_likes TO service_role;
ALTER TABLE public.recommendation_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes public read" ON public.recommendation_likes FOR SELECT USING (true);
CREATE POLICY "Users toggle own like" ON public.recommendation_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own like" ON public.recommendation_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.recommendation_interests (
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (recommendation_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.recommendation_interests TO authenticated;
GRANT SELECT ON public.recommendation_interests TO anon;
GRANT ALL ON public.recommendation_interests TO service_role;
ALTER TABLE public.recommendation_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interests public read" ON public.recommendation_interests FOR SELECT USING (true);
CREATE POLICY "Users toggle own interest" ON public.recommendation_interests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own interest" ON public.recommendation_interests FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  kind public.order_kind NOT NULL,
  rental_weeks int,
  amount numeric NOT NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  payment_method public.payment_key NOT NULL,
  delivery_mode public.delivery_mode NOT NULL,
  handoff_code text,
  received_photo text,
  status public.order_status NOT NULL DEFAULT 'awaiting_handoff',
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read orders" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyer creates order" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants update order" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));

-- Auto-generate handoff code for self-delivery orders; set initial status
CREATE OR REPLACE FUNCTION public.orders_init()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_mode = 'self' THEN
    NEW.handoff_code := lpad(floor(random()*10000)::text, 4, '0');
    NEW.status := 'awaiting_handoff';
  ELSE
    NEW.status := 'awaiting_delivery';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_init_trg BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_init();

-- Hide handoff_code from seller: view for orders with role-based masking
CREATE OR REPLACE VIEW public.orders_view WITH (security_invoker=on) AS
  SELECT
    o.*,
    CASE WHEN o.buyer_id = auth.uid() OR public.has_role(auth.uid(),'admin')
         THEN o.handoff_code ELSE NULL END AS visible_handoff_code
  FROM public.orders o;
GRANT SELECT ON public.orders_view TO authenticated;

-- ============ OFFERS (bargains) ============
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  message text,
  status public.offer_status NOT NULL DEFAULT 'pending',
  counter_amount numeric,
  seller_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read offers" ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyer creates offer" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Seller updates offer" ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  text text NOT NULL,
  redacted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() IN (from_id, to_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Sender sends message" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_id);

-- ============ SUPPORT QUERIES ============
CREATE TABLE public.support_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_queries TO authenticated;
GRANT ALL ON public.support_queries TO service_role;
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin read query" ON public.support_queries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Auth creates query" ON public.support_queries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin updates query" ON public.support_queries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id uuid NOT NULL REFERENCES public.support_queries(id) ON DELETE CASCADE,
  from_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_replies TO authenticated;
GRANT ALL ON public.support_replies TO service_role;
ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read reply" ON public.support_replies FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.support_queries q WHERE q.id = query_id AND q.user_id = auth.uid())
  );
CREATE POLICY "Admin or owner sends reply" ON public.support_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = from_id AND (
      public.has_role(auth.uid(),'admin')
      OR EXISTS (SELECT 1 FROM public.support_queries q WHERE q.id = query_id AND q.user_id = auth.uid())
    )
  );

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;

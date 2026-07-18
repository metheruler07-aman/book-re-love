# Migrate Book Ledger to Lovable Cloud

Replace the in-memory `mock-store.tsx` with a real Postgres backend, real email/password auth, and RLS-enforced role permissions. All existing UI keeps working; only the data layer changes.

## 1. Enable backend & auth

- Enable Lovable Cloud (provisions Postgres + Auth + Storage).
- Enable Email/Password auth (disable email confirmation for smooth dev).
- New signups default to role `buyer`. Admin promotion is manual (you edit `user_roles` directly in the DB — no UI path).
- Create a Storage bucket `book-photos` (public read) for book/note/receipt images.

## 2. Database schema (migration)

Tables in `public` (all with GRANTs + RLS):

- `profiles` — `id (uuid pk = auth.users.id)`, `name`, `area`, `radius_km`, `ships_beyond_radius`, `payment_methods jsonb`, `blocked bool`, `strike_count int`, `created_at`.
- `user_roles` — `(user_id, role app_role)` enum `buyer|seller|admin`. Roles live ONLY here (never on profiles). Trigger on `auth.users` insert adds a `buyer` row + a profile row.
- `commissions` — category (`sale|rental|buyback|notes`) → percent. Admin-only writes.
- `books` — title, author, cover_emoji, condition, price, rent_per_week, category, description, area, seller_id, status (`pending|approved|rejected|removed`), commission_override, photos text[], created_at.
- `notes` — title, subject, seller_id, price, format (`digital|printed`), photos text[], status, commission_override.
- `community_requests` + `community_upvotes` — request text + upvoter user_ids.
- `recommendations` + `recommendation_likes` + `recommendation_interests`.
- `orders` — buyer_id, seller_id, book_id/note_id, kind (`buy|rent|buyback|notes`), rental_weeks, amount, commission_amount, payment_method, delivery_mode (`self|courier`), handoff_code (4-digit, buyer-visible), status (`paid_held|delivered|overdue_review|completed|cancelled`), received_photo_url, created_at, delivered_at.
- `bargains` — order-precursor offer with status accept/decline/counter.
- `conversations` + `messages` — private chat unlocked after an order exists; `scrubPhone` still runs client-side.
- `support_tickets` + `support_replies` — the Raise-a-Query flow.

## 3. Security (RLS)

Security-definer `has_role(uid, role)` function to avoid recursion. Key policies:

- `profiles`: user selects/updates own row; admins update any.
- `books`/`notes`: public SELECT only where `status='approved'` AND owner not blocked; seller full CRUD on own rows while `status != 'removed'`; admins full CRUD; only admins can set `status`, `commission_override`.
- `orders`: buyer and seller of the row can SELECT; buyer inserts; seller updates handoff confirmation; buyer updates received confirmation; admins all.
- `messages`: only participants of the conversation.
- `commissions`, block/unblock, strike changes: admin-only.
- Storage: authenticated users upload to their own folder; public read.

## 4. Client rewrite

- Replace `src/lib/mock-store.tsx` context with:
  - `src/integrations/supabase/*` (generated).
  - `src/hooks/useAuth.ts` — session + profile + roles.
  - React Query hooks per entity (`useBooks`, `useOrders`, `useMessages`, …) doing real reads/writes.
- Rewire pages one-for-one, keeping current UI: `auth.tsx` (real signIn/signUp), `browse.tsx`, `book.$id.tsx` (checkout writes an `orders` row + generates handoff code server-side via default), `sell.tsx` (insert as `pending` + upload photos to Storage), `notes.tsx`, `orders.tsx` (handoff code visible to buyer via RLS; seller confirm via update), `messages.tsx`, `admin.tsx` (approvals, commissions, block, remove — all admin-gated by RLS), `account.tsx`, `community.tsx`, `recommendations.tsx`, `support.tsx`.
- Realtime subscriptions on `messages` and `orders` for live updates.
- Delete the mock store once all pages are migrated.

## 5. Seed & admin bootstrap

- Migration seeds default commission rows (sale 8%, rental 10%, buyback 5%, notes 12%) — editable by admin.
- No seed users. You sign up normally, then I give you the exact SQL to run once to promote your account:
  `insert into user_roles(user_id, role) values ('<your-auth-uid>', 'admin');`

## Technical notes

- Uploads use Supabase Storage with signed public URLs stored on the row.
- Handoff code generated in a DB trigger (`lpad(floor(random()*10000)::text, 4, '0')`) on order insert with `delivery_mode='self'`.
- Overdue detection: a `status='paid_held'` rental past `due_at` is surfaced by a view `orders_with_computed_status`; no cron needed for prototype.
- No edge functions needed — all logic fits in RLS + server functions where required.

## Out of scope (ask if you want them)

- Real payment gateway integration (still simulated: order marked `paid_held` on submit).
- Real masked voice calls (chat still uses the existing mock call modal).
- Email notifications.

Confirm and I'll enable Cloud and start with the migration + auth, then port pages in batches.

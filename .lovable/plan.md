## What I'll add

**1. Listing approval workflow (admin gatekeeping)**
- Every new book listing (from `/sell`) starts with `status: "pending"` and no commission set.
- Pending listings are hidden from `/browse`, `/index`, `/recommendations` — only visible to the seller (marked "Awaiting admin review") and to the admin.
- Admin `Listings` tab gets an **Approvals queue** at the top: shows pending books, requires the admin to set a cut % on that listing before an **Approve** button unlocks. **Reject** removes the listing with an optional note.
- Same flow applies to Notes (pending → admin sets cut → approve).

**2. Platform fees on buy/sell/rent**
- Book detail page shows a small "Platform fee" line (uses per-listing override if set, else the category commission) so buyer/seller both see the cut before completing.
- Rentals and sales both surface the fee. Admin still controls all numbers from the Admin page.

**3. Raise a Query (support inbox)**
- New route `/support` — any signed-in user can submit a query (subject, message, optional related book/listing).
- New Admin tab **Queries**: list of all submitted queries with status (Open / Resolved), admin can reply and mark resolved. Replies visible to the requester on `/support`.
- Store: `queries: Query[]` with `{ id, userId, subject, body, bookId?, status, replies[] }`.

**4. Authorised login tightening**
- `/sell`, `/account`, `/messages`, `/support`, `/admin` require `signedIn === true`; otherwise redirect to `/auth` with a toast.
- Admin routes additionally require `role === "admin"` (already enforced, keep).
- Header hides seller/admin/messages/support links when not signed in.

**5. Easier navigation**
- Rework `SiteHeader`: primary nav collapsed into a clear top bar — **Browse · Notes · Community · Recommend · Messages** — and a right-side account menu with role switcher, Support, Sell, Admin (admin only).
- On mobile: sheet drawer with the same grouped links + section labels ("Shop", "Community", "You").
- Add a persistent "Sell a book" CTA button in the header for sellers.

**6. Book detail / sell page copy**
- `/sell` form: banner "Your listing goes live once an admin approves it and sets the platform cut." Show seller's own pending listings with status pill.
- `/book/$id`: if pending, show a "Pending admin approval" state instead of purchase actions (unless viewer is admin or the owning seller).

## Technical notes

- Extend `Book` and `Note` with `status: "pending" | "approved" | "rejected"` and optional `rejectionNote`.
- Seed data stays `status: "approved"` so the current demo isn't empty.
- Add `queries: Query[]` + `addQuery`, `replyQuery`, `resolveQuery`, `approveBook`, `rejectBook`, `approveNote`, `rejectNote` to `mock-store`.
- Filter helpers: everywhere non-admin/non-owner code reads `books`, filter `status === "approved" && !removed`.
- No backend — still mock/localStorage.

## Out of scope (kept as-is)
- Real payment processing, real calling, and real auth provider — still mocked per the frontend-only prototype scope.
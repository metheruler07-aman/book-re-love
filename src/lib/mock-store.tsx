import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/* =========================================================
 * Book Ledger data layer — Supabase-backed.
 * Keeps the same public API as the previous mock store, so
 * every existing route can continue to `useStore()` and
 * `useCurrentUser()` unchanged.
 * ========================================================= */

export type Role = "user" | "admin";
export type Condition = "New" | "Like New" | "Good" | "Fair";
export type Category = "sale" | "rental" | "buyback" | "notes";
export type ListingStatus = "pending" | "approved" | "rejected";
export type DeliveryMode = "self" | "courier";
export type PaymentKey = "upi" | "card" | "wallet" | "cod";
export type OrderStatus =
  | "awaiting_handoff"
  | "awaiting_delivery"
  | "delivered"
  | "cancelled"
  | "overdue_review"
  | "completed"
  | "arranged_direct";

export type Settlement = "escrow" | "direct";

/** Per buyer–seller pair message allowance. */
export const CHAT_MESSAGE_LIMIT = 200;
export const CHAT_GRACE_BUFFER = 10;
export const CHAT_HARD_LIMIT = CHAT_MESSAGE_LIMIT + CHAT_GRACE_BUFFER;

export type PlatformSettings = { ownerUpiId: string; defaultChatFee: number };

export type PaymentMethods = { upi: boolean; card: boolean; wallet: boolean; cod: boolean };
export type DeliveryOptions = { selfDeliver: boolean; courier: boolean };

export type User = {
  id: string;
  name: string;
  role: Role;
  area: string;
  radiusKm: number;
  shipsBeyondRadius: boolean;
  paymentMethods: PaymentMethods;
  blocked?: boolean;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  photos: string[];
  price: number;
  rentPerWeek?: number;
  condition: Condition;
  category: string;
  sellerId: string;
  area: string;
  listedAt: string;
  originalPrice: number;
  removed?: boolean;
  description?: string;
  status: ListingStatus;
  rejectionNote?: string;
  deliveryOptions: DeliveryOptions;
  buybackWindowDays: number;
  chatActivated: boolean;
  chatFee: number;
  chatPaidAt?: string;
  deliveryDeadlineDays: number;
  sold: boolean;
};

export type Note = {
  id: string;
  title: string;
  course: string;
  price: number;
  sellerId: string;
  pages: number;
  isDigital: boolean;
  photos: string[];
  removed?: boolean;
  status: ListingStatus;
  rejectionNote?: string;
};

export type Request = {
  id: string;
  title: string;
  author?: string;
  note?: string;
  requesterId: string;
  upvotes: string[];
  createdAt: string;
};

export type Recommendation = {
  id: string;
  title: string;
  author: string;
  blurb: string;
  recommenderId: string;
  likes: string[];
  wantToRent: string[];
  createdAt: string;
};

export type Message = { id: string; fromId: string; text: string; redacted?: boolean; at: string };
export type Thread = { id: string; participants: [string, string]; bookId?: string; messages: Message[] };

export type QueryReply = { id: string; fromId: string; text: string; at: string };
export type SupportQuery = {
  id: string;
  userId: string;
  subject: string;
  body: string;
  bookId?: string;
  status: "open" | "resolved";
  createdAt: string;
  replies: QueryReply[];
};

export type Commissions = {
  sale: number;
  rental: number;
  buyback: number;
  notes: number;
  perListing: Record<string, number>;
  perNote: Record<string, number>;
};

export type OfferStatus = "pending" | "accepted" | "declined" | "countered";
export type Offer = {
  id: string;
  bookId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  message?: string;
  status: OfferStatus;
  counterAmount?: number;
  sellerNote?: string;
  createdAt: string;
};

export type Order = {
  id: string;
  bookId: string;
  buyerId: string;
  sellerId: string;
  kind: "buy" | "rent";
  rentalWeeks?: number;
  amount: number;
  paymentMethod: PaymentKey;
  deliveryMode: DeliveryMode;
  status: OrderStatus;
  handoffCode?: string;
  receivedPhoto?: string;
  createdAt: string;
  notForResale: boolean;
  settlement: Settlement;
};

export type BuybackStatus = "pending_inspection" | "approved" | "rejected";
export type BuybackRequest = {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  bookId: string;
  claimedCondition: Condition;
  finalCondition?: Condition;
  baseAmount: number;
  estimatedAmount: number;
  finalAmount?: number;
  sellerNote?: string;
  status: BuybackStatus;
  createdAt: string;
  decidedAt?: string;
};

export type ExtensionStatus = "pending" | "approved" | "declined";
export type BuybackExtension = {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  bookId: string;
  status: ExtensionStatus;
  createdAt: string;
  decidedAt?: string;
};

/* Helpers */
const CONDITION_FACTOR: Record<Condition, number> = { "New": 1.0, "Like New": 0.9, "Good": 0.75, "Fair": 0.55 };
export function buybackPrice(basePaidAmount: number, condition: Condition) {
  return Math.round(basePaidAmount * 0.5 * CONDITION_FACTOR[condition] * 100) / 100;
}
export function isWithinBuybackWindow(orderCreatedAt: string, windowDays: number): boolean {
  const created = new Date(orderCreatedAt).getTime();
  const now = Date.now();
  return (now - created) <= windowDays * 24 * 60 * 60 * 1000;
}
export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

const NUMERIC_PHONE = /(?:\+?\d[\d\s\-().]{6,}\d)/g;
const SPELLED_DIGITS = /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s-]*){6,}\b/gi;
export function scrubPhone(text: string): { clean: string; redacted: boolean } {
  let redacted = false;
  let clean = text.replace(NUMERIC_PHONE, () => { redacted = true; return "•••–hidden–•••"; });
  clean = clean.replace(SPELLED_DIGITS, () => { redacted = true; return "•••–hidden–•••"; });
  return { clean, redacted };
}

/* Row → domain adapters */
type ProfileRow = {
  id: string; name: string; area: string; radius_km: number;
  ships_beyond_radius: boolean; payment_methods: PaymentMethods; blocked: boolean;
  is_admin?: boolean;
};
function toUser(p: ProfileRow, role: Role): User {
  return {
    id: p.id, name: p.name || "Reader", role: p.is_admin ? "admin" : role,
    area: p.area || "", radiusKm: p.radius_km ?? 5,
    shipsBeyondRadius: !!p.ships_beyond_radius,
    paymentMethods: p.payment_methods ?? { upi: true, card: false, wallet: false, cod: true },
    blocked: !!p.blocked,
  };
}

type BookRow = {
  id: string; seller_id: string; title: string; author: string; cover: string;
  photos: string[]; price: number; rent_per_week: number | null; condition: Condition;
  category: string; area: string; original_price: number; description: string | null;
  status: ListingStatus; rejection_note: string | null; commission_override: number | null;
  self_deliver: boolean; courier: boolean; removed: boolean; listed_at: string;
  buyback_window_days: number;
  chat_activated?: boolean; chat_fee?: number; chat_paid_at?: string | null;
  delivery_deadline_days?: number; sold?: boolean;
};
function toBook(b: BookRow): Book {
  return {
    id: b.id, title: b.title, author: b.author, cover: b.cover, photos: b.photos ?? [],
    price: Number(b.price), rentPerWeek: b.rent_per_week ? Number(b.rent_per_week) : undefined,
    condition: b.condition, category: b.category, sellerId: b.seller_id, area: b.area,
    listedAt: (b.listed_at || "").slice(0, 10), originalPrice: Number(b.original_price),
    description: b.description ?? undefined, status: b.status,
    rejectionNote: b.rejection_note ?? undefined, removed: b.removed || undefined,
    deliveryOptions: { selfDeliver: b.self_deliver, courier: b.courier },
    buybackWindowDays: b.buyback_window_days ?? 30,
    chatActivated: !!b.chat_activated,
    chatFee: b.chat_fee != null ? Number(b.chat_fee) : 49,
    chatPaidAt: b.chat_paid_at ?? undefined,
    deliveryDeadlineDays: b.delivery_deadline_days ?? 7,
    sold: !!b.sold,
  };
}
type NoteRow = {
  id: string; seller_id: string; title: string; course: string; price: number;
  pages: number; is_digital: boolean; photos: string[]; status: ListingStatus;
  rejection_note: string | null; commission_override: number | null; removed: boolean;
};
function toNote(n: NoteRow): Note {
  return {
    id: n.id, title: n.title, course: n.course, price: Number(n.price),
    sellerId: n.seller_id, pages: n.pages, isDigital: n.is_digital, photos: n.photos ?? [],
    status: n.status, rejectionNote: n.rejection_note ?? undefined, removed: n.removed || undefined,
  };
}

/* Store type */
type CreateOrderInput = {
  bookId: string; kind: "buy" | "rent"; rentalWeeks?: number; amount: number;
  paymentMethod: PaymentKey; deliveryMode: DeliveryMode; settlement: Settlement;
};

type Store = {
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  signedIn: boolean;
  signIn: (id: string) => void;
  signOut: () => Promise<void>;
  loading: boolean;

  users: User[];
  books: Book[];
  notes: Note[];
  requests: Request[];
  recommendations: Recommendation[];
  threads: Thread[];
  commissions: Commissions;
  queries: SupportQuery[];
  offers: Offer[];
  orders: Order[];
  buybackRequests: BuybackRequest[];
  buybackExtensions: BuybackExtension[];
  notifications: Notification[];
  unreadNotifications: number;
  platformSettings: PlatformSettings;

  updateUser: (id: string, patch: Partial<User>) => Promise<void>;
  addBook: (b: Omit<Book, "id" | "listedAt" | "status">) => Promise<void>;
  updateBook: (id: string, patch: Partial<Book>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  approveBook: (id: string, commissionPct: number) => Promise<void>;
  rejectBook: (id: string, note?: string) => Promise<void>;

  addNote: (n: Omit<Note, "id" | "status">) => Promise<void>;
  approveNote: (id: string, commissionPct: number) => Promise<void>;
  rejectNote: (id: string, note?: string) => Promise<void>;
  removeNote: (id: string) => Promise<void>;

  addRequest: (r: Omit<Request, "id" | "createdAt" | "upvotes">) => Promise<void>;
  toggleUpvote: (rid: string) => Promise<void>;
  addRecommendation: (r: Omit<Recommendation, "id" | "createdAt" | "likes" | "wantToRent">) => Promise<void>;
  toggleRecLike: (id: string) => Promise<void>;
  toggleRecWantRent: (id: string) => Promise<void>;
  setCommission: (key: keyof Omit<Commissions, "perListing" | "perNote">, value: number) => Promise<void>;
  setListingCommission: (bookId: string, value: number | null) => Promise<void>;
  setNoteCommission: (noteId: string, value: number | null) => Promise<void>;
  blockUser: (id: string, blocked: boolean) => Promise<void>;

  addQuery: (q: { subject: string; body: string; bookId?: string }) => Promise<void>;
  replyQuery: (id: string, text: string) => Promise<void>;
  setQueryStatus: (id: string, status: "open" | "resolved") => Promise<void>;

  getThread: (otherId: string, bookId?: string) => Thread;
  sendMessage: (otherId: string, text: string, bookId?: string) => Promise<{ redacted: boolean }>;
  messageCountWith: (otherId: string) => number;

  activateListingChat: (bookId: string) => Promise<void>;
  markBookSold: (bookId: string, sold: boolean) => Promise<void>;
  setListingChatFee: (bookId: string, fee: number) => Promise<void>;
  updatePlatformSettings: (patch: Partial<PlatformSettings>) => Promise<void>;

  createOffer: (bookId: string, amount: number, message?: string) => Promise<void>;
  respondOffer: (id: string, action: "accept" | "decline" | "counter", counterAmount?: number, note?: string) => Promise<void>;

  createOrder: (input: CreateOrderInput) => Promise<Order>;
  confirmHandoff: (orderId: string, code: string) => Promise<{ ok: boolean }>;
  confirmReceived: (orderId: string, photo: string) => Promise<void>;
  setOrderNotForResale: (orderId: string, value: boolean) => Promise<void>;

  requestBuyback: (orderId: string, claimedCondition: Condition) => Promise<void>;
  respondBuyback: (id: string, action: "approve" | "reject", opts?: { finalCondition?: Condition; finalAmount?: number; note?: string }) => Promise<void>;
  requestBuybackExtension: (orderId: string) => Promise<void>;
  respondBuybackExtension: (id: string, action: "approve" | "decline") => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
const ANON: User = {
  id: "", name: "Guest", role: "user", area: "", radiusKm: 5, shipsBeyondRadius: false,
  paymentMethods: { upi: true, card: false, wallet: false, cod: true },
};

export type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  relatedOrderId?: string;
  relatedBookId?: string;
  relatedNoteId?: string;
  relatedThreadUserId?: string;
  createdAt: string;
};

function threadKey(a: string, b: string) { return [a, b].sort().join("|"); }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [commissions, setCommissions] = useState<Commissions>({
    sale: 8, rental: 12, buyback: 5, notes: 15, perListing: {}, perNote: {},
  });
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [buybackRequests, setBuybackRequests] = useState<BuybackRequest[]>([]);
  const [buybackExtensions, setBuybackExtensions] = useState<BuybackExtension[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    ownerUpiId: "", defaultChatFee: 49,
  });

  /* ---------- Loaders ---------- */
  const loadPublic = useCallback(async () => {
  const [b, n, cReq, cUp, r, rl, ri, com, profs, ps] = await Promise.all([
      supabase.from("books").select("*").order("listed_at", { ascending: false }),
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      supabase.from("community_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("community_upvotes").select("*"),
      supabase.from("recommendations").select("*").order("created_at", { ascending: false }),
      supabase.from("recommendation_likes").select("*"),
      supabase.from("recommendation_interests").select("*"),
      supabase.from("commissions").select("*"),
      supabase.from("public_profiles").select("*"),
      supabase.from("platform_settings").select("*").maybeSingle(),
    ]);
    setBooks((b.data ?? []).map((row) => toBook(row as unknown as BookRow)));
    setNotes((n.data ?? []).map((row) => toNote(row as unknown as NoteRow)));
    if (ps.data) {
      setPlatformSettings({
        ownerUpiId: (ps.data as { owner_upi_id: string }).owner_upi_id ?? "",
        defaultChatFee: Number((ps.data as { default_chat_fee: number }).default_chat_fee ?? 49),
      });
    }


    const ups = (cUp.data ?? []) as { request_id: string; user_id: string }[];
    setRequests(((cReq.data ?? []) as Array<{ id: string; title: string; author: string | null; note: string | null; requester_id: string; created_at: string }>).map((r0) => ({
      id: r0.id, title: r0.title, author: r0.author ?? undefined, note: r0.note ?? undefined,
      requesterId: r0.requester_id, createdAt: (r0.created_at || "").slice(0, 10),
      upvotes: ups.filter((u) => u.request_id === r0.id).map((u) => u.user_id),
    })));

    const likes = (rl.data ?? []) as { recommendation_id: string; user_id: string }[];
    const interests = (ri.data ?? []) as { recommendation_id: string; user_id: string }[];
    setRecommendations(((r.data ?? []) as Array<{ id: string; recommender_id: string; title: string; author: string; blurb: string; created_at: string }>).map((rc) => ({
      id: rc.id, title: rc.title, author: rc.author, blurb: rc.blurb,
      recommenderId: rc.recommender_id, createdAt: (rc.created_at || "").slice(0, 10),
      likes: likes.filter((l) => l.recommendation_id === rc.id).map((l) => l.user_id),
      wantToRent: interests.filter((l) => l.recommendation_id === rc.id).map((l) => l.user_id),
    })));

    const perListing: Record<string, number> = {};
    (b.data ?? []).forEach((row: unknown) => {
      const r0 = row as BookRow;
      if (r0.commission_override != null) perListing[r0.id] = Number(r0.commission_override);
    });
    const perNote: Record<string, number> = {};
    (n.data ?? []).forEach((row: unknown) => {
      const r0 = row as NoteRow;
      if (r0.commission_override != null) perNote[r0.id] = Number(r0.commission_override);
    });
    const base = { sale: 8, rental: 12, buyback: 5, notes: 15 };
    ((com.data ?? []) as { category: string; percent: number }[]).forEach((c) => {
      if (c.category in base) (base as Record<string, number>)[c.category] = Number(c.percent);
    });
    setCommissions({ ...base, perListing, perNote });

    // Roles: legacy 'buyer'/'seller' collapse to unified 'user'. Only 'admin' is distinct.
    const { data: myRoles } = await supabase.from("user_roles").select("*");
    const roleMap = new Map<string, Role>();
    ((myRoles ?? []) as { user_id: string; role: string }[]).forEach((r0) =>
      roleMap.set(r0.user_id, r0.role === "admin" ? "admin" : "user"),
    );
    // Privileged columns (blocked / strike_count / is_admin) are only readable for
    // your own row, or for every row when you are an admin. Overlay them on top of
    // the limited public profile cards.
    const { data: privileged } = await supabase.from("profiles").select("*");
    const privMap = new Map<string, { blocked?: boolean; is_admin?: boolean }>();
    ((privileged ?? []) as unknown as ProfileRow[]).forEach((p) => privMap.set(p.id, p));
    setUsers(((profs.data ?? []) as unknown as ProfileRow[]).map((p) =>
      toUser({ ...p, ...(privMap.get(p.id) ?? {}) }, roleMap.get(p.id) ?? "user"),
    ));
  }, []);

  const loadPrivate = useCallback(async (uid: string) => {
    const [o, of0, m, q, qr, nt, bbr, bbe] = await Promise.all([
      supabase.from("orders").select("*").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`).order("created_at", { ascending: false }),
      supabase.from("offers").select("*").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`).order("created_at", { ascending: false }),
      supabase.from("messages").select("*").or(`from_id.eq.${uid},to_id.eq.${uid}`).order("created_at", { ascending: true }),
      supabase.from("support_queries").select("*").order("created_at", { ascending: false }),
      supabase.from("support_replies").select("*").order("created_at", { ascending: true }),
      supabase.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      supabase.from("buyback_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("buyback_extensions").select("*").order("created_at", { ascending: false }),
    ]);
    setOrders(((o.data ?? []) as Array<{
      id: string; buyer_id: string; seller_id: string; book_id: string | null; kind: string;
      rental_weeks: number | null; amount: number; payment_method: PaymentKey;
      delivery_mode: DeliveryMode; handoff_code: string | null; received_photo: string | null;
      status: OrderStatus; created_at: string; not_for_resale: boolean; settlement?: string;
    }>).map((o0) => ({
      id: o0.id, bookId: o0.book_id ?? "", buyerId: o0.buyer_id, sellerId: o0.seller_id,
      kind: (o0.kind === "rent" ? "rent" : "buy"),
      rentalWeeks: o0.rental_weeks ?? undefined, amount: Number(o0.amount),
      paymentMethod: o0.payment_method, deliveryMode: o0.delivery_mode,
      handoffCode: o0.buyer_id === uid ? (o0.handoff_code ?? undefined) : undefined,
      receivedPhoto: o0.received_photo ?? undefined,
      status: o0.status, createdAt: o0.created_at,
      notForResale: !!o0.not_for_resale,
      settlement: (o0.settlement === "direct" ? "direct" : "escrow") as Settlement,
    })));

    setOffers(((of0.data ?? []) as Array<{
      id: string; book_id: string; buyer_id: string; seller_id: string; amount: number;
      message: string | null; status: OfferStatus; counter_amount: number | null;
      seller_note: string | null; created_at: string;
    }>).map((o0) => ({
      id: o0.id, bookId: o0.book_id, buyerId: o0.buyer_id, sellerId: o0.seller_id,
      amount: Number(o0.amount), message: o0.message ?? undefined, status: o0.status,
      counterAmount: o0.counter_amount != null ? Number(o0.counter_amount) : undefined,
      sellerNote: o0.seller_note ?? undefined, createdAt: o0.created_at,
    })));

    // Group messages into threads
    const msgs = ((m.data ?? []) as Array<{
      id: string; from_id: string; to_id: string; book_id: string | null;
      text: string; redacted: boolean; created_at: string;
    }>);
    const map = new Map<string, Thread>();
    for (const msg of msgs) {
      const other = msg.from_id === uid ? msg.to_id : msg.from_id;
      const key = threadKey(uid, other);
      if (!map.has(key)) {
        map.set(key, { id: key, participants: [uid, other], bookId: msg.book_id ?? undefined, messages: [] });
      }
      map.get(key)!.messages.push({
        id: msg.id, fromId: msg.from_id, text: msg.text,
        redacted: msg.redacted, at: msg.created_at,
      });
    }
    setThreads(Array.from(map.values()));

    const replies = ((qr.data ?? []) as Array<{ id: string; query_id: string; from_id: string; text: string; created_at: string }>);
    setQueries(((q.data ?? []) as Array<{
      id: string; user_id: string; subject: string; body: string; book_id: string | null;
      status: string; created_at: string;
    }>).map((q0) => ({
      id: q0.id, userId: q0.user_id, subject: q0.subject, body: q0.body,
      bookId: q0.book_id ?? undefined, status: q0.status === "resolved" ? "resolved" : "open",
      createdAt: (q0.created_at || "").slice(0, 10),
      replies: replies.filter((r0) => r0.query_id === q0.id).map((r0) => ({
        id: r0.id, fromId: r0.from_id, text: r0.text, at: r0.created_at,
      })),
    })));

    setNotifications(((nt.data ?? []) as Array<{
      id: string; type: string; message: string; read: boolean;
      related_order_id: string | null; related_book_id: string | null;
      related_note_id: string | null; related_thread_user_id: string | null;
      created_at: string;
    }>).map((n0) => ({
      id: n0.id, type: n0.type, message: n0.message, read: n0.read,
      relatedOrderId: n0.related_order_id ?? undefined,
      relatedBookId: n0.related_book_id ?? undefined,
      relatedNoteId: n0.related_note_id ?? undefined,
      relatedThreadUserId: n0.related_thread_user_id ?? undefined,
      createdAt: n0.created_at,
    })));

    setBuybackRequests(((bbr.data ?? []) as Array<{
      id: string; order_id: string; buyer_id: string; seller_id: string; book_id: string;
      claimed_condition: Condition; final_condition: Condition | null;
      base_amount: number; estimated_amount: number; final_amount: number | null;
      seller_note: string | null; status: BuybackStatus; created_at: string; decided_at: string | null;
    }>).map((r0) => ({
      id: r0.id, orderId: r0.order_id, buyerId: r0.buyer_id, sellerId: r0.seller_id, bookId: r0.book_id,
      claimedCondition: r0.claimed_condition, finalCondition: r0.final_condition ?? undefined,
      baseAmount: Number(r0.base_amount), estimatedAmount: Number(r0.estimated_amount),
      finalAmount: r0.final_amount != null ? Number(r0.final_amount) : undefined,
      sellerNote: r0.seller_note ?? undefined, status: r0.status,
      createdAt: r0.created_at, decidedAt: r0.decided_at ?? undefined,
    })));

    setBuybackExtensions(((bbe.data ?? []) as Array<{
      id: string; order_id: string; buyer_id: string; seller_id: string; book_id: string;
      status: ExtensionStatus; created_at: string; decided_at: string | null;
    }>).map((r0) => ({
      id: r0.id, orderId: r0.order_id, buyerId: r0.buyer_id, sellerId: r0.seller_id, bookId: r0.book_id,
      status: r0.status, createdAt: r0.created_at, decidedAt: r0.decided_at ?? undefined,
    })));
  }, []);

  /* ---------- Auth wiring ---------- */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const uid = data.session?.user.id ?? "";
      setCurrentUserId(uid);
      setSignedIn(!!uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? "";
      setCurrentUserId(uid);
      setSignedIn(!!uid);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await loadPublic();
      if (currentUserId) await loadPrivate(currentUserId);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [currentUserId, loadPublic, loadPrivate]);

  // Realtime: refresh private data on changes
  useEffect(() => {
    if (!currentUserId) return;
    const ch = supabase.channel("bl-private")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadPrivate(currentUserId))
      .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => loadPrivate(currentUserId))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadPrivate(currentUserId))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` }, () => loadPrivate(currentUserId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentUserId, loadPrivate]);

  /* ---------- Mutations ---------- */
  const refresh = async () => {
    await loadPublic();
    if (currentUserId) await loadPrivate(currentUserId);
  };

  const value = useMemo<Store>(() => ({
    currentUserId, setCurrentUserId, signedIn, loading,
    signIn: (id) => { setCurrentUserId(id); setSignedIn(true); },
    signOut: async () => { await supabase.auth.signOut(); setSignedIn(false); setCurrentUserId(""); },

    users, books, notes, requests, recommendations, threads, commissions, queries, offers, orders,
    buybackRequests, buybackExtensions,
    notifications,
    unreadNotifications: notifications.filter((n) => !n.read).length,
    platformSettings,

    messageCountWith: (otherId) => {
      const t = threads.find((th) => th.participants.includes(currentUserId) && th.participants.includes(otherId));
      return t ? t.messages.length : 0;
    },
    activateListingChat: async (bookId) => {
      await supabase.from("books")
        .update({ chat_activated: true, chat_paid_at: new Date().toISOString() })
        .eq("id", bookId);
      await refresh();
    },
    markBookSold: async (bookId, sold) => {
      await supabase.from("books").update({ sold }).eq("id", bookId);
      await refresh();
    },
    setListingChatFee: async (bookId, fee) => {
      await supabase.from("books").update({ chat_fee: fee }).eq("id", bookId);
      await refresh();
    },
    updatePlatformSettings: async (patch) => {
      await supabase.from("platform_settings").update({
        ...(patch.ownerUpiId != null ? { owner_upi_id: patch.ownerUpiId } : {}),
        ...(patch.defaultChatFee != null ? { default_chat_fee: patch.defaultChatFee } : {}),
      }).eq("id", true);
      await refresh();
    },


    markNotificationRead: async (id) => {
      if (!currentUserId) return;
      setNotifications((cur) => cur.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    markAllNotificationsRead: async () => {
      if (!currentUserId) return;
      setNotifications((cur) => cur.map((n) => ({ ...n, read: true })));
      await supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("read", false);
    },

    updateUser: async (id, patch) => {
      await supabase.from("profiles").update({
        name: patch.name, area: patch.area, radius_km: patch.radiusKm,
        ships_beyond_radius: patch.shipsBeyondRadius, payment_methods: patch.paymentMethods,
      }).eq("id", id);
      await refresh();
    },
    addBook: async (b) => {
      if (!currentUserId) return;
      await supabase.from("books").insert({
        seller_id: currentUserId, title: b.title, author: b.author, cover: b.cover || "📖",
        photos: b.photos, price: b.price, rent_per_week: b.rentPerWeek ?? null,
        condition: b.condition, category: b.category, area: b.area,
        original_price: b.originalPrice, description: b.description ?? null,
        self_deliver: b.deliveryOptions.selfDeliver, courier: b.deliveryOptions.courier,
        buyback_window_days: b.buybackWindowDays,
        delivery_deadline_days: b.deliveryDeadlineDays,
        chat_fee: b.chatFee || platformSettings.defaultChatFee,
      });
      await refresh();
    },
    updateBook: async (id, patch) => {
      await supabase.from("books").update({
        title: patch.title, author: patch.author, price: patch.price,
        rent_per_week: patch.rentPerWeek ?? null, condition: patch.condition,
        category: patch.category, area: patch.area, description: patch.description,
        photos: patch.photos, cover: patch.cover,
        self_deliver: patch.deliveryOptions?.selfDeliver,
        courier: patch.deliveryOptions?.courier,
        ...(patch.buybackWindowDays != null ? { buyback_window_days: patch.buybackWindowDays } : {}),
        ...(patch.deliveryDeadlineDays != null ? { delivery_deadline_days: patch.deliveryDeadlineDays } : {}),
        ...(patch.sold != null ? { sold: patch.sold } : {}),
      }).eq("id", id);
      await refresh();
    },
    removeBook: async (id) => { await supabase.from("books").update({ removed: true }).eq("id", id); await refresh(); },
    approveBook: async (id, pct) => {
      await supabase.from("books").update({ status: "approved", rejection_note: null, commission_override: pct }).eq("id", id);
      await refresh();
    },
    rejectBook: async (id, note) => {
      await supabase.from("books").update({ status: "rejected", rejection_note: note ?? null }).eq("id", id);
      await refresh();
    },

    addNote: async (n) => {
      if (!currentUserId) return;
      await supabase.from("notes").insert({
        seller_id: currentUserId, title: n.title, course: n.course, price: n.price,
        pages: n.pages, is_digital: n.isDigital, photos: n.photos,
      });
      await refresh();
    },
    approveNote: async (id, pct) => {
      await supabase.from("notes").update({ status: "approved", rejection_note: null, commission_override: pct }).eq("id", id);
      await refresh();
    },
    rejectNote: async (id, note) => {
      await supabase.from("notes").update({ status: "rejected", rejection_note: note ?? null }).eq("id", id);
      await refresh();
    },
    removeNote: async (id) => { await supabase.from("notes").update({ removed: true }).eq("id", id); await refresh(); },

    addRequest: async (r) => {
      if (!currentUserId) return;
      const { data } = await supabase.from("community_requests").insert({
        requester_id: currentUserId, title: r.title, author: r.author ?? null, note: r.note ?? null,
      }).select("id").single();
      if (data?.id) await supabase.from("community_upvotes").insert({ request_id: data.id, user_id: currentUserId });
      await refresh();
    },
    toggleUpvote: async (rid) => {
      if (!currentUserId) return;
      const req = requests.find((x) => x.id === rid);
      const has = req?.upvotes.includes(currentUserId);
      if (has) await supabase.from("community_upvotes").delete().eq("request_id", rid).eq("user_id", currentUserId);
      else await supabase.from("community_upvotes").insert({ request_id: rid, user_id: currentUserId });
      await refresh();
    },
    addRecommendation: async (r) => {
      if (!currentUserId) return;
      const { data } = await supabase.from("recommendations").insert({
        recommender_id: currentUserId, title: r.title, author: r.author, blurb: r.blurb,
      }).select("id").single();
      if (data?.id) await supabase.from("recommendation_likes").insert({ recommendation_id: data.id, user_id: currentUserId });
      await refresh();
    },
    toggleRecLike: async (id) => {
      if (!currentUserId) return;
      const rec = recommendations.find((x) => x.id === id);
      const has = rec?.likes.includes(currentUserId);
      if (has) await supabase.from("recommendation_likes").delete().eq("recommendation_id", id).eq("user_id", currentUserId);
      else await supabase.from("recommendation_likes").insert({ recommendation_id: id, user_id: currentUserId });
      await refresh();
    },
    toggleRecWantRent: async (id) => {
      if (!currentUserId) return;
      const rec = recommendations.find((x) => x.id === id);
      const has = rec?.wantToRent.includes(currentUserId);
      if (has) await supabase.from("recommendation_interests").delete().eq("recommendation_id", id).eq("user_id", currentUserId);
      else await supabase.from("recommendation_interests").insert({ recommendation_id: id, user_id: currentUserId });
      await refresh();
    },
    setCommission: async (key, val) => {
      await supabase.from("commissions").upsert({ category: key, percent: val });
      await refresh();
    },
    setListingCommission: async (bookId, val) => {
      await supabase.from("books").update({ commission_override: val }).eq("id", bookId);
      await refresh();
    },
    setNoteCommission: async (noteId, val) => {
      await supabase.from("notes").update({ commission_override: val }).eq("id", noteId);
      await refresh();
    },
    blockUser: async (id, blocked) => {
      await supabase.from("profiles").update({ blocked }).eq("id", id);
      await refresh();
    },

    addQuery: async (q) => {
      if (!currentUserId) return;
      await supabase.from("support_queries").insert({
        user_id: currentUserId, subject: q.subject, body: q.body, book_id: q.bookId ?? null,
      });
      await refresh();
    },
    replyQuery: async (id, text) => {
      if (!currentUserId) return;
      await supabase.from("support_replies").insert({ query_id: id, from_id: currentUserId, text });
      await refresh();
    },
    setQueryStatus: async (id, status) => {
      await supabase.from("support_queries").update({ status }).eq("id", id);
      await refresh();
    },

    getThread: (otherId, bookId) => {
      const key = threadKey(currentUserId || "anon", otherId);
      return threads.find((t) => t.id === key)
        ?? { id: key, participants: [currentUserId, otherId], bookId, messages: [] };
    },
    sendMessage: async (otherId, text, bookId) => {
      if (!currentUserId) return { redacted: false };
      const { clean, redacted } = scrubPhone(text);
      await supabase.from("messages").insert({
        from_id: currentUserId, to_id: otherId, text: clean, redacted, book_id: bookId ?? null,
      });
      await loadPrivate(currentUserId);
      return { redacted };
    },

    createOffer: async (bookId, amount, message) => {
      if (!currentUserId) return;
      const book = books.find((b) => b.id === bookId);
      if (!book) return;
      await supabase.from("offers").insert({
        book_id: bookId, buyer_id: currentUserId, seller_id: book.sellerId,
        amount, message: message ?? null,
      });
      await refresh();
    },
    respondOffer: async (id, action, counterAmount, note) => {
      const patch: {
        status: OfferStatus; seller_note: string | null; counter_amount?: number | null;
      } = {
        status: action === "accept" ? "accepted" : action === "decline" ? "declined" : "countered",
        seller_note: note ?? null,
      };
      if (action === "counter") patch.counter_amount = counterAmount ?? null;
      await supabase.from("offers").update(patch).eq("id", id);
      await refresh();
    },

    createOrder: async (input) => {
      if (!currentUserId) throw new Error("Sign in required");
      const book = books.find((b) => b.id === input.bookId);
      if (!book) throw new Error("Book not found");
      const { data, error } = await supabase.from("orders").insert({
        buyer_id: currentUserId, seller_id: book.sellerId, book_id: book.id,
        kind: input.kind, rental_weeks: input.rentalWeeks ?? null,
        amount: input.settlement === "direct" ? 0 : input.amount,
        payment_method: input.paymentMethod,
        delivery_mode: input.deliveryMode,
        settlement: input.settlement,
        ...(input.settlement === "direct" ? { status: "arranged_direct" as const } : {}),
      }).select("*").single();
      if (error || !data) throw error ?? new Error("Order failed");
      const row = data as {
        id: string; buyer_id: string; seller_id: string; book_id: string | null;
        rental_weeks: number | null; amount: number; payment_method: PaymentKey;
        delivery_mode: DeliveryMode; handoff_code: string | null; status: OrderStatus; created_at: string;
      };
      const order: Order = {
        id: row.id, bookId: row.book_id ?? book.id, buyerId: row.buyer_id, sellerId: row.seller_id,
        kind: input.kind, rentalWeeks: row.rental_weeks ?? undefined, amount: Number(row.amount),
        paymentMethod: row.payment_method, deliveryMode: row.delivery_mode,
        handoffCode: row.handoff_code ?? undefined, status: row.status, createdAt: row.created_at,
        notForResale: false, settlement: input.settlement,
      };
      await loadPrivate(currentUserId);
      return order;
    },
    confirmHandoff: async (orderId, code) => {
      // Only buyer can see the code; seller enters it. Verify server-side by using code as filter.
      const { data, error } = await supabase.from("orders").update({
        status: "delivered", delivered_at: new Date().toISOString(),
      }).eq("id", orderId).eq("handoff_code", code).select("id");
      if (error || !data?.length) return { ok: false };
      await loadPrivate(currentUserId);
      return { ok: true };
    },
    confirmReceived: async (orderId, photo) => {
      await supabase.from("orders").update({
        status: "delivered", received_photo: photo, delivered_at: new Date().toISOString(),
      }).eq("id", orderId);
      await loadPrivate(currentUserId);
    },
    setOrderNotForResale: async (orderId, value) => {
      await supabase.from("orders").update({ not_for_resale: value }).eq("id", orderId);
      await loadPrivate(currentUserId);
    },
    requestBuyback: async (orderId, claimedCondition) => {
      if (!currentUserId) throw new Error("Sign in required");
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");
      const base = Number(order.amount);
      const estimated = buybackPrice(base, claimedCondition);
      await supabase.from("buyback_requests").insert({
        order_id: orderId, buyer_id: currentUserId, seller_id: order.sellerId, book_id: order.bookId,
        claimed_condition: claimedCondition, base_amount: base, estimated_amount: estimated,
        status: "pending_inspection",
      });
      await loadPrivate(currentUserId);
    },
    respondBuyback: async (id, action, opts) => {
      const patch: {
        status: BuybackStatus; decided_at: string;
        final_condition?: Condition; final_amount?: number; seller_note?: string | null;
      } = {
        status: action === "approve" ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        seller_note: opts?.note ?? null,
      };
      if (opts?.finalCondition) patch.final_condition = opts.finalCondition;
      if (opts?.finalAmount != null) patch.final_amount = opts.finalAmount;
      await supabase.from("buyback_requests").update(patch).eq("id", id);
      await loadPrivate(currentUserId);
    },
    requestBuybackExtension: async (orderId) => {
      if (!currentUserId) throw new Error("Sign in required");
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error("Order not found");
      await supabase.from("buyback_extensions").insert({
        order_id: orderId, buyer_id: currentUserId, seller_id: order.sellerId,
        book_id: order.bookId, status: "pending",
      });
      await loadPrivate(currentUserId);
    },
    respondBuybackExtension: async (id, action) => {
      await supabase.from("buyback_extensions").update({
        status: action === "approve" ? "approved" : "declined",
        decided_at: new Date().toISOString(),
      }).eq("id", id);
      await loadPrivate(currentUserId);
    },
  }), [
    currentUserId, signedIn, loading, users, books, notes, requests, recommendations,
    threads, commissions, queries, offers, orders, buybackRequests, buybackExtensions,
    notifications, platformSettings, loadPrivate, loadPublic,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}

export function useCurrentUser() {
  const { users, currentUserId } = useStore();
  return users.find((u) => u.id === currentUserId) ?? ANON;
}

/* ---------- Theme ---------- */
type ThemeCtx = { theme: "light" | "dark"; toggle: () => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("bl-theme") : null;
    if (stored === "dark" || stored === "light") setTheme(stored);
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("bl-theme", theme);
  }, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const t = useContext(ThemeContext);
  if (!t) throw new Error("useTheme must be within ThemeProvider");
  return t;
}

/* ---------- File → data URLs (existing pages rely on this) ---------- */
export function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files);
  return Promise.all(arr.map((f) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  })));
}

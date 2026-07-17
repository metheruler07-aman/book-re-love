import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "buyer" | "seller" | "admin";
export type Condition = "New" | "Like New" | "Good" | "Fair";
export type Category = "sale" | "rental" | "buyback" | "notes";
export type ListingStatus = "pending" | "approved" | "rejected";
export type DeliveryMode = "self" | "courier";
export type PaymentKey = "upi" | "card" | "wallet" | "cod";
export type OrderStatus =
  | "awaiting_handoff"     // self-delivery: waiting for in-person handoff + code
  | "awaiting_delivery"    // courier: buyer & seller arranging in chat
  | "delivered"
  | "cancelled";

export type PaymentMethods = {
  upi: boolean;
  card: boolean;
  wallet: boolean;
  cod: boolean;
};

export type DeliveryOptions = {
  selfDeliver: boolean;   // seller hand-delivers within radius
  courier: boolean;       // arrange courier off-platform (buyer pays)
};

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
  photos: string[];                 // required — at least one photo
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
};

export type Note = {
  id: string;
  title: string;
  course: string;
  price: number;
  sellerId: string;
  pages: number;
  isDigital: boolean;
  photos: string[];                 // required — preview shots
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

export type Message = {
  id: string;
  fromId: string;
  text: string;
  redacted?: boolean;
  at: string;
};

export type Thread = {
  id: string;
  participants: [string, string];
  bookId?: string;
  messages: Message[];
};

export type QueryReply = {
  id: string;
  fromId: string;
  text: string;
  at: string;
};

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
  handoffCode?: string;    // 4-digit, self-delivery, visible to buyer only
  receivedPhoto?: string;  // data URL, courier
  createdAt: string;
};

const CONDITION_FACTOR: Record<Condition, number> = {
  "New": 1.0,
  "Like New": 0.9,
  "Good": 0.75,
  "Fair": 0.55,
};

export function buybackPrice(originalPrice: number, condition: Condition) {
  return Math.round(originalPrice * 0.5 * CONDITION_FACTOR[condition] * 100) / 100;
}

const NUMERIC_PHONE = /(?:\+?\d[\d\s\-().]{6,}\d)/g;
const SPELLED_DIGITS = /\b(?:(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s-]*){6,}\b/gi;
export function scrubPhone(text: string): { clean: string; redacted: boolean } {
  let redacted = false;
  let clean = text.replace(NUMERIC_PHONE, () => { redacted = true; return "•••–hidden–•••"; });
  clean = clean.replace(SPELLED_DIGITS, () => { redacted = true; return "•••–hidden–•••"; });
  return { clean, redacted };
}

function randCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const DEF_DELIVERY: DeliveryOptions = { selfDeliver: true, courier: false };

const seedUsers: User[] = [
  { id: "u1", name: "Ava", role: "buyer",  area: "Bandra West", radiusKm: 5, shipsBeyondRadius: false, paymentMethods: { upi: true, card: true, wallet: true, cod: true } },
  { id: "u2", name: "Rohan", role: "seller", area: "Koramangala", radiusKm: 7, shipsBeyondRadius: true,  paymentMethods: { upi: true, card: false, wallet: true, cod: true } },
  { id: "u3", name: "Meera", role: "seller", area: "Powai", radiusKm: 3, shipsBeyondRadius: false, paymentMethods: { upi: true, card: true, wallet: false, cod: false } },
  { id: "u4", name: "Admin Sam", role: "admin", area: "Remote", radiusKm: 0, shipsBeyondRadius: true, paymentMethods: { upi: true, card: true, wallet: true, cod: true } },
];

const seedBooks: Book[] = [
  { id: "b1", title: "The Overstory", author: "Richard Powers", cover: "🌲", photos: [], price: 380, rentPerWeek: 40, condition: "Like New", category: "Fiction", sellerId: "u2", area: "Koramangala", listedAt: "2026-06-11", originalPrice: 699, status: "approved", description: "Nine strangers, each summoned in different ways by trees.", deliveryOptions: { selfDeliver: true, courier: true } },
  { id: "b2", title: "Sapiens", author: "Yuval Noah Harari", cover: "🧬", photos: [], price: 299, rentPerWeek: 30, condition: "Good", category: "Non-fiction", sellerId: "u3", area: "Powai", listedAt: "2026-05-02", originalPrice: 599, status: "approved", deliveryOptions: { selfDeliver: true, courier: false } },
  { id: "b3", title: "Introduction to Algorithms", author: "CLRS", cover: "📘", photos: [], price: 850, rentPerWeek: 90, condition: "Fair", category: "Textbook", sellerId: "u2", area: "Koramangala", listedAt: "2026-04-19", originalPrice: 1600, status: "approved", deliveryOptions: { selfDeliver: true, courier: true } },
  { id: "b4", title: "Piranesi", author: "Susanna Clarke", cover: "🗝️", photos: [], price: 320, condition: "New", category: "Fiction", sellerId: "u3", area: "Powai", listedAt: "2026-07-01", originalPrice: 450, status: "approved", deliveryOptions: { selfDeliver: true, courier: false } },
  { id: "b5", title: "The Beginning of Infinity", author: "David Deutsch", cover: "♾️", photos: [], price: 410, rentPerWeek: 45, condition: "Like New", category: "Science", sellerId: "u2", area: "Koramangala", listedAt: "2026-06-28", originalPrice: 750, status: "approved", deliveryOptions: { selfDeliver: true, courier: true } },
  { id: "b6", title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", cover: "🌾", photos: [], price: 290, condition: "Good", category: "Essays", sellerId: "u3", area: "Powai", listedAt: "2026-05-22", originalPrice: 520, status: "approved", deliveryOptions: { selfDeliver: true, courier: false } },
  { id: "b7", title: "The Anthropocene Reviewed", author: "John Green", cover: "🌍", photos: [], price: 340, rentPerWeek: 35, condition: "Like New", category: "Essays", sellerId: "u2", area: "Koramangala", listedAt: "2026-07-15", originalPrice: 550, status: "pending", description: "Essays reviewing facets of the human-centered planet on a five-star scale.", deliveryOptions: { selfDeliver: true, courier: true } },
];

const seedNotes: Note[] = [
  { id: "n1", title: "Linear Algebra — Full Semester Notes", course: "MATH 201", price: 120, sellerId: "u2", pages: 84, isDigital: false, photos: [], status: "approved" },
  { id: "n2", title: "Organic Chemistry Reactions (PDF)", course: "CHEM 210", price: 60, sellerId: "u3", pages: 22, isDigital: true, photos: [], status: "approved" },
  { id: "n3", title: "Modern History — Lecture Transcripts", course: "HIST 150", price: 90, sellerId: "u2", pages: 140, isDigital: false, photos: [], status: "approved" },
  { id: "n4", title: "DBMS Cheat Sheet (Notion export)", course: "CS 305", price: 45, sellerId: "u3", pages: 12, isDigital: true, photos: [], status: "approved" },
  { id: "n5", title: "Signals & Systems — Midterm Prep", course: "EE 220", price: 75, sellerId: "u3", pages: 40, isDigital: true, photos: [], status: "pending" },
];

const seedRequests: Request[] = [
  { id: "r1", title: "Because Internet", author: "Gretchen McCulloch", requesterId: "u1", upvotes: ["u1", "u3"], createdAt: "2026-07-08", note: "Willing to pay up to ₹350." },
  { id: "r2", title: "Deep Work", author: "Cal Newport", requesterId: "u1", upvotes: ["u1"], createdAt: "2026-07-10" },
  { id: "r3", title: "Real Analysis (Rudin)", author: "Walter Rudin", requesterId: "u2", upvotes: ["u1", "u2", "u3"], createdAt: "2026-06-30", note: "Any edition works." },
];

const seedRecs: Recommendation[] = [
  { id: "rc1", title: "The Enchanted April", author: "Elizabeth von Arnim", blurb: "A soft, sunny escape. Perfect for a rainy weekend.", recommenderId: "u3", likes: ["u1", "u2"], wantToRent: ["u1"], createdAt: "2026-07-05" },
  { id: "rc2", title: "How to Take Smart Notes", author: "Sönke Ahrens", blurb: "Changed the way I read textbooks. Rent-friendly.", recommenderId: "u2", likes: ["u1"], wantToRent: ["u1", "u3"], createdAt: "2026-07-01" },
  { id: "rc3", title: "Exhalation", author: "Ted Chiang", blurb: "Nine stories that feel like slow lightning.", recommenderId: "u1", likes: ["u2", "u3"], wantToRent: [], createdAt: "2026-06-20" },
];

const seedQueries: SupportQuery[] = [
  { id: "q1", userId: "u1", subject: "Rental didn't arrive on time", body: "The book I rented from Rohan was two days late. What are the options?", status: "open", createdAt: "2026-07-14", replies: [] },
  { id: "q2", userId: "u2", subject: "How is the commission calculated?", body: "Is the platform cut applied before or after courier fees?", status: "resolved", createdAt: "2026-07-10", replies: [{ id: "qr1", fromId: "u4", text: "It's applied to the item subtotal, not the courier fee.", at: "2026-07-11T10:00:00Z" }] },
];

const seedCommissions: Commissions = {
  sale: 8, rental: 12, buyback: 5, notes: 15, perListing: {}, perNote: {},
};

type CreateOrderInput = {
  bookId: string;
  kind: "buy" | "rent";
  rentalWeeks?: number;
  amount: number;
  paymentMethod: PaymentKey;
  deliveryMode: DeliveryMode;
};

type Store = {
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  signedIn: boolean;
  signIn: (id: string) => void;
  signOut: () => void;

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

  updateUser: (id: string, patch: Partial<User>) => void;
  addBook: (b: Omit<Book, "id" | "listedAt" | "status">) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;
  approveBook: (id: string, commissionPct: number) => void;
  rejectBook: (id: string, note?: string) => void;

  addNote: (n: Omit<Note, "id" | "status">) => void;
  approveNote: (id: string, commissionPct: number) => void;
  rejectNote: (id: string, note?: string) => void;
  removeNote: (id: string) => void;

  addRequest: (r: Omit<Request, "id" | "createdAt" | "upvotes">) => void;
  toggleUpvote: (rid: string) => void;
  addRecommendation: (r: Omit<Recommendation, "id" | "createdAt" | "likes" | "wantToRent">) => void;
  toggleRecLike: (id: string) => void;
  toggleRecWantRent: (id: string) => void;
  setCommission: (key: keyof Omit<Commissions, "perListing" | "perNote">, value: number) => void;
  setListingCommission: (bookId: string, value: number | null) => void;
  setNoteCommission: (noteId: string, value: number | null) => void;
  blockUser: (id: string, blocked: boolean) => void;

  addQuery: (q: { subject: string; body: string; bookId?: string }) => void;
  replyQuery: (id: string, text: string) => void;
  setQueryStatus: (id: string, status: "open" | "resolved") => void;

  getThread: (otherId: string, bookId?: string) => Thread;
  sendMessage: (otherId: string, text: string, bookId?: string) => { redacted: boolean };

  createOffer: (bookId: string, amount: number, message?: string) => void;
  respondOffer: (id: string, action: "accept" | "decline" | "counter", counterAmount?: number, note?: string) => void;

  createOrder: (input: CreateOrderInput) => Order;
  confirmHandoff: (orderId: string, code: string) => { ok: boolean };
  confirmReceived: (orderId: string, photo: string) => void;
};

const Ctx = createContext<Store | null>(null);

function threadId(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("u1");
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [books, setBooks] = useState<Book[]>(seedBooks);
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [requests, setRequests] = useState<Request[]>(seedRequests);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(seedRecs);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [commissions, setCommissions] = useState<Commissions>(seedCommissions);
  const [queries, setQueries] = useState<SupportQuery[]>(seedQueries);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const value = useMemo<Store>(() => ({
    currentUserId,
    setCurrentUserId,
    signedIn,
    signIn: (id) => { setCurrentUserId(id); setSignedIn(true); },
    signOut: () => setSignedIn(false),
    users, books, notes, requests, recommendations, threads, commissions, queries, offers, orders,
    updateUser: (id, patch) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    addBook: (b) => setBooks((prev) => [
      { ...b, id: `b${Date.now()}`, listedAt: new Date().toISOString().slice(0, 10), status: "pending" },
      ...prev,
    ]),
    updateBook: (id, patch) => setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removeBook: (id) => setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, removed: true } : x))),
    approveBook: (id, commissionPct) => {
      setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, status: "approved", rejectionNote: undefined } : x)));
      setCommissions((c) => ({ ...c, perListing: { ...c.perListing, [id]: commissionPct } }));
    },
    rejectBook: (id, note) => setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, status: "rejected", rejectionNote: note } : x))),

    addNote: (n) => setNotes((prev) => [{ ...n, id: `n${Date.now()}`, status: "pending" }, ...prev]),
    approveNote: (id, commissionPct) => {
      setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, status: "approved", rejectionNote: undefined } : x)));
      setCommissions((c) => ({ ...c, perNote: { ...c.perNote, [id]: commissionPct } }));
    },
    rejectNote: (id, note) => setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, status: "rejected", rejectionNote: note } : x))),
    removeNote: (id) => setNotes((prev) => prev.map((x) => (x.id === id ? { ...x, removed: true } : x))),

    addRequest: (r) => setRequests((prev) => [
      { ...r, id: `r${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), upvotes: [currentUserId] },
      ...prev,
    ]),
    toggleUpvote: (rid) => setRequests((prev) => prev.map((x) => {
      if (x.id !== rid) return x;
      const has = x.upvotes.includes(currentUserId);
      return { ...x, upvotes: has ? x.upvotes.filter((u) => u !== currentUserId) : [...x.upvotes, currentUserId] };
    })),
    addRecommendation: (r) => setRecommendations((prev) => [
      { ...r, id: `rc${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), likes: [currentUserId], wantToRent: [] },
      ...prev,
    ]),
    toggleRecLike: (id) => setRecommendations((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const has = x.likes.includes(currentUserId);
      return { ...x, likes: has ? x.likes.filter((u) => u !== currentUserId) : [...x.likes, currentUserId] };
    })),
    toggleRecWantRent: (id) => setRecommendations((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const has = x.wantToRent.includes(currentUserId);
      return { ...x, wantToRent: has ? x.wantToRent.filter((u) => u !== currentUserId) : [...x.wantToRent, currentUserId] };
    })),
    setCommission: (key, val) => setCommissions((c) => ({ ...c, [key]: val })),
    setListingCommission: (bookId, val) => setCommissions((c) => {
      const per = { ...c.perListing };
      if (val === null) delete per[bookId];
      else per[bookId] = val;
      return { ...c, perListing: per };
    }),
    setNoteCommission: (noteId, val) => setCommissions((c) => {
      const per = { ...c.perNote };
      if (val === null) delete per[noteId];
      else per[noteId] = val;
      return { ...c, perNote: per };
    }),
    blockUser: (id, blocked) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, blocked } : x))),

    addQuery: (q) => setQueries((prev) => [
      { id: `q${Date.now()}`, userId: currentUserId, subject: q.subject, body: q.body, bookId: q.bookId, status: "open", createdAt: new Date().toISOString().slice(0, 10), replies: [] },
      ...prev,
    ]),
    replyQuery: (id, text) => setQueries((prev) => prev.map((q) =>
      q.id === id
        ? { ...q, replies: [...q.replies, { id: `qr${Date.now()}`, fromId: currentUserId, text, at: new Date().toISOString() }] }
        : q
    )),
    setQueryStatus: (id, status) => setQueries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q))),

    getThread: (otherId, bookId) => {
      const id = threadId(currentUserId, otherId);
      const existing = threads.find((t) => t.id === id);
      if (existing) return existing;
      const t: Thread = { id, participants: [currentUserId, otherId], bookId, messages: [] };
      setThreads((prev) => [...prev, t]);
      return t;
    },
    sendMessage: (otherId, text, bookId) => {
      const { clean, redacted } = scrubPhone(text);
      const id = threadId(currentUserId, otherId);
      setThreads((prev) => {
        const existing = prev.find((t) => t.id === id);
        const msg: Message = { id: `m${Date.now()}`, fromId: currentUserId, text: clean, redacted, at: new Date().toISOString() };
        if (existing) {
          return prev.map((t) => t.id === id ? { ...t, messages: [...t.messages, msg] } : t);
        }
        return [...prev, { id, participants: [currentUserId, otherId], bookId, messages: [msg] }];
      });
      return { redacted };
    },

    createOffer: (bookId, amount, message) => {
      const book = books.find((b) => b.id === bookId);
      if (!book) return;
      setOffers((prev) => [
        { id: `of${Date.now()}`, bookId, buyerId: currentUserId, sellerId: book.sellerId, amount, message, status: "pending", createdAt: new Date().toISOString() },
        ...prev,
      ]);
    },
    respondOffer: (id, action, counterAmount, note) => setOffers((prev) => prev.map((o) => {
      if (o.id !== id) return o;
      if (action === "accept")  return { ...o, status: "accepted", sellerNote: note };
      if (action === "decline") return { ...o, status: "declined", sellerNote: note };
      return { ...o, status: "countered", counterAmount, sellerNote: note };
    })),

    createOrder: (input) => {
      const book = books.find((b) => b.id === input.bookId)!;
      const status: OrderStatus = input.deliveryMode === "self" ? "awaiting_handoff" : "awaiting_delivery";
      const order: Order = {
        id: `o${Date.now()}`,
        bookId: input.bookId,
        buyerId: currentUserId,
        sellerId: book.sellerId,
        kind: input.kind,
        rentalWeeks: input.rentalWeeks,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        deliveryMode: input.deliveryMode,
        status,
        handoffCode: input.deliveryMode === "self" ? randCode() : undefined,
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => [order, ...prev]);
      return order;
    },
    confirmHandoff: (orderId, code) => {
      const o = orders.find((x) => x.id === orderId);
      if (!o || o.handoffCode !== code) return { ok: false };
      setOrders((prev) => prev.map((x) => (x.id === orderId ? { ...x, status: "delivered" } : x)));
      return { ok: true };
    },
    confirmReceived: (orderId, photo) => setOrders((prev) => prev.map((x) =>
      x.id === orderId ? { ...x, status: "delivered", receivedPhoto: photo } : x
    )),
  }), [currentUserId, signedIn, users, books, notes, requests, recommendations, threads, commissions, queries, offers, orders]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used within StoreProvider");
  return s;
}

export function useCurrentUser() {
  const { users, currentUserId } = useStore();
  return users.find((u) => u.id === currentUserId)!;
}

/* Theme */
type ThemeCtx = { theme: "light" | "dark"; toggle: () => void };
const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sc-theme") : null;
    if (stored === "dark" || stored === "light") setTheme(stored);
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("sc-theme", theme);
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

// Utility: read multiple File objects → data URLs.
export function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files);
  return Promise.all(arr.map((f) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  })));
}

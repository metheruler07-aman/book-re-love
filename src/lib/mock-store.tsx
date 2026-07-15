import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "buyer" | "seller" | "admin";
export type Condition = "New" | "Like New" | "Good" | "Fair";
export type Category = "sale" | "rental" | "buyback" | "notes";

export type User = {
  id: string;
  name: string;
  role: Role;
  area: string;
  radiusKm: number;
  shipsBeyondRadius: boolean;
  blocked?: boolean;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;         // emoji or short label
  price: number;         // sale price
  rentPerWeek?: number;
  condition: Condition;
  category: string;      // fiction, textbook, etc
  sellerId: string;
  area: string;
  listedAt: string;
  originalPrice: number; // for buyback calc
  removed?: boolean;
  description?: string;
};

export type Note = {
  id: string;
  title: string;
  course: string;
  price: number;
  sellerId: string;
  pages: number;
  removed?: boolean;
};

export type Request = {
  id: string;
  title: string;
  author?: string;
  note?: string;
  requesterId: string;
  upvotes: string[]; // user ids
  createdAt: string;
};

export type Commissions = {
  sale: number;
  rental: number;
  buyback: number;
  notes: number;
  perListing: Record<string, number>; // bookId -> override %
};

const CONDITION_FACTOR: Record<Condition, number> = {
  "New": 1.0,
  "Like New": 0.9,
  "Good": 0.75,
  "Fair": 0.55,
};

// Buyback = 50% of original, then adjusted by condition factor.
export function buybackPrice(originalPrice: number, condition: Condition) {
  return Math.round(originalPrice * 0.5 * CONDITION_FACTOR[condition] * 100) / 100;
}

const seedUsers: User[] = [
  { id: "u1", name: "Ava (Buyer)", role: "buyer", area: "Bandra West", radiusKm: 5, shipsBeyondRadius: false },
  { id: "u2", name: "Rohan (Seller)", role: "seller", area: "Koramangala", radiusKm: 7, shipsBeyondRadius: true },
  { id: "u3", name: "Meera (Seller)", role: "seller", area: "Powai", radiusKm: 3, shipsBeyondRadius: false },
  { id: "u4", name: "Admin Sam", role: "admin", area: "Remote", radiusKm: 0, shipsBeyondRadius: true },
];

const seedBooks: Book[] = [
  { id: "b1", title: "The Overstory", author: "Richard Powers", cover: "🌲", price: 380, rentPerWeek: 40, condition: "Like New", category: "Fiction", sellerId: "u2", area: "Koramangala", listedAt: "2026-06-11", originalPrice: 699, description: "Nine strangers, each summoned in different ways by trees." },
  { id: "b2", title: "Sapiens", author: "Yuval Noah Harari", cover: "🧬", price: 299, rentPerWeek: 30, condition: "Good", category: "Non-fiction", sellerId: "u3", area: "Powai", listedAt: "2026-05-02", originalPrice: 599 },
  { id: "b3", title: "Introduction to Algorithms", author: "CLRS", cover: "📘", price: 850, rentPerWeek: 90, condition: "Fair", category: "Textbook", sellerId: "u2", area: "Koramangala", listedAt: "2026-04-19", originalPrice: 1600 },
  { id: "b4", title: "Piranesi", author: "Susanna Clarke", cover: "🗝️", price: 320, condition: "New", category: "Fiction", sellerId: "u3", area: "Powai", listedAt: "2026-07-01", originalPrice: 450 },
  { id: "b5", title: "The Beginning of Infinity", author: "David Deutsch", cover: "♾️", price: 410, rentPerWeek: 45, condition: "Like New", category: "Science", sellerId: "u2", area: "Koramangala", listedAt: "2026-06-28", originalPrice: 750 },
  { id: "b6", title: "Braiding Sweetgrass", author: "Robin Wall Kimmerer", cover: "🌾", price: 290, condition: "Good", category: "Essays", sellerId: "u3", area: "Powai", listedAt: "2026-05-22", originalPrice: 520 },
];

const seedNotes: Note[] = [
  { id: "n1", title: "Linear Algebra — Full Semester Notes", course: "MATH 201", price: 120, sellerId: "u2", pages: 84 },
  { id: "n2", title: "Organic Chemistry Reactions Cheat Sheet", course: "CHEM 210", price: 60, sellerId: "u3", pages: 22 },
  { id: "n3", title: "Modern History — Lecture Transcripts", course: "HIST 150", price: 90, sellerId: "u2", pages: 140 },
];

const seedRequests: Request[] = [
  { id: "r1", title: "Because Internet", author: "Gretchen McCulloch", requesterId: "u1", upvotes: ["u1", "u3"], createdAt: "2026-07-08", note: "Willing to pay up to ₹350." },
  { id: "r2", title: "Deep Work", author: "Cal Newport", requesterId: "u1", upvotes: ["u1"], createdAt: "2026-07-10" },
  { id: "r3", title: "Real Analysis (Rudin)", author: "Walter Rudin", requesterId: "u2", upvotes: ["u1", "u2", "u3"], createdAt: "2026-06-30", note: "Any edition works." },
];

const seedCommissions: Commissions = {
  sale: 8,
  rental: 12,
  buyback: 5,
  notes: 15,
  perListing: {},
};

type Store = {
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  users: User[];
  books: Book[];
  notes: Note[];
  requests: Request[];
  commissions: Commissions;

  // actions
  updateUser: (id: string, patch: Partial<User>) => void;
  addBook: (b: Omit<Book, "id" | "listedAt">) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  removeBook: (id: string) => void;
  addNote: (n: Omit<Note, "id">) => void;
  addRequest: (r: Omit<Request, "id" | "createdAt" | "upvotes">) => void;
  toggleUpvote: (rid: string) => void;
  setCommission: (key: keyof Omit<Commissions, "perListing">, value: number) => void;
  setListingCommission: (bookId: string, value: number | null) => void;
  blockUser: (id: string, blocked: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("u1");
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [books, setBooks] = useState<Book[]>(seedBooks);
  const [notes, setNotes] = useState<Note[]>(seedNotes);
  const [requests, setRequests] = useState<Request[]>(seedRequests);
  const [commissions, setCommissions] = useState<Commissions>(seedCommissions);

  const value = useMemo<Store>(() => ({
    currentUserId,
    setCurrentUserId,
    users, books, notes, requests, commissions,
    updateUser: (id, patch) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    addBook: (b) => setBooks((prev) => [
      { ...b, id: `b${Date.now()}`, listedAt: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]),
    updateBook: (id, patch) => setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removeBook: (id) => setBooks((prev) => prev.map((x) => (x.id === id ? { ...x, removed: true } : x))),
    addNote: (n) => setNotes((prev) => [{ ...n, id: `n${Date.now()}` }, ...prev]),
    addRequest: (r) => setRequests((prev) => [
      { ...r, id: `r${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10), upvotes: [currentUserId] },
      ...prev,
    ]),
    toggleUpvote: (rid) => setRequests((prev) => prev.map((x) => {
      if (x.id !== rid) return x;
      const has = x.upvotes.includes(currentUserId);
      return { ...x, upvotes: has ? x.upvotes.filter((u) => u !== currentUserId) : [...x.upvotes, currentUserId] };
    })),
    setCommission: (key, val) => setCommissions((c) => ({ ...c, [key]: val })),
    setListingCommission: (bookId, val) => setCommissions((c) => {
      const per = { ...c.perListing };
      if (val === null) delete per[bookId];
      else per[bookId] = val;
      return { ...c, perListing: per };
    }),
    blockUser: (id, blocked) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, blocked } : x))),
  }), [currentUserId, users, books, notes, requests, commissions]);

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

/* Theme (dark mode) */
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

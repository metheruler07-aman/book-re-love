import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Sparkles, Users, ShieldCheck, BadgeCheck, KeyRound, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { supabase } from "@/integrations/supabase/client";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Book Ledger — A neighborhood book marketplace" },
      { name: "description", content: "Buy, sell, rent, and trade books with readers nearby. Sell your class notes. Request the titles you're hunting." },
      { property: "og:title", content: "Book Ledger — A neighborhood book marketplace" },
      { property: "og:description", content: "Buy, sell, rent, and trade books with readers nearby." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

export const HOME_CATEGORIES = ["Examination", "Fiction", "Non-fiction", "NCERT", "Others"] as const;
const KNOWN = new Set<string>(["Examination", "Fiction", "Non-fiction", "NCERT"]);

function Home() {
  const { books, requests } = useStore();
  const [category, setCategory] = useState<string>("All");
  const liveCount = useLiveBookCount();

  const latest = useMemo(() => {
    const live = books.filter((b) => !b.removed && !b.sold && b.status === "approved");
    const filtered =
      category === "All"
        ? live
        : category === "Others"
          ? live.filter((b) => !KNOWN.has(b.category))
          : live.filter((b) => b.category === category);
    return [...filtered].sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, 10);
  }, [books, category]);

  const topRequests = [...requests].sort((a, b) => b.upvotes.length - a.upvotes.length).slice(0, 3);
  const heroBooks = books.filter((b) => !b.removed && b.status === "approved").slice(0, 4);

  const trustBadges = [
    { icon: ShieldCheck, title: "Payment held safely", body: "Your money stays protected until you confirm you've received the book." },
    { icon: BadgeCheck, title: "Verified sellers", body: "Every seller signs in with a verified phone number or Google account." },
    { icon: KeyRound, title: "Confirmed handoff", body: "A one-time code confirms the book actually changed hands." },
    { icon: RefreshCw, title: "Fair buyback", body: "Sell it back anytime for half the price, based on condition." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="paper-grain border-b border-border/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              Every book deserves a second reader
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              A quieter marketplace <span className="text-accent italic">for readers</span>.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Buy pre-loved books, rent by the week, sell class notes, or list what's on your shelf.
              Book Ledger connects readers by neighborhood — with an honest buyback when you're done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/browse">Browse books <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sell">List your first book</Link>
              </Button>
            </div>

            <div className="mt-10 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {liveCount === null ? "Loading listings…" : `${liveCount.toLocaleString()} book${liveCount === 1 ? "" : "s"} listed right now`}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {heroBooks.map((b, i) => (
                <div
                  key={b.id}
                  className="paper-grain relative aspect-[3/4] rounded-lg border border-border bg-secondary/70 p-6 text-5xl shadow-sm"
                  style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 1.5}deg)`, marginTop: i === 1 || i === 3 ? "1.5rem" : 0 }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span>{b.cover}</span>
                    <div className="font-display text-sm leading-tight text-foreground">
                      {b.title}
                      <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{b.author}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl leading-tight sm:text-4xl">
          Built so no one loses out — <span className="text-accent italic">not the buyer, not the seller.</span>
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {trustBadges.map((t) => (
            <div key={t.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-lg">{t.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest listings by category */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Freshly listed</h2>
            <p className="text-sm text-muted-foreground">The 10 most recent listings{category !== "All" ? ` in ${category}` : ""}.</p>
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {HOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {latest.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Nothing listed in this category yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {latest.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
        )}

        <div className="mt-6">
          <Link
            to="/browse"
            search={category === "All" ? {} : { category }}
            className="text-sm font-medium text-accent hover:underline"
          >
            See more{category !== "All" ? ` in ${category}` : ""} →
          </Link>
        </div>
      </section>

      {/* Community strip */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="grid gap-6 rounded-2xl border border-border bg-secondary/40 p-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Users className="h-4 w-4" />
              <span className="text-xs uppercase tracking-widest">Community board</span>
            </div>
            <h3 className="mt-3 font-display text-3xl">Hunting a specific title?</h3>
            <p className="mt-2 max-w-md text-muted-foreground">
              Post a request. Sellers get notified when upvotes climb — so the books people want most surface first.
            </p>
            <Button asChild className="mt-6" variant="default">
              <Link to="/community">Open the board</Link>
            </Button>
          </div>
          <ul className="grid gap-3">
            {topRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.author}</div>
                </div>
                <div className="rounded-md bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                  ▲ {r.upvotes.length}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

/** One-shot count on mount — no standing realtime channel (saves mobile data). */
function useLiveBookCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("removed", false);
      if (!cancelled) setCount(c ?? 0);
    })();
    return () => { cancelled = true; };
  }, []);

  return count;
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service worker registered'))
        .catch((err) => console.log('Service worker registration failed', err));
    });
  }
</script>}

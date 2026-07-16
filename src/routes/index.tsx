import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookMarked, HandCoins, Repeat, ScrollText, Sparkles, Users } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Second Chapter — A neighborhood book marketplace" },
      { name: "description", content: "Buy, sell, rent, and trade books with readers nearby. Sell your class notes. Request the titles you're hunting." },
    ],
  }),
  component: Home,
});

function Home() {
  const { books, requests } = useStore();
  const featured = books.filter((b) => !b.removed && b.status === "approved").slice(0, 6);
  const topRequests = [...requests].sort((a, b) => b.upvotes.length - a.upvotes.length).slice(0, 3);

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
              Second Chapter connects readers by neighborhood — with an honest buyback when you're done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/browse">Browse books <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/sell">List your first book</Link>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="text-muted-foreground">Books re-shelved</dt>
                <dd className="font-display text-2xl font-semibold">12,480</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Neighborhoods</dt>
                <dd className="font-display text-2xl font-semibold">86</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Buyback rate</dt>
                <dd className="font-display text-2xl font-semibold">50%</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((b, i) => (
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

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: BookMarked, title: "Buy & Sell", body: "List with condition and a fair price. Nearby readers find you first." },
            { icon: Repeat, title: "Rent by the week", body: "Textbooks and page-turners without the commitment." },
            { icon: HandCoins, title: "Honest buyback", body: "We repurchase at 50% of original, adjusted by condition." },
            { icon: ScrollText, title: "Notes marketplace", body: "Students sell class notes to the next cohort." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-accent" />
              <div className="mt-4 font-display text-lg">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured shelf */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl">On the shelves today</h2>
            <p className="text-sm text-muted-foreground">Freshly listed by readers near you.</p>
          </div>
          <Link to="/browse" className="text-sm font-medium text-accent hover:underline">See all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {featured.map((b) => <BookCard key={b.id} book={b} />)}
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

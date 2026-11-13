import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { HowItWorks } from "@/components/how-it-works";
import { BookCard } from "@/components/book-card";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): { category?: string } =>
    typeof search.category === "string" ? { category: search.category } : {},

  head: () => ({
    meta: [
      { title: "Browse books — Book Ledger" },
      { name: "description", content: "Browse pre-loved books listed by readers near you. Filter by condition, category, and area." },
    ],
  }),
  component: Browse,
});

const CATEGORIES = ["All", "Examination", "Fiction", "Non-fiction", "NCERT", "Others"];
const KNOWN = new Set(["Examination", "Fiction", "Non-fiction", "NCERT"]);
const CONDITIONS = ["All", "New", "Like New", "Good", "Fair"] as const;

const PAGE_SIZE = 20;

function Browse() {
  const { books } = useStore();
  const { category } = Route.useSearch();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(category ?? "All");
  const [cond, setCond] = useState<(typeof CONDITIONS)[number]>("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [area, setArea] = useState("");
  const [sort, setSort] = useState("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => { if (category) setCat(category); }, [category]);

  const results = useMemo(() => {
    // Sold copies leave public browsing — they stay visible only in My Space.
    let list = books.filter((b) => !b.removed && !b.sold && b.status === "approved");
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s));
    }
    if (cat === "Others") list = list.filter((b) => !KNOWN.has(b.category));
    else if (cat !== "All") list = list.filter((b) => b.category === cat);
    if (cond !== "All") list = list.filter((b) => b.condition === cond);
    if (minPrice !== "") list = list.filter((b) => b.price >= Number(minPrice));
    if (maxPrice !== "") list = list.filter((b) => b.price <= Number(maxPrice));
    if (area.trim()) {
      const searchArea = area.trim().toLowerCase();
      list = list.filter((b) => b.area.toLowerCase().includes(searchArea));
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "newest") list = [...list].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    return list;
  }, [books, q, cat, cond, minPrice, maxPrice, area, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [q, cat, cond, minPrice, maxPrice, area, sort]);
  const shown = results.slice(0, visible);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Browse the stacks</h1>
        <p className="mt-1 text-muted-foreground">{results.length} books ready for a new reader.</p>
      </header>

      <HowItWorks
        summary="Buying a book on Book Ledger"
        points={[
          "Every listing is reviewed and approved by an admin before it appears here.",
          "Sellers deliver within their own radius; beyond it, courier is arranged and paid by the buyer.",
          "Book Ledger connects buyers and sellers. You arrange payment directly. Inspect the book and meet in a public place.",
          "Sold copies disappear from browsing — buyer and seller keep them in My Space.",
        ]}
      />


      <div className="mb-8 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_1.2fr_1fr_auto]">
        <div className="relative lg:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or author…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={cond} onValueChange={(v) => setCond(v as typeof cond)}>
          <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Min ₹"
          aria-label="Minimum price"
        />
        <Input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max ₹"
          aria-label="Maximum price"
        />
        <Input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area or locality"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price ↑</SelectItem>
            <SelectItem value="price-desc">Price ↓</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          onClick={() => {
            setQ("");
            setCat("All");
            setCond("All");
            setMinPrice("");
            setMaxPrice("");
            setArea("");
            setSort("newest");
          }}
        >
          Reset
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
          No books match those filters yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {shown.map((b) => <BookCard key={b.id} book={b} />)}
          </div>
          {visible < results.length && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Load more ({results.length - visible} left)
              </Button>
            </div>
          )}
        </>
      )}

    </div>
  );
}

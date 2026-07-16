import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/mock-store";
import { BookCard } from "@/components/book-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse books — Second Chapter" },
      { name: "description", content: "Browse pre-loved books listed by readers near you. Filter by condition, category, and area." },
    ],
  }),
  component: Browse,
});

const CATEGORIES = ["All", "Fiction", "Non-fiction", "Textbook", "Science", "Essays"];
const CONDITIONS = ["All", "New", "Like New", "Good", "Fair"] as const;

function Browse() {
  const { books } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [cond, setCond] = useState<(typeof CONDITIONS)[number]>("All");
  const [sort, setSort] = useState("newest");

  const results = useMemo(() => {
    let list = books.filter((b) => !b.removed && b.status === "approved");
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(s) || b.author.toLowerCase().includes(s));
    }
    if (cat !== "All") list = list.filter((b) => b.category === cat);
    if (cond !== "All") list = list.filter((b) => b.condition === cond);
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "newest") list = [...list].sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    return list;
  }, [books, q, cat, cond, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl">Browse the stacks</h1>
        <p className="mt-1 text-muted-foreground">{results.length} books ready for a new reader.</p>
      </header>

      <div className="mb-8 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <div className="relative">
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
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price ↑</SelectItem>
            <SelectItem value="price-desc">Price ↓</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={() => { setQ(""); setCat("All"); setCond("All"); setSort("newest"); }}>
          Reset
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
          No books match those filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {results.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </div>
  );
}

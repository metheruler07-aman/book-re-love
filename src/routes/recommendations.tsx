import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Repeat, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — Second Chapter" },
      { name: "description", content: "Reader-submitted book recommendations. Like your favorites and signal you'd love to rent them." },
    ],
  }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  const me = useCurrentUser();
  const { recommendations, users, toggleRecLike, toggleRecWantRent } = useStore();
  const sorted = [...recommendations].sort((a, b) => (b.likes.length + b.wantToRent.length) - (a.likes.length + a.wantToRent.length));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Recommendations</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Books readers are pressing into your hands</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Like what you love. Tap "Want to rent" so sellers know there's demand.
          </p>
        </div>
        <NewRecDialog />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((r) => {
          const recommender = users.find((u) => u.id === r.recommenderId);
          const liked = r.likes.includes(me.id);
          const wants = r.wantToRent.includes(me.id);
          return (
            <article key={r.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl leading-tight">{r.title}</h3>
                  <div className="text-xs text-muted-foreground">by {r.author}</div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div>rec'd by {recommender?.name}</div>
                  <div>{r.createdAt}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">“{r.blurb}”</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="sm" variant={liked ? "default" : "outline"}
                  onClick={() => toggleRecLike(r.id)}
                  className={liked ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                >
                  <Heart className={`mr-2 h-4 w-4 ${liked ? "fill-current" : ""}`} /> {r.likes.length}
                </Button>
                <Button
                  size="sm" variant={wants ? "default" : "outline"}
                  onClick={() => toggleRecWantRent(r.id)}
                >
                  <Repeat className="mr-2 h-4 w-4" />
                  {wants ? "Rent interest noted" : "Want to rent"} · {r.wantToRent.length}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function NewRecDialog() {
  const me = useCurrentUser();
  const { addRecommendation } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", blurb: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> Recommend a book</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Recommend a book</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Why should readers pick it up?</Label>
            <Textarea rows={3} value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!form.title || !form.author || !form.blurb) { toast.error("Fill all fields"); return; }
            addRecommendation({ title: form.title, author: form.author, blurb: form.blurb, recommenderId: me.id });
            toast.success("Recommendation posted");
            setOpen(false);
          }}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

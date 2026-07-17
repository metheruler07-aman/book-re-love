import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronUp, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community board — Book Ledger" },
      { name: "description", content: "Request the books you're hunting. Upvote requests so the community sees what people want most." },
    ],
  }),
  component: Community,
});

function Community() {
  const me = useCurrentUser();
  const { requests, users, toggleUpvote } = useStore();
  const sorted = [...requests].sort((a, b) => b.upvotes.length - a.upvotes.length);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <MessageSquare className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Community board</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Books people are hunting</h1>
          <p className="mt-1 text-muted-foreground">Post what you can't find. Upvote what you'd read.</p>
        </div>
        <NewRequestDialog />
      </header>

      <ul className="space-y-3">
        {sorted.map((r) => {
          const requester = users.find((u) => u.id === r.requesterId);
          const upvoted = r.upvotes.includes(me.id);
          return (
            <li key={r.id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
              <button
                onClick={() => toggleUpvote(r.id)}
                className={`flex w-16 flex-col items-center justify-center rounded-md border transition ${
                  upvoted
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <ChevronUp className="h-5 w-5" />
                <span className="font-semibold">{r.upvotes.length}</span>
              </button>
              <div className="flex-1">
                <div className="font-display text-lg leading-tight">{r.title}</div>
                {r.author && <div className="text-xs text-muted-foreground">by {r.author}</div>}
                {r.note && <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Requested by {requester?.name}</span>
                  <span>·</span>
                  <span>{r.createdAt}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NewRequestDialog() {
  const me = useCurrentUser();
  const { addRequest } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", note: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> Post request</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request a book</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Author (optional)</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Note (edition, budget…)</Label><Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!form.title) { toast.error("Add a title"); return; }
            addRequest({ title: form.title, author: form.author || undefined, note: form.note || undefined, requesterId: me.id });
            toast.success("Request posted");
            setOpen(false);
          }}>Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

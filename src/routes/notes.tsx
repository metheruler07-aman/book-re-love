import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Class notes marketplace — Second Chapter" },
      { name: "description", content: "Students selling their class notes to the next cohort. Browse by course or upload your own." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { notes, users, addNote } = useStore();
  const me = useCurrentUser();
  const live = notes.filter((n) => !n.removed);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <FileText className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Notes marketplace</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Notes from the seat behind you</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Lecture transcripts, summaries, and cheat sheets — sold by students who already survived the semester.
          </p>
        </div>
        {me.role !== "buyer" && <UploadNoteDialog />}
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {live.map((n) => {
          const seller = users.find((u) => u.id === n.sellerId);
          return (
            <div key={n.id} className="flex flex-col rounded-lg border border-border bg-card p-5 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline">{n.course}</Badge>
                <span className="text-xs text-muted-foreground">{n.pages} pages</span>
              </div>
              <div className="mt-4 font-display text-lg leading-tight">{n.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">by {seller?.name ?? "Anonymous"}</div>
              <div className="mt-auto flex items-end justify-between pt-6">
                <div className="font-display text-2xl font-semibold">₹{n.price}</div>
                <Button size="sm" onClick={() => toast.success("Purchased", { description: n.title })}>
                  <ShoppingBag className="mr-2 h-3 w-3" /> Buy
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UploadNoteDialog() {
  const me = useCurrentUser();
  const { addNote } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", course: "", price: "", pages: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> Upload notes</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload class notes</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Row label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Row>
          <Row label="Course code"><Input placeholder="e.g. MATH 201" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label="Price (₹)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Row>
            <Row label="Pages"><Input type="number" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} /></Row>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!form.title || !form.course || !form.price) { toast.error("Fill required fields"); return; }
            addNote({
              title: form.title, course: form.course, price: Number(form.price),
              pages: Number(form.pages || 0), sellerId: me.id,
            });
            toast.success("Notes published");
            setOpen(false);
          }}>Publish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

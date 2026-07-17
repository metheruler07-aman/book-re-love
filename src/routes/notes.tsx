import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Plus, ShoppingBag, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Class notes marketplace — Book Ledger" },
      { name: "description", content: "Printed and online (PDF) class notes sold by students who already survived the semester." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const { notes, users } = useStore();
  const me = useCurrentUser();
  const [tab, setTab] = useState<"all" | "online" | "printed">("all");

  const live = useMemo(() => {
    const l = notes.filter((n) => !n.removed && n.status === "approved");
    if (tab === "online") return l.filter((n) => n.isDigital);
    if (tab === "printed") return l.filter((n) => !n.isDigital);
    return l;
  }, [notes, tab]);

  const myPending = notes.filter((n) => n.sellerId === me.id && n.status !== "approved" && !n.removed);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <FileText className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Notes marketplace</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Notes from the seat behind you</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Printed handouts and online PDFs — sold by students who already survived the semester.
          </p>
        </div>
        {me.role !== "buyer" && <UploadNoteDialog />}
      </header>

      {myPending.length > 0 && (
        <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-accent"><Clock className="h-4 w-4" /> Your submissions awaiting approval</div>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {myPending.map((n) => (
              <li key={n.id}>• {n.title} — {n.status === "rejected" ? <span className="text-destructive">Rejected</span> : "Pending admin review"}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="online">Online (PDF)</TabsTrigger>
          <TabsTrigger value="printed">Printed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {live.map((n) => {
          const seller = users.find((u) => u.id === n.sellerId);
          return (
            <div key={n.id} className="flex flex-col rounded-lg border border-border bg-card p-5 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline">{n.course}</Badge>
                <Badge variant={n.isDigital ? "default" : "secondary"} className={n.isDigital ? "bg-accent text-accent-foreground" : ""}>
                  {n.isDigital ? "Online PDF" : "Printed"}
                </Badge>
              </div>
              <div className="mt-4 font-display text-lg leading-tight">{n.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">by {seller?.name ?? "Anonymous"} · {n.pages} pages</div>
              <div className="mt-auto flex items-end justify-between pt-6">
                <div className="font-display text-2xl font-semibold">₹{n.price}</div>
                <Button size="sm" onClick={() => toast.success(n.isDigital ? "Downloading…" : "Purchased", { description: n.title })}>
                  {n.isDigital ? <Download className="mr-2 h-3 w-3" /> : <ShoppingBag className="mr-2 h-3 w-3" />}
                  {n.isDigital ? "Buy & download" : "Buy"}
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
  const [form, setForm] = useState({ title: "", course: "", price: "", pages: "", isDigital: true });

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
          <div className="flex items-center justify-between rounded-md border border-border bg-secondary/40 p-3">
            <div>
              <div className="text-sm font-medium">Online (PDF)</div>
              <div className="text-xs text-muted-foreground">Buyers download instantly. Otherwise it's a printed handoff.</div>
            </div>
            <Switch checked={form.isDigital} onCheckedChange={(v) => setForm({ ...form, isDigital: v })} />
          </div>
          <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Notes go live once admin approves and sets the platform cut.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!form.title || !form.course || !form.price) { toast.error("Fill required fields"); return; }
            addNote({
              title: form.title, course: form.course, price: Number(form.price),
              pages: Number(form.pages || 0), sellerId: me.id, isDigital: form.isDigital,
            });
            toast.success("Submitted for admin approval");
            setOpen(false);
          }}>Submit for approval</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

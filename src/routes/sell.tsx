import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock, CheckCircle2, XCircle, ShieldCheck, ImagePlus, Handshake } from "lucide-react";
import { toast } from "sonner";
import { buybackPrice, filesToDataUrls, useCurrentUser, useStore, type Condition, type DeliveryOptions } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell & rent books — Book Ledger" },
      { name: "description", content: "List books for sale or rent. Listings go live after admin sets the platform cut and approves." },
    ],
  }),
  component: Sell,
});

const CONDITIONS: Condition[] = ["New", "Like New", "Good", "Fair"];
const CATS = ["Fiction", "Non-fiction", "Textbook", "Science", "Essays"];
const COVERS = ["📖", "📕", "📗", "📘", "📙", "📚", "🕮", "🌾", "🌲", "♾️"];

function Sell() {
  const me = useCurrentUser();
  const { signedIn, books, commissions, removeBook, offers, users, respondOffer } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!signedIn) { toast("Sign in to sell books"); navigate({ to: "/auth" }); }
  }, [signedIn, navigate]);

  if (!signedIn) return null;

  const myBooks = books.filter((b) => b.sellerId === me.id && !b.removed);
  const live = myBooks.filter((b) => b.status === "approved");
  const myOffers = offers.filter((o) => o.sellerId === me.id);


  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Your shelf</h1>
          <p className="mt-1 text-muted-foreground">Manage listings, edit prices, and add new titles.</p>
        </div>
        <NewListingDialog />
      </header>

      <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-accent"><ShieldCheck className="h-4 w-4" /> Approval required</div>
        <p className="mt-1 text-muted-foreground">
          Every new listing is held for admin review. Admin sets the platform cut for your book, then approves it — only then does it appear on Browse.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Live listings" value={live.length.toString()} />
        <StatCard label="Avg price" value={`₹${live.length ? Math.round(live.reduce((a, b) => a + b.price, 0) / live.length) : 0}`} />
        <StatCard label="Est. inventory value" value={`₹${live.reduce((a, b) => a + b.price, 0)}`} />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Rent/wk</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Platform cut</TableHead>
              <TableHead>Buyback</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myBooks.map((b) => {
              const cut = commissions.perListing[b.id];
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {b.photos[0]
                        ? <img src={b.photos[0]} alt="" className="h-10 w-10 rounded object-cover" />
                        : <span className="text-2xl">{b.cover}</span>}
                      <div>
                        <div className="font-medium">{b.title}</div>
                        <div className="text-xs text-muted-foreground">{b.author}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={b.status} rejectionNote={b.rejectionNote} /></TableCell>
                  <TableCell><Badge variant="secondary">{b.condition}</Badge></TableCell>
                  <TableCell>₹{b.price}</TableCell>
                  <TableCell>{b.rentPerWeek ? `₹${b.rentPerWeek}` : "—"}</TableCell>
                  <TableCell className="text-xs">
                    {[b.deliveryOptions.selfDeliver && "Self", b.deliveryOptions.courier && "Courier"].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {b.status === "approved" ? `${cut ?? commissions.sale}%` : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">₹{buybackPrice(b.originalPrice, b.condition)}</TableCell>
                  <TableCell className="text-right">
                    <EditListingDialog id={b.id} />
                    <Button size="icon" variant="ghost" onClick={() => { removeBook(b.id); toast("Listing removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {myBooks.length === 0 && (
              <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No listings yet. Add your first book.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bargain inbox */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Handshake className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl">Bargain offers</h2>
        </div>
        <div className="rounded-lg border border-border bg-card">
          {myOffers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No offers yet. Buyers can pitch a price on any listing.</div>
          ) : (
            <ul className="divide-y divide-border">
              {myOffers.map((o) => {
                const b = books.find((x) => x.id === o.bookId);
                const buyer = users.find((u) => u.id === o.buyerId);
                if (!b) return null;
                return (
                  <li key={o.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div>
                      <div className="font-medium">{b.title} <span className="text-muted-foreground">— {buyer?.name}</span></div>
                      <div className="mt-1 text-sm">
                        Listed <span className="line-through text-muted-foreground">₹{b.price}</span>
                        {" · "}Offered <span className="font-semibold text-accent">₹{o.amount}</span>
                        {o.counterAmount ? <> · Counter <span className="font-semibold">₹{o.counterAmount}</span></> : null}
                      </div>
                      {o.message && <div className="mt-1 text-xs text-muted-foreground">"{o.message}"</div>}
                      <div className="mt-1 text-xs text-muted-foreground">Status: <b className="capitalize">{o.status}</b></div>
                    </div>
                    {o.status === "pending" && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => { respondOffer(o.id, "accept"); toast.success("Offer accepted"); }}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => { respondOffer(o.id, "decline"); toast("Declined"); }}>Decline</Button>
                        <CounterButton id={o.id} start={o.amount} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CounterButton({ id, start }: { id: string; start: number }) {
  const { respondOffer } = useStore();
  const [open, setOpen] = useState(false);
  const [amt, setAmt] = useState(String(start + 20));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="secondary">Counter</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Counter-offer</DialogTitle></DialogHeader>
        <Field label="Your price (₹)"><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { respondOffer(id, "counter", Number(amt)); toast.success("Counter sent"); setOpen(false); }}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status, rejectionNote }: { status: "pending" | "approved" | "rejected"; rejectionNote?: string }) {
  if (status === "approved") return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Live</Badge>;
  if (status === "pending")  return <Badge className="gap-1 bg-accent text-accent-foreground"><Clock className="h-3 w-3" /> Pending</Badge>;
  return (
    <span title={rejectionNote}>
      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function PhotoInput({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded border border-border">
            <img src={p} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-0.5 rounded bg-background/80 p-0.5 text-destructive"
              aria-label="Remove photo"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed border-border text-xs text-muted-foreground hover:bg-secondary/40">
          <ImagePlus className="h-4 w-4" />
          Add
          <input
            type="file" accept="image/*" multiple hidden
            onChange={async (e) => {
              if (!e.target.files) return;
              const urls = await filesToDataUrls(e.target.files);
              onChange([...photos, ...urls]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">At least one photo is required. Buyers trust listings with real photos.</p>
    </div>
  );
}

function DeliveryPicker({ value, onChange }: { value: DeliveryOptions; onChange: (v: DeliveryOptions) => void }) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-secondary/40 p-3 text-sm">
      <label className="flex items-start gap-2">
        <Checkbox checked={value.selfDeliver} onCheckedChange={(c) => onChange({ ...value, selfDeliver: !!c })} />
        <div>
          <div className="font-medium">Self-deliver within my radius</div>
          <div className="text-xs text-muted-foreground">You hand the book over in person. Handoff confirmed by a 4-digit code the buyer shows you.</div>
        </div>
      </label>
      <label className="flex items-start gap-2">
        <Checkbox checked={value.courier} onCheckedChange={(c) => onChange({ ...value, courier: !!c })} />
        <div>
          <div className="font-medium">Arrange courier off-platform</div>
          <div className="text-xs text-muted-foreground">You and the buyer coordinate address and courier in chat. Book Ledger doesn't calculate shipping.</div>
        </div>
      </label>
    </div>
  );
}

function NewListingDialog() {
  const me = useCurrentUser();
  const { addBook } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", author: "", cover: "📖", price: "", originalPrice: "", rentPerWeek: "",
    condition: "Good" as Condition, category: "Fiction", description: "", buybackWindowDays: "30", deliveryDeadlineDays: "7",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [delivery, setDelivery] = useState<DeliveryOptions>({ selfDeliver: true, courier: false });

  const reset = () => {
    setForm({ title: "", author: "", cover: "📖", price: "", originalPrice: "", rentPerWeek: "", condition: "Good", category: "Fiction", description: "", buybackWindowDays: "30", deliveryDeadlineDays: "7" });
    setPhotos([]);
    setDelivery({ selfDeliver: true, courier: false });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> New listing</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">List a book</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Author"><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
          <Field label="Photos (required)"><PhotoInput photos={photos} onChange={setPhotos} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sale price (₹)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Original price (₹)"><Input type="number" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rent / week (optional)"><Input type="number" value={form.rentPerWeek} onChange={(e) => setForm({ ...form, rentPerWeek: e.target.value })} /></Field>
            <Field label="Condition">
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as Condition })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Cover emoji (fallback)">
              <Select value={form.cover} onValueChange={(v) => setForm({ ...form, cover: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COVERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Delivery options"><DeliveryPicker value={delivery} onChange={setDelivery} /></Field>
          <Field label="Buyback eligibility window (days)">
            <Input
              type="number" min={0} value={form.buybackWindowDays}
              onChange={(e) => setForm({ ...form, buybackWindowDays: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              How many days after purchase a buyer can request buyback. They can still ask you to extend past this window.
            </p>
          </Field>
          <Field label="Delivery deadline (days)">
            <Input
              type="number" min={1} value={form.deliveryDeadlineDays}
              onChange={(e) => setForm({ ...form, deliveryDeadlineDays: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              For escrow orders: how many days you have to hand over the book after payment.
            </p>
          </Field>
          <Field label="Description (optional)">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Heads up: your listing will be marked <b>Pending</b> until admin sets the platform cut and approves it.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.title || !form.author || !form.price || !form.originalPrice) {
                toast.error("Fill title, author, and prices"); return;
              }
              if (photos.length === 0) { toast.error("Add at least one photo of the book"); return; }
              if (!delivery.selfDeliver && !delivery.courier) { toast.error("Pick at least one delivery option"); return; }
              addBook({
                title: form.title, author: form.author, cover: form.cover, photos,
                price: Number(form.price), originalPrice: Number(form.originalPrice),
                rentPerWeek: form.rentPerWeek ? Number(form.rentPerWeek) : undefined,
                condition: form.condition, category: form.category,
                sellerId: me.id, area: me.area,
                description: form.description || undefined,
                deliveryOptions: delivery,
                buybackWindowDays: Number(form.buybackWindowDays) || 30,
              });
              toast.success("Submitted for admin approval");
              setOpen(false);
            }}
          >
            Submit for approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditListingDialog({ id }: { id: string }) {
  const { books, updateBook } = useStore();
  const b = books.find((x) => x.id === id)!;
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(b.price));
  const [rent, setRent] = useState(b.rentPerWeek ? String(b.rentPerWeek) : "");
  const [cond, setCond] = useState<Condition>(b.condition);
  const [photos, setPhotos] = useState<string[]>(b.photos);
  const [delivery, setDelivery] = useState<DeliveryOptions>(b.deliveryOptions);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit "{b.title}"</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Price (₹)"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Rent / week (₹, blank = not for rent)"><Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} /></Field>
          <Field label="Condition">
            <Select value={cond} onValueChange={(v) => setCond(v as Condition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Photos"><PhotoInput photos={photos} onChange={setPhotos} /></Field>
          <Field label="Delivery options"><DeliveryPicker value={delivery} onChange={setDelivery} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (photos.length === 0) { toast.error("At least one photo required"); return; }
            if (!delivery.selfDeliver && !delivery.courier) { toast.error("Pick a delivery option"); return; }
            updateBook(id, { price: Number(price), rentPerWeek: rent ? Number(rent) : undefined, condition: cond, photos, deliveryOptions: delivery });
            toast.success("Listing updated");
            setOpen(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

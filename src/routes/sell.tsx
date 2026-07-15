import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buybackPrice, useCurrentUser, useStore, type Condition } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "Sell & rent books — Second Chapter" },
      { name: "description", content: "List books for sale or rent. Manage your prices and inventory." },
    ],
  }),
  component: Sell,
});

const CONDITIONS: Condition[] = ["New", "Like New", "Good", "Fair"];
const CATS = ["Fiction", "Non-fiction", "Textbook", "Science", "Essays"];
const COVERS = ["📖", "📕", "📗", "📘", "📙", "📚", "🕮", "🌾", "🌲", "♾️"];

function Sell() {
  const me = useCurrentUser();
  const { books, addBook, updateBook, removeBook } = useStore();
  const myBooks = books.filter((b) => b.sellerId === me.id && !b.removed);

  if (me.role === "buyer") {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="font-display text-3xl">Sellers only</h1>
        <p className="mt-2 text-muted-foreground">Switch to a seller account from the top-right to list books.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl">Your shelf</h1>
          <p className="mt-1 text-muted-foreground">Manage listings, edit prices, and add new titles.</p>
        </div>
        <NewListingDialog />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active listings" value={myBooks.length.toString()} />
        <StatCard label="Avg price" value={`₹${myBooks.length ? Math.round(myBooks.reduce((a, b) => a + b.price, 0) / myBooks.length) : 0}`} />
        <StatCard label="Est. inventory value" value={`₹${myBooks.reduce((a, b) => a + b.price, 0)}`} />
      </div>

      <div className="mt-8 rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Rent/wk</TableHead>
              <TableHead>Buyback</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myBooks.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{b.cover}</span>
                    <div>
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-muted-foreground">{b.author}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary">{b.condition}</Badge></TableCell>
                <TableCell>₹{b.price}</TableCell>
                <TableCell>{b.rentPerWeek ? `₹${b.rentPerWeek}` : "—"}</TableCell>
                <TableCell className="text-muted-foreground">₹{buybackPrice(b.originalPrice, b.condition)}</TableCell>
                <TableCell className="text-right">
                  <EditListingDialog id={b.id} />
                  <Button size="icon" variant="ghost" onClick={() => { removeBook(b.id); toast("Listing removed"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {myBooks.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No listings yet. Add your first book.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
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

function NewListingDialog() {
  const me = useCurrentUser();
  const { addBook } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", author: "", cover: "📖", price: "", originalPrice: "", rentPerWeek: "",
    condition: "Good" as Condition, category: "Fiction", description: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> New listing</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display text-2xl">List a book</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Author"><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
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
            <Field label="Cover emoji">
              <Select value={form.cover} onValueChange={(v) => setForm({ ...form, cover: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COVERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Description (optional)">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!form.title || !form.author || !form.price || !form.originalPrice) {
                toast.error("Fill title, author, and prices"); return;
              }
              addBook({
                title: form.title, author: form.author, cover: form.cover,
                price: Number(form.price), originalPrice: Number(form.originalPrice),
                rentPerWeek: form.rentPerWeek ? Number(form.rentPerWeek) : undefined,
                condition: form.condition, category: form.category,
                sellerId: me.id, area: me.area,
                description: form.description || undefined,
              });
              toast.success("Listing published");
              setOpen(false);
            }}
          >
            Publish
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit “{b.title}”</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Price (₹)"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Rent / week (₹, blank = not for rent)"><Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} /></Field>
          <Field label="Condition">
            <Select value={cond} onValueChange={(v) => setCond(v as Condition)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            updateBook(id, { price: Number(price), rentPerWeek: rent ? Number(rent) : undefined, condition: cond });
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

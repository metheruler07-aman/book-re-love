import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, ScrollText, Package, Handshake, MapPin, User as UserIcon, ShoppingBag, Wallet } from "lucide-react";
import { useCurrentUser, useStore, type Order, type Book, type Note } from "@/lib/mock-store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PAYMENTS_ENABLED } from "@/lib/feature-flags";

export const Route = createFileRoute("/my-space")({
  head: () => ({
    meta: [
      { title: "My Space — Book Ledger" },
      { name: "description", content: "Your listings, purchases, sales, and profile — all in one place." },
    ],
  }),
  component: MySpace,
});

function MySpace() {
  const me = useCurrentUser();
  const { signedIn, books, notes, orders, updateUser } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!signedIn) {
      toast("Sign in to open My Space");
      navigate({ to: "/auth" });
    }
  }, [signedIn, navigate]);

  const [name, setName] = useState(me.name);
  const [area, setArea] = useState(me.area);
  const [radius, setRadius] = useState<number>(me.radiusKm);
  const [ships, setShips] = useState(me.shipsBeyondRadius);
  useEffect(() => { setName(me.name); setArea(me.area); setRadius(me.radiusKm); setShips(me.shipsBeyondRadius); }, [me.id, me.name, me.area, me.radiusKm, me.shipsBeyondRadius]);

  const myBooks = useMemo(() => books.filter((b) => b.sellerId === me.id && !b.removed), [books, me.id]);
  const myNotes = useMemo(() => notes.filter((n) => n.sellerId === me.id && !n.removed), [notes, me.id]);
  const purchases = useMemo(() => orders.filter((o) => o.buyerId === me.id), [orders, me.id]);
  const sales = useMemo(() => orders.filter((o) => o.sellerId === me.id), [orders, me.id]);

  if (!signedIn) return null;

  const saveProfile = async () => {
    await updateUser(me.id, { name, area, radiusKm: radius, shipsBeyondRadius: ships });
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <UserIcon className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">My Space</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Hello, {me.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Everything of yours in one place — listings, purchases, sales, and profile.
          </p>
        </div>
        <Button asChild variant="outline"><Link to="/sell"><BookOpen className="mr-2 h-4 w-4" /> List a book</Link></Button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard icon={BookOpen} label="Listings" value={String(myBooks.length + myNotes.length)} />
        <StatCard icon={ShoppingBag} label="Purchases" value={String(purchases.length)} />
        <StatCard icon={Handshake} label="Sales" value={String(sales.length)} />
        <StatCard icon={Wallet} label="Est. inventory" value={`₹${myBooks.filter((b) => b.status === "approved").reduce((a, b) => a + b.price, 0)}`} />
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="listings">My Listings ({myBooks.length + myNotes.length})</TabsTrigger>
          <TabsTrigger value="purchases">My Purchases ({purchases.length})</TabsTrigger>
          <TabsTrigger value="sales">My Sales ({sales.length})</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-6 grid gap-6">
          <ListingsBlock title="Books" items={myBooks} kind="book" />
          <ListingsBlock title="Notes" items={myNotes} kind="note" />
          {myBooks.length + myNotes.length === 0 && (
            <Empty label="No listings yet.">
              <Button asChild size="sm" className="mt-3"><Link to="/sell">List your first book</Link></Button>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="purchases" className="mt-6 grid gap-3">
          {purchases.length === 0 && <Empty label="Nothing purchased yet." />}
          {purchases.map((o) => <OrderRow key={o.id} order={o} viewer="buyer" />)}
        </TabsContent>

        <TabsContent value="sales" className="mt-6 grid gap-3">
          {sales.length === 0 && <Empty label="No sales yet." />}
          {sales.map((o) => <OrderRow key={o.id} order={o} viewer="seller" />)}
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <UserIcon className="h-4 w-4" /><h2 className="font-display text-xl">Profile</h2>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Your area / neighborhood</Label>
                <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bandra West, Mumbai" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Self-delivery radius</Label>
                  <span className="font-display text-lg">{radius} km</span>
                </div>
                <Slider value={[radius]} onValueChange={(v) => setRadius(v[0])} min={0} max={30} step={1} />
                <p className="text-xs text-muted-foreground">Distance you're willing to hand-deliver or meet within.</p>
              </div>
              <div className="flex items-start justify-between rounded-md border border-border bg-background/40 p-4">
                <div>
                  <div className="font-medium">Ship beyond radius</div>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    When on, buyers outside your radius can order — they arrange courier off-platform in chat.
                  </p>
                </div>
                <Switch checked={ships} onCheckedChange={setShips} />
              </div>
              <div className="pt-2">
                <Button onClick={saveProfile}>Save profile</Button>
                <Button asChild variant="ghost" className="ml-2"><Link to="/account">Payment methods →</Link></Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
    </div>
  );
}

function Empty({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {label}
      {children}
    </div>
  );
}

function ListingsBlock({ title, items, kind }: { title: string; items: (Book | Note)[]; kind: "book" | "note" }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        {kind === "book" ? <BookOpen className="h-4 w-4 text-muted-foreground" /> : <ScrollText className="h-4 w-4 text-muted-foreground" />}
        <h3 className="font-display text-lg">{title}</h3>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((it) => {
          const isBook = kind === "book";
          const b = it as Book;
          return (
            <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-start gap-3">
                {(it.thumbUrl ?? it.photos[0])
                  ? <img src={(it.thumbUrl ?? it.photos[0])} alt="" className="h-12 w-12 rounded object-cover" />
                  : <div className="grid h-12 w-12 place-items-center rounded bg-secondary text-2xl">{isBook ? b.cover : "📝"}</div>}
                <div>
                  <div className="font-medium">{it.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {isBook ? b.author : (it as Note).course} · ₹{it.price}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ListingStatusBadge status={it.status} />
                {isBook && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/book/$id" params={{ id: it.id }}>Open →</Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ListingStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Badge variant="secondary">Active</Badge>;
  if (status === "pending") return <Badge className="bg-accent text-accent-foreground">Pending approval</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
}

function OrderRow({ order, viewer }: { order: Order; viewer: "buyer" | "seller" }) {
  const { books, users } = useStore();
  const book = books.find((b) => b.id === order.bookId);
  const other = users.find((u) => u.id === (viewer === "buyer" ? order.sellerId : order.buyerId));
  if (!book) return null;
  return (
    <Link
      to="/orders"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 hover:border-accent/50"
    >
      <div className="flex items-start gap-3">
        {(book.thumbUrl ?? book.photos[0])
          ? <img src={(book.thumbUrl ?? book.photos[0])} alt="" className="h-12 w-12 rounded object-cover" />
          : <div className="grid h-12 w-12 place-items-center rounded bg-secondary text-2xl">{book.cover}</div>}
        <div>
          <div className="font-medium">{book.title}</div>
          <div className="text-xs text-muted-foreground">
            {viewer === "buyer" ? "From" : "To"} {other?.name ?? "—"}
            {order.settlement === "direct" || !PAYMENTS_ENABLED
              ? " · Payment arranged directly"
              : ` · ₹${order.amount} · ${order.paymentMethod.toUpperCase()}`}
          </div>
        </div>
      </div>
      <OrderStatusBadge status={order.status} />
    </Link>
  );
}

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; cls: string }> = {
    awaiting_handoff:  { label: "Awaiting handoff",    cls: "bg-primary/10 text-primary border-primary/30" },
    awaiting_delivery: { label: "Awaiting delivery",   cls: "bg-primary/10 text-primary border-primary/30" },
    delivered:         { label: "Delivered",           cls: "bg-accent/15 text-accent border-accent/30" },
    completed:         { label: "Completed",           cls: "bg-secondary text-secondary-foreground" },
    overdue_review:    { label: "Overdue — Review",    cls: "bg-destructive/10 text-destructive border-destructive/30" },
    cancelled:         { label: "Cancelled",           cls: "bg-destructive/10 text-destructive border-destructive/30" },
    arranged_direct:   { label: "Arranged Directly",   cls: "bg-secondary text-secondary-foreground" },
  };
  const M = map[status];
  return <Badge variant="outline" className={`gap-1 border ${M.cls}`}><Package className="h-3 w-3" /> {M.label}</Badge>;
}

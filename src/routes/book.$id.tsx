import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, ShoppingBag, Repeat, HandCoins, Truck, MessageCircle, Phone, CreditCard, QrCode, Wallet, Banknote, Clock, XCircle, Percent } from "lucide-react";
import { toast } from "sonner";
import { buybackPrice, useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChatDialog, CallDialog } from "@/components/chat-call";

export const Route = createFileRoute("/book/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Book — Book Ledger` },
      { name: "description", content: `Listing details for book ${params.id} on Book Ledger.` },
    ],
  }),
  component: BookDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-16 text-center">
      <h1 className="font-display text-3xl">Not on our shelves</h1>
      <p className="mt-2 text-muted-foreground">This listing may have been taken down.</p>
      <Button asChild className="mt-6"><Link to="/browse">Back to browse</Link></Button>
    </div>
  ),
});

function BookDetail() {
  const { id } = Route.useParams();
  const { books, users, commissions, signedIn } = useStore();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const book = books.find((b) => b.id === id && !b.removed);
  if (!book) throw notFound();
  const seller = users.find((u) => u.id === book.sellerId)!;
  const buyback = buybackPrice(book.originalPrice, book.condition);
  const commissionPct = commissions.perListing[book.id] ?? commissions.sale;
  const platformCut = Math.round((book.price * commissionPct) / 100);

  const isOwner = me.id === book.sellerId;
  const isAdmin = me.role === "admin";
  const isVisible = book.status === "approved" || isOwner || isAdmin;

  const [chatOpen, setChatOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const requireAuth = (fn: () => void) => () => {
    if (!signedIn) { toast("Sign in to continue"); navigate({ to: "/auth" }); return; }
    fn();
  };

  const pm = seller.paymentMethods;
  const paymentBadges = [
    pm.upi && { icon: QrCode, label: "UPI / QR" },
    pm.card && { icon: CreditCard, label: "Card" },
    pm.wallet && { icon: Wallet, label: "Wallet" },
    pm.cod && { icon: Banknote, label: "Cash on delivery" },
  ].filter(Boolean) as { icon: typeof QrCode; label: string }[];

  if (!isVisible) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <h1 className="font-display text-3xl">Not on our shelves</h1>
        <p className="mt-2 text-muted-foreground">This listing is awaiting admin review.</p>
        <Button asChild className="mt-6"><Link to="/browse">Back to browse</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/browse" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Browse
      </Link>

      {book.status === "pending" && (
        <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-accent"><Clock className="h-4 w-4" /> Awaiting admin approval</div>
          <p className="mt-1 text-muted-foreground">This listing isn't public yet. It'll go live once admin sets the platform cut and approves it.</p>
        </div>
      )}
      {book.status === "rejected" && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive"><XCircle className="h-4 w-4" /> Rejected by admin</div>
          {book.rejectionNote && <p className="mt-1 text-muted-foreground">Reason: {book.rejectionNote}</p>}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="paper-grain flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary/60 text-[10rem]">
          {book.cover}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{book.category}</Badge>
            <Badge variant="secondary">{book.condition}</Badge>
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight">{book.title}</h1>
          <p className="mt-1 text-lg text-muted-foreground">by {book.author}</p>

          <div className="mt-6 flex items-baseline gap-4">
            <span className="font-display text-4xl font-semibold">₹{book.price}</span>
            <span className="text-sm text-muted-foreground line-through">₹{book.originalPrice}</span>
            {book.rentPerWeek && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary">
                Rent ₹{book.rentPerWeek}/wk
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Percent className="h-3 w-3" /> Platform fee: {commissionPct}% (₹{platformCut}) on sale
          </div>

          {book.description && (
            <p className="mt-6 max-w-prose leading-relaxed text-muted-foreground">{book.description}</p>
          )}

          <div className="mt-6">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Payment accepted</div>
            <div className="flex flex-wrap gap-2">
              {paymentBadges.length === 0 && <span className="text-xs text-muted-foreground">Seller hasn't set methods yet.</span>}
              {paymentBadges.map((p) => (
                <span key={p.label} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-xs">
                  <p.icon className="h-3.5 w-3.5" /> {p.label}
                </span>
              ))}
            </div>
          </div>

          {book.status === "approved" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={requireAuth(() => toast.success("Added to cart", { description: `${book.title} — ₹${book.price}` }))}>
                <ShoppingBag className="mr-2 h-4 w-4" /> Buy now
              </Button>
              {book.rentPerWeek && (
                <Button size="lg" variant="outline" onClick={requireAuth(() => toast("Rental requested", { description: `₹${book.rentPerWeek}/week` }))}>
                  <Repeat className="mr-2 h-4 w-4" /> Rent
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={requireAuth(() => setChatOpen(true))}>
                <MessageCircle className="mr-2 h-4 w-4" /> Chat
              </Button>
              <Button size="lg" variant="outline" onClick={requireAuth(() => setCallOpen(true))}>
                <Phone className="mr-2 h-4 w-4" /> Call
              </Button>
            </div>
          ) : (
            <div className="mt-8 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Buy, rent, chat, and call unlock after admin approves this listing.
            </div>
          )}

          <Separator className="my-8" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" /> Seller
              </div>
              <div className="mt-2 text-sm">{seller.name}</div>
              <div className="text-xs text-muted-foreground">
                {seller.area} · self-delivery {seller.radiusKm} km
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Truck className="h-3 w-3" />
                {seller.shipsBeyondRadius ? "Ships beyond radius (buyer pays courier)" : "Delivery only within radius"}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <HandCoins className="h-4 w-4 text-accent" /> Buyback estimate
              </div>
              <div className="mt-2 font-display text-2xl">₹{buyback}</div>
              <div className="text-xs text-muted-foreground">
                50% of ₹{book.originalPrice}, adjusted for {book.condition.toLowerCase()} condition.
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
              <div className="font-medium text-accent">Admin view</div>
              <div className="text-muted-foreground">
                Commission applied: <span className="font-semibold text-foreground">{commissionPct}%</span> · Platform cut on this listing:{" "}
                <span className="font-semibold text-foreground">₹{platformCut}</span>
                {commissions.perListing[book.id] !== undefined && " (per-listing override)"}
              </div>
            </div>
          )}
        </div>
      </div>

      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} otherId={seller.id} bookId={book.id} />
      <CallDialog open={callOpen} onOpenChange={setCallOpen} otherId={seller.id} />
    </div>
  );
}

import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, ShoppingBag, Repeat, HandCoins, Truck, MessageCircle, CreditCard, QrCode, Wallet, Banknote, Clock, XCircle, Percent, Handshake, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { buybackPrice, useCurrentUser, useStore, type DeliveryMode, type PaymentKey, type Settlement } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChatDialog } from "@/components/chat-call";

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

const PAY_META: Record<PaymentKey, { icon: typeof QrCode; label: string }> = {
  upi:    { icon: QrCode,    label: "UPI / QR" },
  card:   { icon: CreditCard, label: "Card" },
  wallet: { icon: Wallet,    label: "Wallet" },
  cod:    { icon: Banknote,  label: "Cash on delivery" },
};

function BookDetail() {
  const { id } = Route.useParams();
  const { books, users, commissions, signedIn, createOffer, createOrder, sendMessage, platformSettings, activateListingChat } = useStore();
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
  const chatFee = book.chatFee || platformSettings.defaultChatFee;
  const chatOpenable = book.chatActivated && !book.sold;

  const [chatOpen, setChatOpen] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [checkoutKind, setCheckoutKind] = useState<"buy" | "rent" | null>(null);
  const [bargainOpen, setBargainOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const requireAuth = (fn: () => void) => () => {
    if (!signedIn) { toast("Sign in to continue"); navigate({ to: "/auth" }); return; }
    fn();
  };

  const paymentBadges = (Object.keys(PAY_META) as PaymentKey[])
    .filter((k) => seller.paymentMethods[k])
    .map((k) => ({ key: k, ...PAY_META[k] }));

  const hero = book.photos[heroIdx] ?? book.photos[0];

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
          <p className="mt-1 text-muted-foreground">This listing isn't public yet.</p>
        </div>
      )}
      {book.status === "rejected" && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-destructive"><XCircle className="h-4 w-4" /> Rejected by admin</div>
          {book.rejectionNote && <p className="mt-1 text-muted-foreground">Reason: {book.rejectionNote}</p>}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="paper-grain flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/60 text-[10rem]">
            {hero
              ? <img src={hero} alt={book.title} className="h-full w-full object-cover" />
              : book.cover}
          </div>
          {book.photos.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {book.photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className={`aspect-square overflow-hidden rounded border ${i === heroIdx ? "border-primary" : "border-border"}`}
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
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

          <div className="mt-4">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Delivery</div>
            <div className="mb-2 flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{seller.area || "Area not set"}</span>
              <span className="text-muted-foreground">· seller's general area</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {book.deliveryOptions.selfDeliver && <Badge variant="secondary" className="gap-1"><Truck className="h-3 w-3" /> Self-delivery within {seller.radiusKm} km</Badge>}
              {book.deliveryOptions.courier    && <Badge variant="secondary" className="gap-1"><Truck className="h-3 w-3" /> Courier (arranged in chat, buyer pays)</Badge>}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Escrow orders must be delivered within {book.deliveryDeadlineDays} days.
            </div>
          </div>

          {isOwner && book.status === "approved" && (
            <div className="mt-6 rounded-lg border border-border bg-card p-4">
              {book.chatActivated ? (
                <div className="flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="h-4 w-4" /> Chat is active for this listing.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lock className="h-4 w-4 text-primary" /> Chat is locked for this listing
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pay a one-time platform commission of ₹{chatFee} to let buyers chat with you about this book — whether or not it sells.
                  </p>
                  <Button className="mt-3" onClick={() => setActivateOpen(true)}>
                    Activate chat for this listing · ₹{chatFee}
                  </Button>
                </>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {book.sold ? "Marked sold — chat is closed." : "Mark the book sold from My Space to close chat."}
              </div>
            </div>
          )}

          {book.status === "approved" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={book.sold} onClick={requireAuth(() => setCheckoutKind("buy"))}>
                <ShoppingBag className="mr-2 h-4 w-4" /> Buy now
              </Button>
              {book.rentPerWeek && (
                <Button size="lg" variant="outline" disabled={book.sold} onClick={requireAuth(() => setCheckoutKind("rent"))}>
                  <Repeat className="mr-2 h-4 w-4" /> Rent
                </Button>
              )}
              <Button size="lg" variant="outline" disabled={book.sold} onClick={requireAuth(() => setBargainOpen(true))}>
                <Handshake className="mr-2 h-4 w-4" /> Make an offer
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={!chatOpenable}
                onClick={requireAuth(() => setChatOpen(true))}
              >
                {chatOpenable ? <MessageCircle className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                {book.sold ? "Chat closed (sold)" : chatOpenable ? "Chat" : "Chat not activated"}
              </Button>
            </div>
          ) : (
            <div className="mt-8 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Buy, rent, and chat unlock after admin approves this listing.
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
        </div>
      </div>

      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} otherId={seller.id} bookId={book.id} />

      <BargainDialog
        open={bargainOpen}
        onOpenChange={setBargainOpen}
        listedPrice={book.price}
        onSubmit={(amt, msg) => {
          createOffer(book.id, amt, msg);
          toast.success("Offer sent", { description: `₹${amt} — waiting for seller` });
        }}
      />

      <ActivateChatDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        fee={chatFee}
        upiId={platformSettings.ownerUpiId}
        bookTitle={book.title}
        onPaid={async () => {
          await activateListingChat(book.id);
          setActivateOpen(false);
          toast.success("Chat activated", { description: "Buyers can now message you about this listing." });
        }}
      />

      {checkoutKind && (
        <CheckoutDialog
          open={!!checkoutKind}
          onOpenChange={(v) => !v && setCheckoutKind(null)}
          kind={checkoutKind}
          book={book}
          seller={seller}
          chatActivated={!!book.chatActivated}
          onConfirm={async ({ paymentMethod, deliveryMode, rentalWeeks, amount, settlement }) => {
            const order = await createOrder({
              bookId: book.id, kind: checkoutKind, rentalWeeks, amount, paymentMethod, deliveryMode, settlement,
            });
            setCheckoutKind(null);
            if (settlement === "direct") {
              await sendMessage(seller.id, `Hi ${seller.name} — I'd like to settle order ${order.id.slice(-4)} directly with you. Let's fix the amount and handover.`, book.id);
              toast.success("Marked as arranged directly", { description: "No platform payment collected — settle with the seller." });
              navigate({ to: "/orders" });
              return;
            }
            if (deliveryMode === "courier") {
              await sendMessage(seller.id, `Hi ${seller.name} — order ${order.id.slice(-4)} placed. Let's arrange courier: my address and any preferred courier? (Buyer pays courier.)`, book.id);
              toast.success("Order placed", { description: "Chat opened to arrange courier." });
              navigate({ to: "/orders" });
            } else {
              toast.success("Order placed", { description: "Check /orders for your handoff code." });
              navigate({ to: "/orders" });
            }
          }}
        />
      )}
    </div>
  );
}

function BargainDialog({ open, onOpenChange, listedPrice, onSubmit }: {
  open: boolean; onOpenChange: (v: boolean) => void; listedPrice: number;
  onSubmit: (amount: number, msg?: string) => void;
}) {
  const [amt, setAmt] = useState(String(Math.max(1, Math.round(listedPrice * 0.85))));
  const [msg, setMsg] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Make an offer</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="text-xs text-muted-foreground">Listed at ₹{listedPrice}. Seller may accept, decline, or counter.</div>
          <div className="grid gap-1.5"><Label className="text-xs">Your offer (₹)</Label><Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Note to seller (optional)</Label><Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            const n = Number(amt);
            if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
            onSubmit(n, msg || undefined);
            onOpenChange(false);
          }}>Send offer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActivateChatDialog({ open, onOpenChange, fee, upiId, bookTitle, onPaid }: {
  open: boolean; onOpenChange: (v: boolean) => void; fee: number; upiId: string;
  bookTitle: string; onPaid: () => void;
}) {
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId || "owner@upi")}&pn=Book%20Ledger&am=${fee}&cu=INR&tn=${encodeURIComponent(`Chat activation: ${bookTitle}`)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display">Activate chat · ₹{fee}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 text-center">
          <img src={qrSrc} alt={`UPI QR code to pay ₹${fee} chat activation fee`} className="mx-auto h-52 w-52 rounded-md border border-border bg-card p-2" />
          <div className="text-sm">
            Pay ₹{fee} to <span className="font-medium">{upiId || "the owner's UPI ID"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            One-time platform commission for this listing — separate from any sale, whether or not the book sells.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onPaid}>Mark as Paid</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckoutDialog({
  open, onOpenChange, kind, book, seller, chatActivated, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: "buy" | "rent";
  book: ReturnType<typeof useStore>["books"][number];
  seller: ReturnType<typeof useStore>["users"][number];
  chatActivated: boolean;
  onConfirm: (v: { paymentMethod: PaymentKey; deliveryMode: DeliveryMode; rentalWeeks?: number; amount: number; settlement: Settlement }) => void;
}) {
  const availableMethods = (Object.keys(PAY_META) as PaymentKey[]).filter((k) => seller.paymentMethods[k]);
  const availableDelivery: DeliveryMode[] = [
    book.deliveryOptions.selfDeliver ? "self" : null,
    book.deliveryOptions.courier ? "courier" : null,
  ].filter(Boolean) as DeliveryMode[];

  const [pay, setPay] = useState<PaymentKey | "">(availableMethods[0] ?? "");
  const [mode, setMode] = useState<DeliveryMode | "">(availableDelivery[0] ?? "");
  const [weeks, setWeeks] = useState<number>(1);
  const [settlement, setSettlement] = useState<Settlement>("escrow");

  const amount = useMemo(() => {
    if (kind === "buy") return book.price;
    return (book.rentPerWeek ?? 0) * weeks;
  }, [kind, book, weeks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{kind === "buy" ? "Checkout" : "Rent book"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">How would you like to pay?</Label>
            <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Seller's area: {seller.area || "not set"}
            </div>
            <RadioGroup value={settlement} onValueChange={(v) => setSettlement(v as Settlement)} className="grid gap-2">
              <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                <RadioGroupItem value="escrow" />
                <div>
                  <div className="font-medium">Pay via app (Razorpay escrow)</div>
                  <div className="text-xs text-muted-foreground">
                    Money is held until handoff is confirmed. Seller must deliver within {book.deliveryDeadlineDays} days.
                  </div>
                </div>
              </label>
              <label className={`flex items-start gap-2 rounded-md border border-border p-3 text-sm ${chatActivated ? "" : "opacity-60"}`}>
                <RadioGroupItem value="direct" disabled={!chatActivated} />
                <div>
                  <div className="font-medium">Pay directly to seller</div>
                  <div className="text-xs text-muted-foreground">
                    {chatActivated
                      ? "Settled outside the app. No escrow tracking — marked \"Buyer & Seller Arranged Directly\"."
                      : "Available once the seller activates chat for this listing."}
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>


          {kind === "rent" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Rental duration (weeks)</Label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 6, 8].map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeeks(w)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${weeks === w ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {w} wk
                  </button>
                ))}
                <Input type="number" min={1} value={weeks} onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))} className="w-24" />
              </div>
              <div className="text-xs text-muted-foreground">₹{book.rentPerWeek}/wk × {weeks} wk</div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs">Delivery</Label>
            {availableDelivery.length === 0 ? (
              <div className="text-xs text-destructive">Seller hasn't set a delivery method.</div>
            ) : (
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as DeliveryMode)} className="grid gap-2">
                {availableDelivery.includes("self") && (
                  <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                    <RadioGroupItem value="self" />
                    <div>
                      <div className="font-medium">Self-delivery within {seller.radiusKm} km</div>
                      <div className="text-xs text-muted-foreground">Seller hands the book to you in person. You'll get a 4-digit code to give at handoff.</div>
                    </div>
                  </label>
                )}
                {availableDelivery.includes("courier") && (
                  <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                    <RadioGroupItem value="courier" />
                    <div>
                      <div className="font-medium">Courier (arranged in chat)</div>
                      <div className="text-xs text-muted-foreground">You and seller exchange address in chat. Buyer pays courier. Confirm receipt with a photo.</div>
                    </div>
                  </label>
                )}
              </RadioGroup>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Payment method (seller's accepted)</Label>
            {availableMethods.length === 0 ? (
              <div className="text-xs text-destructive">Seller hasn't set any payment methods.</div>
            ) : (
              <RadioGroup value={pay} onValueChange={(v) => setPay(v as PaymentKey)} className="grid grid-cols-2 gap-2">
                {availableMethods.map((k) => {
                  const M = PAY_META[k];
                  return (
                    <label key={k} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                      <RadioGroupItem value={k} />
                      <M.icon className="h-4 w-4" /> {M.label}
                    </label>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          <div className="rounded-md bg-secondary/60 p-3 text-sm">
            Total: <span className="font-display text-xl">₹{amount}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!pay || !mode) { toast.error("Pick delivery and payment"); return; }
              onConfirm({ paymentMethod: pay, deliveryMode: mode, rentalWeeks: kind === "rent" ? weeks : undefined, amount });
            }}
          >
            Place order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
      }

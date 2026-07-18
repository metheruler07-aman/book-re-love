import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock, ImagePlus, KeyRound, MessageCircle, Package, Truck } from "lucide-react";
import { filesToDataUrls, useCurrentUser, useStore, type Order } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChatDialog } from "@/components/chat-call";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — Book Ledger" },
      { name: "description", content: "Track your Book Ledger orders: handoff codes, courier coordination, and receipts." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const me = useCurrentUser();
  const { signedIn, orders } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!signedIn) { toast("Sign in to view orders"); navigate({ to: "/auth" }); }
  }, [signedIn, navigate]);
  if (!signedIn) return null;

  const buying = orders.filter((o) => o.buyerId === me.id);
  const selling = orders.filter((o) => o.sellerId === me.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Orders</h1>
      <p className="mt-1 text-muted-foreground">Handoff codes, courier coordination, and delivery confirmations.</p>

      <Tabs defaultValue="buying" className="mt-6">
        <TabsList>
          <TabsTrigger value="buying">Buying ({buying.length})</TabsTrigger>
          <TabsTrigger value="selling">Selling ({selling.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="buying" className="mt-4 grid gap-4">
          {buying.length === 0 && <Empty label="No orders yet." />}
          {buying.map((o) => <OrderCard key={o.id} order={o} viewer="buyer" />)}
        </TabsContent>
        <TabsContent value="selling" className="mt-4 grid gap-4">
          {selling.length === 0 && <Empty label="No incoming orders yet." />}
          {selling.map((o) => <OrderCard key={o.id} order={o} viewer="seller" />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{label}</div>;
}

function OrderCard({ order, viewer }: { order: Order; viewer: "buyer" | "seller" }) {
  const { books, users, confirmHandoff, confirmReceived, sendMessage } = useStore();
  const book = books.find((b) => b.id === order.bookId);
  const other = users.find((u) => u.id === (viewer === "buyer" ? order.sellerId : order.buyerId));
  const [code, setCode] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [photo, setPhoto] = useState<string>("");

  if (!book || !other) return null;

  const status = order.status;
  const isDelivered = status === "delivered";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {book.photos[0]
            ? <img src={book.photos[0]} alt="" className="h-16 w-16 rounded object-cover" />
            : <div className="grid h-16 w-16 place-items-center rounded bg-secondary text-3xl">{book.cover}</div>}
          <div>
            <div className="font-display text-lg leading-tight">{book.title}</div>
            <div className="text-xs text-muted-foreground">
              {order.kind === "rent" ? `Rent · ${order.rentalWeeks} wk` : "Purchase"} · ₹{order.amount} · {order.paymentMethod.toUpperCase()}
            </div>
            <div className="text-xs text-muted-foreground">
              {viewer === "buyer" ? "Seller" : "Buyer"}: {other.name} · Order #{order.id.slice(-4)}
            </div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          {order.deliveryMode === "self" ? <><Package className="h-4 w-4" /> Self-delivery handoff</> : <><Truck className="h-4 w-4" /> Courier — arranged in chat</>}
        </div>

        {order.deliveryMode === "self" && !isDelivered && viewer === "buyer" && (
          <div className="mt-3 flex items-center gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Show this code at handoff</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-3xl tracking-widest text-accent">
                <KeyRound className="h-5 w-5" /> {order.handoffCode}
              </div>
            </div>
          </div>
        )}

        {order.deliveryMode === "self" && !isDelivered && viewer === "seller" && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Enter buyer's 4-digit code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-32 font-mono text-lg tracking-widest" />
            </div>
            <Button onClick={async () => {
              const r = await confirmHandoff(order.id, code);
              if (r.ok) toast.success("Handoff confirmed — marked as delivered");
              else toast.error("Code doesn't match");
            }}>Confirm handoff</Button>
          </div>
        )}

        {order.deliveryMode === "courier" && !isDelivered && (
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
            <div>Exchange address and delivery details in chat. Book Ledger doesn't calculate shipping.</div>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => {
              const otherId = viewer === "buyer" ? order.sellerId : order.buyerId;
              sendMessage(otherId, `About order #${order.id.slice(-4)} for "${book.title}" — let's coordinate courier. Sharing address and preferred courier here.`, book.id);
              setChatOpen(true);
            }}>
              <MessageCircle className="mr-2 h-4 w-4" /> Open chat with note
            </Button>

            {viewer === "buyer" && (
              <div className="mt-3 grid gap-2 rounded-md border border-border bg-background/60 p-3">
                <div className="text-sm font-medium text-foreground">Confirm you received the package</div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs hover:bg-secondary/60">
                    <ImagePlus className="h-4 w-4" /> {photo ? "Change photo" : "Upload photo"}
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      if (!e.target.files?.length) return;
                      const [url] = await filesToDataUrls(e.target.files);
                      setPhoto(url);
                    }} />
                  </label>
                  {photo && <img src={photo} alt="" className="h-12 w-12 rounded object-cover" />}
                  <Button size="sm" disabled={!photo} onClick={() => {
                    confirmReceived(order.id, photo);
                    toast.success("Delivery confirmed. Thanks!");
                  }}>
                    Confirm received
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {isDelivered && (
          <div className="mt-3 flex items-center gap-2 text-sm text-accent">
            <CheckCircle2 className="h-4 w-4" /> Marked delivered
            {order.receivedPhoto && <img src={order.receivedPhoto} alt="" className="ml-2 h-12 w-12 rounded object-cover" />}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs">
        <Link to="/book/$id" params={{ id: book.id }} className="text-muted-foreground hover:text-foreground">View listing →</Link>
      </div>

      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} otherId={viewer === "buyer" ? order.sellerId : order.buyerId} bookId={book.id} />
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; cls: string; icon: typeof Clock }> = {
    awaiting_handoff:  { label: "Awaiting handoff",  cls: "bg-accent/15 text-accent border-accent/30",       icon: Clock },
    awaiting_delivery: { label: "Awaiting delivery", cls: "bg-primary/10 text-primary border-primary/30",    icon: Truck },
    delivered:         { label: "Delivered",         cls: "bg-secondary text-secondary-foreground",          icon: CheckCircle2 },
    completed:         { label: "Completed",         cls: "bg-secondary text-secondary-foreground",          icon: CheckCircle2 },
    overdue_review:    { label: "Overdue — review",  cls: "bg-destructive/10 text-destructive border-destructive/30", icon: Clock },
    cancelled:         { label: "Cancelled",         cls: "bg-destructive/10 text-destructive border-destructive/30", icon: Clock },
  };
  const M = map[status];
  return (
    <Badge variant="outline" className={`gap-1 border ${M.cls}`}>
      <M.icon className="h-3 w-3" /> {M.label}
    </Badge>
  );
}

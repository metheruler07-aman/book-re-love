import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Truck, CreditCard, QrCode, Wallet, Banknote } from "lucide-react";
import { useCurrentUser, useStore, type PaymentMethods } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — Book Ledger" },
      { name: "description", content: "Manage your area, self-delivery radius, shipping, and accepted payment methods." },
    ],
  }),
  component: Account,
});

function Account() {
  const me = useCurrentUser();
  const { signedIn, updateUser } = useStore();
  const navigate = useNavigate();
  const [area, setArea] = useState(me.area);
  const [radius, setRadius] = useState<number>(me.radiusKm);
  const [ships, setShips] = useState(me.shipsBeyondRadius);
  const [pm, setPm] = useState<PaymentMethods>(me.paymentMethods);

  useEffect(() => {
    if (!signedIn) { toast("Sign in to manage your account"); navigate({ to: "/auth" }); }
  }, [signedIn, navigate]);

  if (!signedIn) return null;

  const save = () => {
    updateUser(me.id, { area, radiusKm: radius, shipsBeyondRadius: ships, paymentMethods: pm });
    toast.success("Preferences saved");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-4xl">Your account</h1>
        <p className="mt-1 text-muted-foreground">Signed in as {me.name} · <Badge variant="outline" className="capitalize">{me.role}</Badge></p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" /><h2 className="font-display text-xl">Location & delivery</h2>
        </div>
        <div className="mt-6 grid gap-6">
          <div className="grid gap-1.5">
            <Label className="text-sm">Your area / neighborhood</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Bandra West, Mumbai" />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Self-delivery radius</Label>
              <span className="font-display text-lg">{radius} km</span>
            </div>
            <Slider value={[radius]} onValueChange={(v) => setRadius(v[0])} min={0} max={30} step={1} />
            <p className="text-xs text-muted-foreground">Distance you're willing to hand-deliver or meet within.</p>
          </div>

          <div className="flex items-start justify-between rounded-md border border-border bg-background/40 p-4">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Truck className="h-4 w-4" /> Ship beyond radius
              </div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                When on, buyers outside your radius can order — they pay the courier fee at checkout.
              </p>
            </div>
            <Switch checked={ships} onCheckedChange={setShips} />
          </div>
        </div>
      </section>

      {(me.role === "seller" || me.role === "admin") && (
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="h-4 w-4" /><h2 className="font-display text-xl">Payment methods you accept</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Buyers see these on your listings. Platform commission is deducted automatically.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MethodRow icon={QrCode} label="UPI / QR" desc="Instant online transfer" checked={pm.upi} onChange={(v) => setPm({ ...pm, upi: v })} />
            <MethodRow icon={CreditCard} label="Card / net-banking" desc="Visa, Mastercard, RuPay" checked={pm.card} onChange={(v) => setPm({ ...pm, card: v })} />
            <MethodRow icon={Wallet} label="Wallet" desc="Paytm, PhonePe, GPay balance" checked={pm.wallet} onChange={(v) => setPm({ ...pm, wallet: v })} />
            <MethodRow icon={Banknote} label="Cash on delivery" desc="Buyer pays at handoff" checked={pm.cod} onChange={(v) => setPm({ ...pm, cod: v })} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: even for COD, the platform commission applies to every completed transaction.
          </p>
        </section>
      )}

      <div className="mt-6">
        <Button onClick={save}>Save changes</Button>
      </div>
    </div>
  );
}

function MethodRow({
  icon: Icon, label, desc, checked, onChange,
}: { icon: typeof CreditCard; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

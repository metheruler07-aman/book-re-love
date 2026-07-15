import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Truck } from "lucide-react";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — Second Chapter" },
      { name: "description", content: "Manage your area, self-delivery radius, and shipping preferences." },
    ],
  }),
  component: Account,
});

function Account() {
  const me = useCurrentUser();
  const { updateUser } = useStore();
  const [area, setArea] = useState(me.area);
  const [radius, setRadius] = useState<number>(me.radiusKm);
  const [ships, setShips] = useState(me.shipsBeyondRadius);

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
        <p className="mt-1 text-sm text-muted-foreground">
          We use your area to surface listings from nearby readers first.
        </p>

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

          {(me.role === "seller" || me.role === "admin") && (
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
          )}

          <div>
            <Button onClick={() => {
              updateUser(me.id, { area, radiusKm: radius, shipsBeyondRadius: ships });
              toast.success("Preferences saved");
            }}>
              Save changes
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Use the account switcher in the top-right to explore the marketplace as a buyer, seller, or admin.
      </section>
    </div>
  );
}

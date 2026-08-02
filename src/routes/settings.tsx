import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User as UserIcon, MapPin, Bell, LogOut, Trash2, Lock } from "lucide-react";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { HowItWorks } from "@/components/how-it-works";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Book Ledger" },
      { name: "description", content: "Update your name, contact details, delivery radius and notification preferences on Book Ledger." },
      { property: "og:title", content: "Settings — Book Ledger" },
      { property: "og:description", content: "Manage your Book Ledger account details, delivery radius and notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const me = useCurrentUser();
  const { signedIn, updateUser, signOut, requestAccountDeletion } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? "");
  const [address, setAddress] = useState(me.address ?? "");
  const [area, setArea] = useState(me.area);
  const [radius, setRadius] = useState<number>(me.radiusKm);
  const [notif, setNotif] = useState(me.notificationsEnabled !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!signedIn) { toast("Sign in to open settings"); navigate({ to: "/auth" }); }
  }, [signedIn, navigate]);

  useEffect(() => {
    setName(me.name); setPhone(me.phone ?? ""); setAddress(me.address ?? "");
    setArea(me.area); setRadius(me.radiusKm);
    setNotif(me.notificationsEnabled !== false);
  }, [me.id, me.name, me.phone, me.address, me.area, me.radiusKm, me.notificationsEnabled]);

  if (!signedIn) return null;

  const save = async () => {
    if (!name.trim()) { toast.error("Name can't be empty"); return; }
    setSaving(true);
    try {
      await updateUser(me.id, {
        name: name.trim(), phone: phone.trim(), address: address.trim(),
        area: area.trim(), radiusKm: radius, notificationsEnabled: notif,
      });
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const doDelete = async () => {
    await requestAccountDeletion();
    toast.success("Deletion request sent to the admin team for review");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Your account details, delivery reach and preferences.</p>
      </header>

      <HowItWorks
        summary="What lives here and who can see it"
        points={[
          "Your name and area are shown to other members on your listings.",
          "Your phone number and address are private — only the admin team can see them, never other users.",
          "Delivery radius controls how far you're willing to hand-deliver; it applies to every listing you create.",
          "Turning notifications off stops the in-app bell alerts, but orders and messages still arrive.",
          "Account deletion is a request — an admin reviews it before anything is removed.",
        ]}
      />

      {/* Account info */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <UserIcon className="h-4 w-4" /><h2 className="font-display text-xl">Account info</h2>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Your full name" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-phone">Phone number</Label>
            <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" placeholder="e.g. +91 98765 43210" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-address">Exact address</Label>
            <Textarea id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={400} rows={3} placeholder="Flat / street / landmark / city / PIN" />
          </div>
          <p className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Phone and address are stored privately and shown only to admins — other members never see them.
          </p>
        </div>
      </section>

      {/* Delivery radius */}
      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" /><h2 className="font-display text-xl">Delivery radius</h2>
        </div>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="s-area">Your area / neighborhood</Label>
            <Input id="s-area" value={area} onChange={(e) => setArea(e.target.value)} maxLength={80} placeholder="e.g. Bandra West, Mumbai" />
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Self-delivery radius</Label>
              <span className="font-display text-lg">{radius} km</span>
            </div>
            <Slider value={[radius]} onValueChange={(v) => setRadius(v[0])} min={0} max={30} step={1} />
            <p className="text-xs text-muted-foreground">
              Adjust it any time here — you no longer have to set it while creating a listing.
            </p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <Bell className="h-4 w-4" /><h2 className="font-display text-xl">Notification preferences</h2>
        </div>
        <div className="mt-5 flex items-start justify-between rounded-md border border-border bg-background/40 p-4">
          <div>
            <div className="font-medium">In-app notifications</div>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Bell alerts for listing approvals, orders, messages and upvotes.
            </p>
          </div>
          <Switch checked={notif} onCheckedChange={setNotif} aria-label="In-app notifications" />
        </div>
      </section>

      <div className="mt-6">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </div>

      {/* Session & account */}
      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl">Session & account</h2>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={doLogout} className="sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={me.deletionRequested}>
                <Trash2 className="mr-2 h-4 w-4" />
                {me.deletionRequested ? "Deletion requested" : "Request account deletion"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account is not deleted right away. It's flagged for admin review so any
                  open orders, buybacks or disputes can be settled first. An admin will contact
                  you before removing your data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={doDelete}>Send request</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {me.deletionRequested && (
          <p className="mt-3 text-sm text-muted-foreground">
            Your deletion request is pending admin review.
          </p>
        )}
      </section>
    </div>
  );
}

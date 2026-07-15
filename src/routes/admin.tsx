import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shield, Ban, Trash2, Percent } from "lucide-react";
import { useCurrentUser, useStore, type Commissions } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Second Chapter" },
      { name: "description", content: "Admin controls for commissions, listings, and accounts." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const me = useCurrentUser();
  if (me.role !== "admin") {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl">Admins only</h1>
        <p className="mt-2 text-muted-foreground">Switch to “Admin Sam” from the top-right to explore this area.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Shield className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Admin</span>
        </div>
        <h1 className="mt-2 font-display text-4xl">Marketplace controls</h1>
        <p className="mt-1 text-muted-foreground">Commissions, listings, and account moderation.</p>
      </header>

      <Tabs defaultValue="commissions">
        <TabsList>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="mt-6"><CommissionsPanel /></TabsContent>
        <TabsContent value="listings" className="mt-6"><ListingsPanel /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function CommissionsPanel() {
  const { commissions, setCommission, books, setListingCommission } = useStore();
  const rows: Array<{ key: keyof Omit<Commissions, "perListing">; label: string }> = [
    { key: "sale", label: "Sale" },
    { key: "rental", label: "Rental" },
    { key: "buyback", label: "Buyback" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-accent" /><h2 className="font-display text-xl">Category commissions</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Only admins can change these.</p>
        <div className="mt-6 space-y-4">
          {rows.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[1fr_120px] items-center gap-4">
              <Label className="text-sm">{label}</Label>
              <div className="relative">
                <Input
                  type="number" min={0} max={100}
                  value={commissions[key]}
                  onChange={(e) => setCommission(key, Number(e.target.value))}
                  className="pr-7"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
          <Button onClick={() => toast.success("Commissions saved")}>Save</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl">Per-listing overrides</h2>
        <p className="mt-1 text-sm text-muted-foreground">Override the sale commission for a specific listing.</p>
        <div className="mt-4 space-y-2">
          {books.filter((b) => !b.removed).map((b) => {
            const val = commissions.perListing[b.id];
            return (
              <div key={b.id} className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                <span className="text-lg">{b.cover}</span>
                <div className="flex-1 truncate text-sm">{b.title}</div>
                <Input
                  type="number" placeholder={`${commissions.sale}%`} className="w-24"
                  value={val ?? ""} min={0} max={100}
                  onChange={(e) => setListingCommission(b.id, e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListingsPanel() {
  const { books, users, removeBook } = useStore();
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((b) => {
            const seller = users.find((u) => u.id === b.sellerId);
            return (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{b.cover}</span>
                    <span className="font-medium">{b.title}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{seller?.name}</TableCell>
                <TableCell>₹{b.price}</TableCell>
                <TableCell>{b.removed ? <Badge variant="destructive">Removed</Badge> : <Badge variant="secondary">Live</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm" variant="ghost" disabled={b.removed}
                    onClick={() => { removeBook(b.id); toast("Listing removed"); }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Remove
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function UsersPanel() {
  const { users, blockUser } = useStore();
  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.name}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{u.area}</TableCell>
              <TableCell>{u.blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="secondary">Active</Badge>}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm" variant={u.blocked ? "outline" : "ghost"}
                  disabled={u.role === "admin"}
                  onClick={() => { blockUser(u.id, !u.blocked); toast(u.blocked ? "Account unblocked" : "Account blocked"); }}
                >
                  <Ban className="mr-1 h-3 w-3" /> {u.blocked ? "Unblock" : "Block"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

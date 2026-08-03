import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Ban, Trash2, Percent, Check, X, MessageSquare, CheckCircle2 } from "lucide-react";
import { useCurrentUser, useStore, type Commissions } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Book Ledger" },
      { name: "description", content: "Admin controls for approvals, commissions, listings, queries, and accounts." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const me = useCurrentUser();
  const { books, notes, queries } = useStore();
  const pendingCount = books.filter((b) => b.status === "pending" && !b.removed).length
    + notes.filter((n) => n.status === "pending" && !n.removed).length;
  const openQueries = queries.filter((q) => q.status === "open").length;

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
          <Shield className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Admin console</span>
        </div>
        <h1 className="mt-2 font-display text-4xl">Marketplace controls</h1>
        <p className="mt-1 text-muted-foreground">Approve listings, fix each book's cut, moderate accounts, and answer queries.</p>
      </header>

      <Tabs defaultValue="approvals">
        <TabsList className="flex-wrap">
          <TabsTrigger value="approvals">
            Approvals {pendingCount > 0 && <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="queries">
            Queries {openQueries > 0 && <Badge variant="destructive" className="ml-2">{openQueries}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-6"><ApprovalsPanel /></TabsContent>
        <TabsContent value="commissions" className="mt-6"><CommissionsPanel /></TabsContent>
        <TabsContent value="listings" className="mt-6"><ListingsPanel /></TabsContent>
        <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
        <TabsContent value="queries" className="mt-6"><QueriesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalsPanel() {
  const { books, notes, users, commissions, approveBook, rejectBook, approveNote, rejectNote } = useStore();
  const pendingBooks = books.filter((b) => b.status === "pending" && !b.removed);
  const pendingNotes = notes.filter((n) => n.status === "pending" && !n.removed);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-2xl">Pending book listings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Type the exact ₹ commission for each listing, then approve. Rejected listings stay hidden.</p>
        <div className="mt-4 space-y-3">
          {pendingBooks.length === 0 && <EmptyRow label="No books waiting for approval." />}
          {pendingBooks.map((b) => (
            <PendingBookRow
              key={b.id}
              book={b}
              sellerName={users.find((u) => u.id === b.sellerId)?.name ?? "Unknown"}
              onApprove={(cut) => { approveBook(b.id, cut); toast.success(`Approved "${b.title}" at ₹${cut}`); }}
              onReject={(note) => { rejectBook(b.id, note); toast(`Rejected "${b.title}"`); }}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Pending notes</h2>
        <div className="mt-4 space-y-3">
          {pendingNotes.length === 0 && <EmptyRow label="No notes waiting for approval." />}
          {pendingNotes.map((n) => (
            <PendingNoteRow
              key={n.id}
              note={n}
              sellerName={users.find((u) => u.id === n.sellerId)?.name ?? "Unknown"}
              onApprove={(cut) => { approveNote(n.id, cut); toast.success(`Approved "${n.title}" at ₹${cut}`); }}
              onReject={(note) => { rejectNote(n.id, note); toast(`Rejected "${n.title}"`); }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{label}</div>;
}

function PendingBookRow({ book, sellerName, onApprove, onReject }: {
  book: { id: string; title: string; author: string; cover: string; price: number; condition: string; description?: string };
  sellerName: string;
  onApprove: (cut: number) => void;
  onReject: (note?: string) => void;
}) {
  const [cut, setCut] = useState<string>("");
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const cutNum = Number(cut);
  const valid = cut !== "" && !Number.isNaN(cutNum) && cutNum >= 0 && cutNum <= book.price;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-md bg-secondary/60 text-3xl">{book.cover}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg leading-tight">{book.title}</div>
          <div className="text-xs text-muted-foreground">by {book.author} · seller {sellerName} · {book.condition} · ₹{book.price}</div>
          {book.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{book.description}</p>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Commission amount (₹)</Label>
          <div className="relative w-36">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
            <Input type="number" min={0} max={book.price} placeholder="0" value={cut} onChange={(e) => setCut(e.target.value)} className="pl-7" />
          </div>
        </div>
        <Button
          disabled={!valid}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => onApprove(cutNum)}
        >
          <Check className="mr-2 h-4 w-4" /> Approve & publish
        </Button>
        <Button variant="ghost" onClick={() => setShowReject((s) => !s)}>
          <X className="mr-2 h-4 w-4" /> Reject
        </Button>
      </div>
      {showReject && (
        <div className="mt-3 grid gap-2">
          <Textarea rows={2} placeholder="Reason (optional, shown to seller)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <div>
            <Button size="sm" variant="destructive" onClick={() => onReject(rejectNote || undefined)}>Confirm reject</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingNoteRow({ note, sellerName, onApprove, onReject }: {
  note: { id: string; title: string; course: string; price: number; pages: number; isDigital: boolean };
  sellerName: string;
  onApprove: (cut: number) => void;
  onReject: (note?: string) => void;
}) {
  const [cut, setCut] = useState<string>("");
  const cutNum = Number(cut);
  const valid = cut !== "" && !Number.isNaN(cutNum) && cutNum >= 0 && cutNum <= note.price;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg leading-tight">{note.title}</div>
          <div className="text-xs text-muted-foreground">{note.course} · {note.pages} pages · {note.isDigital ? "Online PDF" : "Printed"} · seller {sellerName} · ₹{note.price}</div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-32">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
            <Input type="number" min={0} max={note.price} placeholder="0" value={cut} onChange={(e) => setCut(e.target.value)} className="pl-7" />
          </div>
          <Button disabled={!valid} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => onApprove(cutNum)}>
            <Check className="mr-2 h-3 w-3" /> Approve
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReject()}>
            <X className="mr-2 h-3 w-3" /> Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommissionsPanel() {
  const { commissions, setCommission, books, setListingCommission } = useStore();
  const rows: Array<{ key: keyof Omit<Commissions, "perListing" | "perNote">; label: string }> = [
    { key: "sale", label: "Sale (default)" },
    { key: "rental", label: "Rental" },
    { key: "buyback", label: "Buyback" },
    { key: "notes", label: "Notes (default)" },
  ];

  const approved = books.filter((b) => b.status === "approved" && !b.removed);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-accent" /><h2 className="font-display text-xl">Category commissions</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Defaults applied when a listing has no per-item override.</p>
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
        <p className="mt-1 text-sm text-muted-foreground">Fix a specific book's cut. Blank = use category default.</p>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {approved.map((b) => {
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
                <TableCell>
                  {b.removed ? <Badge variant="destructive">Removed</Badge>
                    : b.status === "pending" ? <Badge className="bg-accent text-accent-foreground">Pending</Badge>
                    : b.status === "rejected" ? <Badge variant="destructive">Rejected</Badge>
                    : <Badge variant="secondary">Live</Badge>}
                </TableCell>
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

function QueriesPanel() {
  const { queries, users, replyQuery, setQueryStatus } = useStore();
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const sorted = [...queries].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1));

  return (
    <div className="space-y-3">
      {sorted.length === 0 && <EmptyRow label="No queries yet." />}
      {sorted.map((q) => {
        const user = users.find((u) => u.id === q.userId);
        const draft = replyDraft[q.id] ?? "";
        return (
          <div key={q.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg">{q.subject}</div>
                <div className="text-xs text-muted-foreground">
                  From {user?.name ?? "Unknown"} · {q.createdAt}
                </div>
              </div>
              <Badge variant={q.status === "resolved" ? "secondary" : "default"} className={q.status === "resolved" ? "" : "bg-accent text-accent-foreground"}>
                {q.status === "resolved" ? "Resolved" : "Open"}
              </Badge>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{q.body}</p>

            {q.replies.length > 0 && (
              <div className="mt-4 space-y-2 border-l-2 border-accent/40 pl-4">
                {q.replies.map((r) => {
                  const author = users.find((u) => u.id === r.fromId);
                  return (
                    <div key={r.id} className="rounded-md bg-secondary/60 p-3 text-sm">
                      <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                        {author?.name ?? "Admin"} · {new Date(r.at).toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap">{r.text}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <Textarea
                rows={2}
                placeholder="Write a reply…"
                value={draft}
                onChange={(e) => setReplyDraft({ ...replyDraft, [q.id]: e.target.value })}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { setQueryStatus(q.id, q.status === "open" ? "resolved" : "open"); toast(q.status === "open" ? "Marked resolved" : "Reopened"); }}
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {q.status === "open" ? "Mark resolved" : "Reopen"}
                </Button>
                <Button
                  size="sm"
                  disabled={!draft.trim()}
                  onClick={() => {
                    replyQuery(q.id, draft.trim());
                    setReplyDraft({ ...replyDraft, [q.id]: "" });
                    toast.success("Reply sent");
                  }}
                >
                  <MessageSquare className="mr-1 h-3 w-3" /> Send reply
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Raise a query — Book Ledger" },
      { name: "description", content: "Send a question or issue to the Book Ledger team. Admin replies land here." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { signedIn, queries, users } = useStore();
  const me = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!signedIn) {
      toast("Sign in to raise a query");
      navigate({ to: "/auth" });
    }
  }, [signedIn, navigate]);

  if (!signedIn) return null;

  const mine = queries.filter((q) => q.userId === me.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <LifeBuoy className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Support</span>
          </div>
          <h1 className="mt-2 font-display text-4xl">Raise a query</h1>
          <p className="mt-1 text-muted-foreground">Admin reads every message. You'll see replies below.</p>
        </div>
        <NewQueryDialog />
      </header>

      {mine.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
          You haven't raised any queries yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {mine.map((q) => (
            <li key={q.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg leading-tight">{q.subject}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Opened {q.createdAt}</div>
                </div>
                <Badge variant={q.status === "resolved" ? "secondary" : "default"} className={q.status === "resolved" ? "" : "bg-accent text-accent-foreground"}>
                  {q.status === "resolved" ? <><CheckCircle2 className="mr-1 h-3 w-3" /> Resolved</> : "Open"}
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
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground"><MessageSquare className="h-4 w-4" /> Not a support issue?</div>
        <p className="mt-1">
          For chats with other users, use <Link to="/messages" className="underline">Messages</Link>. Numbers and off-app contact are auto-hidden.
        </p>
      </div>
    </div>
  );
}

function NewQueryDialog() {
  const { addQuery } = useStore();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" /> New query</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Raise a query</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" />
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Details</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell admin what's going on…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!subject || !body) { toast.error("Add a subject and details"); return; }
            addQuery({ subject, body });
            toast.success("Query sent to admin");
            setSubject(""); setBody(""); setOpen(false);
          }}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

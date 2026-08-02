import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { ChatDialog } from "@/components/chat-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Book Ledger" },
      { name: "description", content: "In-app chat with buyers and sellers. Phone numbers and off-platform contact are blocked." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const me = useCurrentUser();
  const { signedIn, threads, users, books } = useStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!signedIn) { toast("Sign in to view messages"); navigate({ to: "/auth" }); }
  }, [signedIn, navigate]);
  if (!signedIn) return null;
  const mine = threads.filter((t) => t.participants.includes(me.id));
  const [openChat, setOpenChat] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-4xl">Messages</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" />
          All chats stay on-platform. Numbers and off-app contact get auto-hidden.
        </p>
      </header>

      {mine.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
          No conversations yet. Open a book and tap <span className="font-medium text-foreground">Chat</span> to start one.
          <div className="mt-4">
            <Button asChild variant="outline"><Link to="/browse">Browse books</Link></Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {mine.map((t) => {
            const otherId = t.participants.find((p) => p !== me.id)!;
            const other = users.find((u) => u.id === otherId)!;
            const book = t.bookId ? books.find((b) => b.id === t.bookId) : undefined;
            const last = t.messages[t.messages.length - 1];
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 font-display text-primary">
                  {other.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{other.name}</div>
                    {book && <span className="truncate text-xs text-muted-foreground">· {book.title}</span>}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {last ? last.text : "No messages yet."}
                  </div>
                </div>
                <Button size="sm" onClick={() => setOpenChat(otherId)}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Open
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {openChat && <ChatDialog open onOpenChange={(v) => !v && setOpenChat(null)} otherId={openChat} />}
    </div>
  );
}

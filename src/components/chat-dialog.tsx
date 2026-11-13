import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Send, ShieldCheck, MessagesSquare } from "lucide-react";
import { toast } from "sonner";
import {
  CHAT_GRACE_BUFFER,
  CHAT_HARD_LIMIT,
  CHAT_MESSAGE_LIMIT,
  useCurrentUser,
  useLiveTables,
  useStore,
} from "@/lib/mock-store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ChatDialog({
  open, onOpenChange, otherId, bookId,
}: { open: boolean; onOpenChange: (v: boolean) => void; otherId: string; bookId?: string }) {
  const me = useCurrentUser();
  const { users, books, threads, enquiries, sendMessage, getThread, messageCountWith } = useStore();
  const other = users.find((u) => u.id === otherId);
  const book = bookId ? books.find((b) => b.id === bookId) : undefined;
  const [text, setText] = useState("");

  // Live message updates only while this dialog is actually open.
  useLiveTables(open ? ["messages", "enquiries"] : []);


  // ensure thread exists when opened
  useEffect(() => { if (open) getThread(otherId, bookId); }, [open, otherId, bookId, getThread]);
  const thread = threads.find((t) =>
    t.participants.includes(me.id) && t.participants.includes(otherId) && t.bookId === bookId,
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollerRef.current?.scrollTo({ top: 999999 }); }, [thread?.messages.length]);

  const used = messageCountWith(otherId);
  const remaining = Math.max(0, CHAT_HARD_LIMIT - used);
  const inGrace = used >= CHAT_MESSAGE_LIMIT && used < CHAT_HARD_LIMIT;
  const exhausted = used >= CHAT_HARD_LIMIT;
  const hasAcceptedEnquiry = !!bookId && enquiries.some((enquiry) =>
    enquiry.bookId === bookId && enquiry.status === "accepted" &&
    ((enquiry.buyerId === me.id && enquiry.sellerId === otherId) ||
      (enquiry.buyerId === otherId && enquiry.sellerId === me.id)),
  );
  const closedBySale = !!book?.sold;
  const locked = !hasAcceptedEnquiry || exhausted || closedBySale;

  const submit = async () => {
    if (!text.trim()) return;
    if (closedBySale) { toast.error("This book is sold — chat is closed."); return; }
    if (exhausted) { toast.error("Message limit reached for this conversation."); return; }
    try {
      const { redacted } = await sendMessage(otherId, text.trim(), bookId);
      if (redacted) toast.warning("Phone number blocked", { description: "Chats can't share contact details." });
      setText("");
    } catch (error) {
      toast.error("Could not send message", { description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-2">
            Chat with {other?.name ?? "reader"}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-accent" />
            Numbers, links, and off-platform contact are auto-hidden.
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5">
              <MessagesSquare className="h-3.5 w-3.5" />
              {Math.min(used, CHAT_HARD_LIMIT)} / {CHAT_MESSAGE_LIMIT} messages used
            </span>
            <span className={inGrace ? "font-medium text-destructive" : "text-muted-foreground"}>
              {exhausted ? "Limit reached" : `${remaining} left`}
              {inGrace ? ` (grace ${CHAT_GRACE_BUFFER})` : ""}
            </span>
          </div>
        </DialogHeader>

        {hasAcceptedEnquiry && (
          <div className="border-b border-border bg-accent/10 px-4 py-2 text-xs text-accent">
            Chat is free. You have {CHAT_MESSAGE_LIMIT} messages — use them to discuss the address and method of dealing for this book.
          </div>
        )}

        {hasAcceptedEnquiry && <div ref={scrollerRef} className="h-80 space-y-2 overflow-y-auto bg-secondary/30 p-4">
          {(!thread || thread.messages.length === 0) && (
            <div className="mt-16 text-center text-sm text-muted-foreground">
              Say hi about the book. Keep it on-platform.
            </div>
          )}
          {thread?.messages.map((m) => {
            const mine = m.fromId === me.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.redacted && (
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <AlertTriangle className="h-3 w-3" /> Redacted for policy
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>}

        {locked ? (
          <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
            {!hasAcceptedEnquiry
              ? "Chat opens after the seller accepts your enquiry"
              : closedBySale
              ? "This book is marked sold — the chat for this listing is closed."
              : "You've used all messages for this conversation, including the grace buffer."}
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Type a message…"
            />
            <Button size="icon" onClick={submit}><Send className="h-4 w-4" /></Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

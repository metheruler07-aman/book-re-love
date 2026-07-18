import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Phone, PhoneOff, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useStore } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ChatDialog({
  open, onOpenChange, otherId, bookId,
}: { open: boolean; onOpenChange: (v: boolean) => void; otherId: string; bookId?: string }) {
  const me = useCurrentUser();
  const { users, threads, sendMessage, getThread } = useStore();
  const other = users.find((u) => u.id === otherId)!;
  const [text, setText] = useState("");

  // ensure thread exists when opened
  useEffect(() => { if (open) getThread(otherId, bookId); }, [open, otherId, bookId, getThread]);
  const thread = threads.find((t) => t.participants.includes(me.id) && t.participants.includes(otherId));
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollerRef.current?.scrollTo({ top: 999999 }); }, [thread?.messages.length]);

  const submit = async () => {
    if (!text.trim()) return;
    const { redacted } = await sendMessage(otherId, text.trim(), bookId);
    if (redacted) toast.warning("Phone number blocked", { description: "Chats can't share contact details." });
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="flex items-center gap-2">
            Chat with {other.name}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-accent" />
            Numbers, links, and off-platform contact are auto-hidden.
          </div>
        </DialogHeader>

        <div ref={scrollerRef} className="h-80 space-y-2 overflow-y-auto bg-secondary/30 p-4">
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
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <Input
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Type a message…"
          />
          <Button size="icon" onClick={submit}><Send className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CallDialog({
  open, onOpenChange, otherId,
}: { open: boolean; onOpenChange: (v: boolean) => void; otherId: string }) {
  const { users } = useStore();
  const other = users.find((u) => u.id === otherId)!;
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!open) { setSeconds(0); setConnected(false); return; }
    const connect = setTimeout(() => setConnected(true), 1400);
    return () => clearTimeout(connect);
  }, [open]);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-xl">Book Ledger call</DialogTitle>
        </DialogHeader>
        <div className="mx-auto my-6 grid h-24 w-24 place-items-center rounded-full bg-accent/15 text-accent">
          <Phone className={`h-10 w-10 ${connected ? "" : "animate-pulse"}`} />
        </div>
        <div className="font-display text-2xl">{other.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Both numbers are hidden. Routed through Book Ledger.
        </div>
        <div className="mt-4 font-mono text-lg">
          {connected ? mmss : "Connecting…"}
        </div>
        <div className="mt-2 rounded-md bg-secondary/60 p-2 text-[11px] text-muted-foreground">
          Masked number: <span className="font-mono text-foreground">+91 •• •••• ••••</span>
        </div>
        <div className="mt-6 flex justify-center">
          <Button variant="destructive" size="lg" onClick={() => onOpenChange(false)}>
            <PhoneOff className="mr-2 h-4 w-4" /> End call
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

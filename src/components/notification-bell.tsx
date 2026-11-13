import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser, useLiveTables, useStore, type Notification } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { notifications, enquiries, books, users, unreadNotifications, markNotificationRead, markAllNotificationsRead, respondEnquiry } = useStore();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const enabled = me.notificationsEnabled !== false;

  // Stream notifications only while the panel is open; otherwise poll-free.
  useLiveTables(enabled && open ? ["notifications", "enquiries"] : []);
  const pendingEnquiries = enquiries.filter((enquiry) => enquiry.sellerId === me.id && enquiry.status === "pending");

  if (!enabled) return null;


  const target = (n: Notification): { path: string; params?: Record<string, string> } => {
    if (n.relatedOrderId) return { path: "/orders" };
    if (n.type === "message_new") return { path: "/messages" };
    if (n.type.startsWith("enquiry_")) return { path: "/my-space" };
    if (n.relatedBookId) return { path: "/book/$id", params: { id: n.relatedBookId } };
    if (n.relatedNoteId) return { path: "/notes" };
    if (n.type === "recommendation_upvote") return { path: "/recommendations" };
    return { path: "/my-space" };
  };

  const openNotification = async (n: Notification) => {
    if (!n.read) await markNotificationRead(n.id);
    const t = target(n);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigate as any)({ to: t.path, params: t.params });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unreadNotifications > 0 && (
            <button
              onClick={() => markAllNotificationsRead()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {pendingEnquiries.length > 0 && (
            <section className="border-b border-border p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pending enquiries</div>
              <ul className="space-y-2">
                {pendingEnquiries.map((enquiry) => (
                  <li key={enquiry.id} className="rounded-md border border-border bg-card p-3">
                    <div className="text-sm font-medium">
                      {users.find((user) => user.id === enquiry.buyerId)?.name ?? "Reader"}
                      {" · "}
                      {books.find((book) => book.id === enquiry.bookId)?.title ?? "Book listing"}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {enquiry.message || "No message included."}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={async () => {
                        try {
                          await respondEnquiry(enquiry.id, "accepted");
                          toast.success("Enquiry accepted");
                        } catch (error) {
                          toast.error("Could not accept enquiry", { description: error instanceof Error ? error.message : "Please try again." });
                        }
                      }}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await respondEnquiry(enquiry.id, "declined");
                          toast.success("Enquiry declined");
                        } catch (error) {
                          toast.error("Could not decline enquiry", { description: error instanceof Error ? error.message : "Please try again." });
                        }
                      }}>Decline</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">You're all caught up.</div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 ${n.read ? "" : "bg-accent/5"}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                        {n.message}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

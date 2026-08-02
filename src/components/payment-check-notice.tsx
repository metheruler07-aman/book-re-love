import { AlertTriangle } from "lucide-react";

/** Shown next to any "Mark as Paid" style control. */
export function PaymentCheckNotice({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground ${className}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <span>
        Only confirm this after checking your own bank or UPI app — never based on a
        screenshot or claim from the buyer.
      </span>
    </p>
  );
}

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineScreen() {
  return (
    <main className="grid min-h-[100svh] flex-1 place-items-center px-6 py-12 text-center">
      <section className="max-w-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
          <WifiOff aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold">You’re offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Book Ledger will be right here when your connection is back. Check your internet and try again.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </section>
    </main>
  );
}
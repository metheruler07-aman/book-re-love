import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { useCurrentUser, useStore, useTheme } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Book Ledger" },
      { name: "description", content: "Sign in to Book Ledger with Google to buy, sell, rent, and trade books with readers nearby." },
    ],
  }),
  component: Auth,
});

const nameKey = (id: string) => `bl-name-confirmed:${id}`;

function Auth() {
  const { theme, toggle } = useTheme();
  const { signedIn, updateUser } = useStore();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  /* First step after signing up: confirm the name we'll show to other readers. */
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!signedIn || !me.id) { setNeedsName(false); return; }
    const done = typeof window !== "undefined" && localStorage.getItem(nameKey(me.id));
    if (done) { navigate({ to: "/" }); return; }
    setName(me.name && me.name !== "Reader" ? me.name : "");
    setNeedsName(true);
  }, [signedIn, me.id, me.name, navigate]);

  const saveName = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    setBusy(true);
    try {
      await updateUser(me.id, { name: name.trim() });
      localStorage.setItem(nameKey(me.id), "1");
      toast.success(`Welcome, ${name.trim()}`);
      navigate({ to: "/" });
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) {
        toast.error("Sign-in failed", { description: res.error.message });
        return;
      }
      if (res.redirected) return; // browser navigates away
      toast.success("Welcome");
    } catch (e) {
      toast.error("Sign-in failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden flex-col justify-between rounded-2xl border border-border bg-secondary/50 p-10 lg:flex paper-grain">
        <div>
          <img src="/book-ledger-logo.svg" alt="Book Ledger" className="h-12 w-auto" />
          <h1 className="mt-16 font-display text-5xl leading-[1.05]">
            Welcome to <span className="italic text-accent">the reading room</span>.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            One account, buy and sell freely with readers nearby.
          </p>
        </div>
        <blockquote className="max-w-sm border-l-2 border-accent pl-4 text-sm italic text-muted-foreground">
          "A room without books is like a body without a soul."
          <div className="mt-1 not-italic text-xs">— Cicero</div>
        </blockquote>
      </div>

      <div className="flex flex-col justify-center">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl">Sign in</h2>
            <p className="text-sm text-muted-foreground">One account — buy, sell, rent, all of it.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={signInGoogle}
          className="w-full justify-center gap-3 py-6 text-base"
        >
          <GoogleIcon /> Continue with Google
        </Button>

        <p className="mt-8 text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.3 6.2 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 15 19 12 24 12c3 0 5.8 1.1 8 3l5.7-5.7C34.3 6.2 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.2C41.5 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

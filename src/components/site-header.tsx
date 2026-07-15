import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Moon, Sun, LogIn, LogOut } from "lucide-react";
import { useCurrentUser, useStore, useTheme } from "@/lib/mock-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navLinks = [
  { to: "/browse", label: "Browse" },
  { to: "/recommendations", label: "Recs" },
  { to: "/sell", label: "Sell / Rent" },
  { to: "/notes", label: "Notes" },
  { to: "/community", label: "Community" },
  { to: "/messages", label: "Messages" },
];

export function SiteHeader() {
  const { users, currentUserId, setCurrentUserId, signedIn, signOut } = useStore();
  const me = useCurrentUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Second Chapter</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              A marketplace for readers
            </div>
          </div>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            if (l.to === "/sell" && me.role === "buyer") return null;
            return (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            );
          })}
          {me.role === "admin" && (
            <Link
              to="/admin"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <>
              <Link to="/account" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
                {me.name}
              </Link>
              <Badge variant="outline" className="hidden capitalize sm:inline-flex">{me.role}</Badge>
              <Select value={currentUserId} onValueChange={setCurrentUserId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" onClick={() => { signOut(); navigate({ to: "/auth" }); }} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              <LogIn className="mr-2 h-4 w-4" /> Sign in
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div>
          <div className="font-display text-base text-foreground">Second Chapter</div>
          <p className="mt-1 max-w-md">
            Give books a second life. Buy, sell, rent, and trade in your neighborhood.
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <div className="mb-2 font-medium text-foreground">Market</div>
            <ul className="space-y-1"><li>Browse</li><li>Rent</li><li>Notes</li></ul>
          </div>
          <div>
            <div className="mb-2 font-medium text-foreground">Community</div>
            <ul className="space-y-1"><li>Recommendations</li><li>Requests</li><li>Messages</li></ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

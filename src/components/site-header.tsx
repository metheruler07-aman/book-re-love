import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Moon, Sun, LogIn, LogOut, Menu, LifeBuoy, Shield, Store, MessageCircle, Sparkles, Users, ScrollText, Search } from "lucide-react";
import { useCurrentUser, useStore, useTheme } from "@/lib/mock-store";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const shopLinks = [
  { to: "/browse" as const,          label: "Browse",  icon: Search },
  { to: "/notes" as const,           label: "Notes",   icon: ScrollText },
];
const communityLinks = [
  { to: "/recommendations" as const, label: "Recs",      icon: Sparkles },
  { to: "/community" as const,       label: "Community", icon: Users },
];

export function SiteHeader() {
  const { users, currentUserId, setCurrentUserId, signedIn, signOut } = useStore();
  const me = useCurrentUser();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="font-display">Book Ledger</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-4 text-sm">
              <NavGroup label="Shop">
                {shopLinks.map((l) => <DrawerLink key={l.to} to={l.to} icon={l.icon} label={l.label} onNav={closeDrawer} />)}
              </NavGroup>
              <NavGroup label="Community">
                {communityLinks.map((l) => <DrawerLink key={l.to} to={l.to} icon={l.icon} label={l.label} onNav={closeDrawer} />)}
              </NavGroup>
              {signedIn && (
                <NavGroup label="You">
                  <DrawerLink to="/messages" icon={MessageCircle} label="Messages" onNav={closeDrawer} />
                  <DrawerLink to="/support" icon={LifeBuoy} label="Raise a query" onNav={closeDrawer} />
                  {me.role !== "buyer" && <DrawerLink to="/sell" icon={Store} label="Sell / rent" onNav={closeDrawer} />}
                  {me.role === "admin" && <DrawerLink to="/admin" icon={Shield} label="Admin console" onNav={closeDrawer} />}
                </NavGroup>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <img src="/book-ledger-icon.svg" alt="" className="h-9 w-9 rounded-md" />
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">Book Ledger</div>
            <div className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Buy · Sell · Rent
            </div>
          </div>
        </Link>

        {/* Desktop primary nav */}
        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {[...shopLinks, ...communityLinks].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {signedIn && (
            <Link
              to="/messages"
              activeProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Messages
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {signedIn && me.role !== "buyer" && (
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/sell"><Store className="mr-2 h-4 w-4" /> Sell a book</Link>
            </Button>
          )}
          {signedIn && (
            <Button asChild size="icon" variant="ghost" className="hidden sm:inline-flex" aria-label="Raise a query">
              <Link to="/support"><LifeBuoy className="h-4 w-4" /></Link>
            </Button>
          )}
          {signedIn && me.role === "admin" && (
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex text-accent">
              <Link to="/admin"><Shield className="mr-2 h-4 w-4" /> Admin</Link>
            </Button>
          )}

          {signedIn ? (
            <>
              <Link to="/account" className="hidden text-sm text-muted-foreground hover:text-foreground lg:inline">
                {me.name}
              </Link>
              <Badge variant="outline" className="hidden capitalize lg:inline-flex">{me.role}</Badge>
              <Select value={currentUserId} onValueChange={setCurrentUserId}>
                <SelectTrigger className="h-9 w-[130px]">
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

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DrawerLink({ to, icon: Icon, label, onNav }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; onNav: () => void }) {
  return (
    <Link
      to={to as never}
      onClick={onNav}
      activeProps={{ className: "bg-secondary text-secondary-foreground" }}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" /> {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div>
          <div className="font-display text-base text-foreground">Book Ledger</div>
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
          <div>
            <div className="mb-2 font-medium text-foreground">Help</div>
            <ul className="space-y-1"><li>Raise a query</li><li>Buyback</li></ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

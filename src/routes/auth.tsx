import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useStore, useTheme } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Second Chapter" },
      { name: "description", content: "Sign in to Second Chapter to buy, sell, rent, and trade books with readers nearby." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const { users, signIn } = useStore();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState("ava@secondchapter.app");
  const [password, setPassword] = useState("••••••••");
  const [pickedId, setPickedId] = useState(users[0].id);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden flex-col justify-between rounded-2xl border border-border bg-secondary/50 p-10 lg:flex paper-grain">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold">Second Chapter</span>
          </div>
          <h1 className="mt-16 font-display text-5xl leading-[1.05]">
            Welcome back to <span className="italic text-accent">the reading room</span>.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Pick up where you left off — your shelf, your neighborhood, your unread requests.
          </p>
        </div>
        <blockquote className="max-w-sm border-l-2 border-accent pl-4 text-sm italic text-muted-foreground">
          “A room without books is like a body without a soul.”
          <div className="mt-1 not-italic text-xs">— Cicero</div>
        </blockquote>
      </div>

      <div className="flex flex-col justify-center">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl">Sign in</h2>
            <p className="text-sm text-muted-foreground">or create an account to continue.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6 space-y-4">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div className="grid gap-1.5">
              <Label>Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
            </div>
            <div className="rounded-md border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              Prototype mode — pick which demo account to sign in as:
              <div className="mt-2 grid grid-cols-2 gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setPickedId(u.id)}
                    className={`rounded-md border px-2 py-1 text-left text-xs transition ${
                      pickedId === u.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-muted-foreground capitalize">{u.role}</div>
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { signIn(pickedId); toast.success("Signed in"); navigate({ to: "/" }); }}
            >
              Sign in
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="mt-6 space-y-4">
            <div className="grid gap-1.5"><Label>Full name</Label><Input placeholder="Your name" /></div>
            <div className="grid gap-1.5"><Label>Email</Label><Input type="email" placeholder="you@example.com" /></div>
            <div className="grid gap-1.5"><Label>Password</Label><Input type="password" placeholder="Create a password" /></div>
            <Button
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => { signIn("u1"); toast.success("Account created"); navigate({ to: "/account" }); }}
            >
              Create account
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

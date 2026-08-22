import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    return { signedIn: Boolean(data.session) };
  },
  loader: async ({ context, location }) => {
    if (!(context as { signedIn: boolean }).signedIn) return null;
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-2xl">Could not load this request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!details) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your Book Ledger account to approve this connection.
        </p>
        <Button
          className="mt-6"
          onClick={() =>
            lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.href })
          }
        >
          Continue with Google
        </Button>
      </main>
    );
  }

  async function decide(approve: boolean) {
    setBusy(true);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-2xl">Connect {clientName} to Book Ledger</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This lets {clientName} search listings and read or create your listings and orders as you.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Button disabled={busy} onClick={() => decide(true)}>
          Approve
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
          Deny
        </Button>
      </div>
    </main>
  );
}

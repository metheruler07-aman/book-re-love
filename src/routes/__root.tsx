import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "@/lib/register-sw";
import { StoreProvider, ThemeProvider } from "@/lib/mock-store";
import { SiteHeader, SiteFooter, MobileBottomNavigation } from "@/components/site-header";
import { OfflineScreen } from "@/components/offline-screen";
import { Toaster } from "@/components/ui/sonner";
import { HOME_DESCRIPTION, HOME_TITLE, siteUrl } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That chapter isn't in our stacks.
        </p>
        <div className="mt-6">
          <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to the shelves
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something went sideways</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again, or head home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => {
    const pathname = matches[matches.length - 1]?.pathname ?? "/";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title: HOME_TITLE },
        { name: "description", content: HOME_DESCRIPTION },
        { name: "author", content: "Book Ledger" },
        { property: "og:title", content: HOME_TITLE },
        { property: "og:description", content: HOME_DESCRIPTION },
        { property: "og:url", content: siteUrl(pathname) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: HOME_TITLE },
        { name: "twitter:description", content: HOME_DESCRIPTION },
        { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c120db8f-ffeb-4537-94db-39a27263039d/id-preview-b03b6634--fc9c769f-4f15-4770-88aa-3c4ee964e307.lovable.app-1784434931735.png" },
        { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c120db8f-ffeb-4537-94db-39a27263039d/id-preview-b03b6634--fc9c769f-4f15-4770-88aa-3c4ee964e307.lovable.app-1784434931735.png" },
        { name: "theme-color", content: "#7a2e1e" },
        { name: "apple-mobile-web-app-title", content: "BookLedger" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/book-ledger-icon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/icon-192.png" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" },
        { rel: "canonical", href: siteUrl(pathname) },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    const updateConnection = () => setIsOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <StoreProvider>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            {isOffline ? (
              <OfflineScreen />
            ) : (
              <>
                <SiteHeader />
                <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                  <Outlet />
                </main>
                <SiteFooter />
                <MobileBottomNavigation />
              </>
            )}
          </div>
          <Toaster />
        </StoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

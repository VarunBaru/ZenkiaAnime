import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PreferencesProvider, THEME_BOOT_SCRIPT } from "@/lib/preferences";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="ink-panel halftone max-w-md p-8 text-center">
        <h1 className="font-display text-6xl text-accent">404</h1>
        <h2 className="mt-4 font-display text-xl">This panel is blank</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="ink-panel-sm ink-press inline-block bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            Back to page one
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="ink-panel max-w-md p-8 text-center">
        <h1 className="font-display text-xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="ink-panel-sm ink-press bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            Try again
          </button>
          <a
            href="/"
            className="ink-panel-sm ink-press bg-card px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Zenkia Anime — Manga-styled anime discovery & tracking" },
      {
        name: "description",
        content:
          "Zenkia Anime: Discover anime, browse genres, track your watchlist and episode progress, and jump to official licensed streaming sources.",
      },
      { property: "og:title", content: "Zenkia Anime — anime discovery & tracking" },
      {
        property: "og:description",
        content: "Discover, search and track anime in a manga-inspired Zenkia Anime catalogue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bungee&family=Space+Mono:wght@400;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: "/brand-favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/brand-favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { name: "theme-color", content: "#101113" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
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

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <AuthSync />
        <ServiceWorkerRegistration />
        <AuthGate>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">
              {/* Required: nested routes render here. */}
              <Outlet />
            </main>
            <SiteFooter />
          </div>
        </AuthGate>
        <Toaster />
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

const PUBLIC_AUTH_PATHS = new Set(["/auth", "/login", "/signup", "/signin", "/sign-in"]);

function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAuthPage = PUBLIC_AUTH_PATHS.has(pathname);

  useEffect(() => {
    if (!loading && !user && !isAuthPage) {
      void router.navigate({ to: "/signup", replace: true });
    }
  }, [loading, user, isAuthPage, router]);

  if (!isAuthPage && (loading || !user)) {
    return (
      <div className="grid min-h-screen place-items-center px-4" role="status" aria-live="polite">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Checking your account…
        </p>
      </div>
    );
  }

  return children;
}

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("[pwa] service worker registration failed", error);
    });
  }, []);

  return null;
}

function AuthSync() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    const desktop = (window as Window & {
      zenkiaDesktop?: {
        onAuthCallback: (callback: (payload: { code?: string; error?: string }) => void) => () => void;
      };
    }).zenkiaDesktop;
    const unsubscribeDesktop = desktop?.onAuthCallback(({ code, error }) => {
      if (error) {
        toast.error(error);
        return;
      }
      if (!code) {
        toast.error("Google sign-in did not return an authorization code.");
        return;
      }

      void supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          toast.error(exchangeError.message);
          return;
        }
        router.invalidate();
        void queryClient.invalidateQueries();
      });
    });

    return () => {
      sub.subscription.unsubscribe();
      unsubscribeDesktop?.();
    };
  }, [router, queryClient]);

  return null;
}

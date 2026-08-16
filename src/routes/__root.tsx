/**
 * Root route component for the entire application.
 * Exports: Route. Defines the base HTML shell, global head tags, and shared providers (QueryClient).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { useLocale } from "../i18n";
import { LOCALE_HTML_LANG } from "../i18n/config";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageNotice } from "../components/language-notice";
import { AssistantWidget } from "../components/assistant/AssistantWidget";
import { Toaster } from "../components/ui/sonner";
import { PlausibleAnalytics } from "../components/plausible-analytics";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      // viewport-fit=cover is what lets the volunteer console pad against the
      // iPhone notch and home indicator via env(safe-area-inset-*).
      { name: "theme-color", content: "#212251" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "ICF Chat" },
      { title: "The Switzerland Chapter of ICF | Find a credentialed coach" },
      {
        name: "description",
        content:
          "Find a credentialed coach in Switzerland, develop leaders in your organisation, and join the coaching community across Zürich, Romandie and Ticino.",
      },
      { name: "author", content: "The Switzerland Chapter of ICF" },
      {
        property: "og:title",
        content: "The Switzerland Chapter of ICF | Find a credentialed coach",
      },
      {
        property: "og:description",
        content:
          "Find a credentialed coach in Switzerland, develop leaders in your organisation, and join the coaching community across Zürich, Romandie and Ticino.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "The Switzerland Chapter of ICF | Find a credentialed coach",
      },
      {
        name: "twitter:description",
        content:
          "Find a credentialed coach in Switzerland, develop leaders in your organisation, and join the coaching community across Zürich, Romandie and Ticino.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9742a08a-f4da-45ed-a019-f4fbc25ec48e/id-preview-c16d0cde--9b53a55c-a944-4840-b29d-ad56f7d750f4.lovable.app-1784791324912.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9742a08a-f4da-45ed-a019-f4fbc25ec48e/id-preview-c16d0cde--9b53a55c-a944-4840-b29d-ad56f7d750f4.lovable.app-1784791324912.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Home-screen install for the volunteer chat console (see manifest).
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/app-icon-192.png" },
      // Fonts are self-hosted (see @font-face in src/styles.css); preload them
      // so first paint doesn't flash the fallback stack.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/plus-jakarta-sans-variable.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/quicksand-variable.woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return (
    <html lang={LOCALE_HTML_LANG[locale]}>
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
  // The volunteer console is a chat surface of its own — the public assistant
  // launcher would sit on top of it.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideAssistant = pathname.startsWith("/volunteer-chat");

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <PlausibleAnalytics />
      <LanguageNotice />
      {!hideAssistant && <AssistantWidget />}
      {/* Single global toast outlet — refused actions surface here rather than throwing. */}
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

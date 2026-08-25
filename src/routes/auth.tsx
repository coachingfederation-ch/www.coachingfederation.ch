/**
 * Member sign-in route (/auth).
 * Exports: Route. Renders the sign-in form for members, allowing them to access
 * the protected member area or claim an imported account.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useCms } from "@/i18n/cms";
import { safeNext } from "@/lib/safe-next";
import { AuthCard, SignInForm, useAuthSession } from "@/components/auth/auth-screen";

export const Route = createFileRoute("/auth")({
  // `next` lets a flow that needed sign-in (e.g. the OAuth consent screen)
  // resume exactly where it left off.
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search.next) }),
  head: () => ({
    meta: [
      { title: "Member access — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content: "Sign in to the The Switzerland Chapter of ICF Member Area.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const { t } = useCms();
  const goToArea = useAuthSession(next);

  return (
    <AuthCard title={t("auth.memberTitle")} subtitle={t("auth.memberHelp")}>
      <SignInForm onSignedIn={goToArea} />

      {/* Accounts are never self-registered: a first-time member claims the
          imported record. `/claim` explains itself when claiming is still
          closed, so the link is always shown rather than a dead end. */}
      <p className="mt-4 text-center text-xs">
        <Link to="/claim" className="font-semibold text-primary hover:underline">
          {t("auth.claimAccount")}
        </Link>
      </p>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/forgot-password" className="hover:underline">
          {t("auth.forgotPassword")}
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/staff-sign-in" search={{ next }} className="hover:underline">
          {t("auth.internalSignIn")}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          ← Back to Home
        </Link>
      </p>
    </AuthCard>
  );
}

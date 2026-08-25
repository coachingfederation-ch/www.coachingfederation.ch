/**
 * Forgot-password route (/forgot-password).
 * Exports: Route. Collects an email address and asks the server to send a
 * reset link. The confirmation is deliberately identical whether or not an
 * account exists, so the screen cannot be used to probe member addresses.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCms } from "@/i18n/cms";
import { Button, Input } from "@/design-system/icf-welcome-design-system-a835df";
import { AuthCard } from "@/components/auth/auth-screen";
import { requestPasswordReset } from "@/lib/password-reset.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content:
          "Request a password reset link for your The Switzerland Chapter of ICF Member Area account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t, locale } = useCms();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset({
        data: {
          email,
          locale,
          redirectOrigin: window.location.origin,
          website,
        },
      });
    } catch {
      // Swallowed on purpose: the screen shows the same neutral confirmation
      // in every case, including a transport failure.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthCard title={t("auth.forgotTitle")} subtitle={t("auth.forgotSub")}>
      {sent ? (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground">
          {t("auth.forgotSent")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            required
            autoComplete="email"
            aria-label={t("auth.emailPlaceholder")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {/* Honeypot — hidden from people, tempting to bots. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
          />
          <Button type="submit" size="pill" disabled={loading} className="w-full">
            {loading ? t("auth.wait") : t("auth.forgotSubmit")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/auth" search={{ next: undefined }} className="hover:underline">
          {t("auth.backToMemberSignIn")}
        </Link>
      </p>
    </AuthCard>
  );
}

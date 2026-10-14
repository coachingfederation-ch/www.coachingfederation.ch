/**
 * Advertiser sign-in / sign-up (/advertise/sign-in).
 *
 * For organisations that are not ICF members. Google, Microsoft and Apple go
 * through the managed OAuth broker; email sign-up requires confirming the
 * address. Everyone returns to /advertise, which decides the next step.
 * ICF members are pointed to the regular member sign-in.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Input } from "@/design-system/icf-welcome-design-system-a835df";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { AuthCard } from "@/components/auth/auth-screen";

export const Route = createFileRoute("/advertise_/sign-in")({
  head: () => ({
    meta: [
      { title: "Advertiser sign-in — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content: "Sign in or create an advertiser account to book placements.",
      },
      { property: "og:title", content: "Advertiser sign-in — The Switzerland Chapter of ICF" },
      {
        property: "og:description",
        content: "Sign in or create an advertiser account to book placements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdvertiserSignIn,
});

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
  { id: "apple", label: "Apple" },
] as const;

function AdvertiserSignIn() {
  const { t } = useCms();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const oauth = async (provider: (typeof PROVIDERS)[number]["id"]) => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/advertise")}`,
    });
    if (result.error) {
      setError(result.error.message ?? t("auth.genericError"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/advertise" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signUp") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/advertise` },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/advertise" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title={t("advertiser.signIn.title")} subtitle={t("advertiser.signIn.subtitle")}>
      {checkEmail ? (
        <p role="status" className="text-center text-sm text-foreground">
          {t("advertiser.signIn.checkEmail")}
        </p>
      ) : (
        <>
          <div className="grid gap-2">
            {PROVIDERS.map((p) => (
              <Button key={p.id} type="button" variant="outline" onClick={() => void oauth(p.id)}>
                {t("advertiser.signIn.continueWith")} {p.label}
              </Button>
            ))}
          </div>
          <p className="my-4 text-center text-xs text-muted-foreground">
            {t("advertiser.signIn.or")}
          </p>
          <form onSubmit={submit} className="grid gap-3">
            <Input
              type="email"
              required
              autoComplete="email"
              aria-label={t("auth.emailPlaceholder")}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              aria-label={t("auth.passwordPlaceholder")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading
                ? t("auth.wait")
                : mode === "signUp"
                  ? t("advertiser.signIn.createAccount")
                  : t("auth.signIn")}
            </Button>
          </form>
          <p className="mt-3 text-center text-xs">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setMode((m) => (m === "signIn" ? "signUp" : "signIn"))}
            >
              {mode === "signIn" ? t("advertiser.signIn.toSignUp") : t("advertiser.signIn.toSignIn")}
            </Button>
          </p>
        </>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("advertiser.signIn.memberNote")}{" "}
        <Link to="/auth" search={{ next: "/advertise" }} className="font-semibold text-primary">
          {t("advertiser.landing.memberLink")}
        </Link>
      </p>
    </AuthCard>
  );
}

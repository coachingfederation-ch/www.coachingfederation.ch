/**
 * Reset-password route (/reset-password).
 * Exports: Route. Public landing target of the recovery link: it waits for the
 * recovery session Supabase hydrates from the URL, takes a new password, and
 * then hands the user to their normal role-based landing page.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { landingPathForSession } from "@/lib/roles";
import { Button, Input } from "@/design-system/icf-welcome-design-system-a835df";
import { AuthCard } from "@/components/auth/auth-screen";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content: "Set a new password for your The Switzerland Chapter of ICF account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const { t } = useCms();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The recovery link puts the session in the URL; supabase-js consumes it
  // asynchronously, so wait briefly before declaring the link dead.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) setPhase("ready");
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        setPhase("ready");
        return;
      }
      timer = setTimeout(() => {
        void supabase.auth.getSession().then(({ data: retry }) => {
          if (!cancelled) setPhase(retry.session ? "ready" : "invalid");
        });
      }, 2500);
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("auth.resetMismatch"));
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      const { data } = await supabase.auth.getUser();
      navigate({
        to: data.user ? await landingPathForSession(data.user.id) : "/auth",
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.genericError"));
      setSaving(false);
    }
  };

  if (phase === "checking") {
    return (
      <AuthCard title={t("auth.resetTitle")} subtitle={t("auth.resetChecking")}>
        <p className="text-center text-sm text-muted-foreground">{t("auth.wait")}</p>
      </AuthCard>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthCard title={t("auth.resetTitle")} subtitle={t("auth.resetLinkInvalid")}>
        <p className="text-center text-xs">
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            {t("auth.forgotSubmit")}
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/auth" search={{ next: undefined }} className="hover:underline">
            {t("auth.backToMemberSignIn")}
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("auth.resetTitle")} subtitle={t("auth.resetSub")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={t("auth.newPassword")}
          placeholder={t("auth.newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-label={t("auth.confirmPassword")}
          placeholder={t("auth.confirmPassword")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="pill" disabled={saving} className="w-full">
          {saving ? t("auth.wait") : t("auth.resetSubmit")}
        </Button>
      </form>
    </AuthCard>
  );
}

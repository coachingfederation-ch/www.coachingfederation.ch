/**
 * Member account claim screens.
 *
 * Both screens are inert until the chapter opens the Member Area after the
 * LIVE cutover: `getMemberClaimStatus` reflects the same database gate the
 * server functions enforce, so the request form is never shown while claiming
 * is closed. Localised through the CMS dictionary (the same one `/auth` uses)
 * rather than the public `$locale` routes — these are account screens, not
 * indexable marketing pages.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCms } from "@/i18n/cms";
import { LOCALE_LABELS, LOCALE_ORDER } from "@/i18n/config";
import {
  checkMemberClaimToken,
  completeMemberClaim,
  getMemberClaimStatus,
  requestMemberClaim,
} from "@/lib/members.functions";

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { locale, setLocale } = useCms();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {LOCALE_ORDER.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={
                  "rounded-full px-2.5 py-1 text-xs font-semibold transition " +
                  (l === locale
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground")
                }
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary";
const buttonClass =
  "w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60";

export function ClaimRequestPage() {
  const { t } = useCms();
  const status = useQuery({
    queryKey: ["member-claim-status"],
    queryFn: () => getMemberClaimStatus(),
  });
  const request = useServerFn(requestMemberClaim);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: (value: string) => request({ data: { email: value } }),
    onSettled: () => setDone(true),
  });

  if (status.isLoading) {
    return (
      <Shell title={t("claim.title")}>
        <p className="text-center text-sm text-muted-foreground">{t("claim.loading")}</p>
      </Shell>
    );
  }

  if (!status.data?.enabled) {
    return (
      <Shell title={t("claim.closedTitle")} subtitle={t("claim.closedBody")}>
        <a
          href="/auth"
          className="block text-center text-sm font-semibold text-primary hover:underline"
        >
          {t("claim.toSignIn")}
        </a>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell title={t("claim.sentTitle")} subtitle={t("claim.sentBody")}>
        <a
          href="/auth"
          className="block text-center text-sm font-semibold text-primary hover:underline"
        >
          {t("claim.toSignIn")}
        </a>
      </Shell>
    );
  }

  return (
    <Shell title={t("claim.title")} subtitle={t("claim.subtitle")}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate(email.trim());
        }}
      >
        <label className="block text-xs font-semibold text-muted-foreground" htmlFor="claim-email">
          {t("claim.emailLabel")}
        </label>
        <input
          id="claim-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.emailPlaceholder")}
          className={inputClass}
        />
        <button type="submit" disabled={submit.isPending} className={buttonClass}>
          {submit.isPending ? t("auth.wait") : t("claim.submit")}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t("claim.privacyNote")}</p>
    </Shell>
  );
}

export function ClaimTokenPage({ token }: { token: string }) {
  const { t } = useCms();
  const navigate = useNavigate();
  const check = useServerFn(checkMemberClaimToken);
  const complete = useServerFn(completeMemberClaim);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const state = useQuery({
    queryKey: ["member-claim-token", token],
    queryFn: () => check({ data: { token } }),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const result = await complete({ data: { token, password } });
      if (result.status !== "ok") throw new Error(t(`claim.error.${result.status}`));
      // Sign in with the credentials just set so the session hydrates normally.
      const { error } = await supabase.auth.signInWithPassword({ email: result.email, password });
      if (error) throw error;
    },
    onError: (err) => setError(err instanceof Error ? err.message : t("auth.genericError")),
    onSuccess: () => navigate({ to: "/member" }),
  });

  useEffect(() => setError(null), [password, confirm]);

  if (state.isLoading) {
    return (
      <Shell title={t("claim.title")}>
        <p className="text-center text-sm text-muted-foreground">{t("claim.loading")}</p>
      </Shell>
    );
  }

  const status = state.data?.status ?? "unknown";
  if (status !== "valid") {
    return (
      <Shell title={t(`claim.state.${status}.title`)} subtitle={t(`claim.state.${status}.body`)}>
        <a
          href="/claim"
          className="block text-center text-sm font-semibold text-primary hover:underline"
        >
          {t("claim.restart")}
        </a>
      </Shell>
    );
  }

  const maskedEmail = state.data && "maskedEmail" in state.data ? state.data.maskedEmail : "";
  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= 10 && password === confirm && !submit.isPending;

  return (
    <Shell
      title={t("claim.setPasswordTitle")}
      subtitle={t("claim.setPasswordBody").replace("{email}", maskedEmail)}
    >
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) submit.mutate();
        }}
      >
        <label
          className="block text-xs font-semibold text-muted-foreground"
          htmlFor="claim-password"
        >
          {t("claim.passwordLabel")}
        </label>
        <input
          id="claim-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <label
          className="block text-xs font-semibold text-muted-foreground"
          htmlFor="claim-confirm"
        >
          {t("claim.confirmLabel")}
        </label>
        <input
          id="claim-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">{t("claim.passwordHint")}</p>
        {(tooShort || mismatch || error) && (
          <p role="alert" className="text-xs font-semibold text-destructive">
            {error ?? (tooShort ? t("claim.error.weak_password") : t("claim.error.mismatch"))}
          </p>
        )}
        <button type="submit" disabled={!canSubmit} className={buttonClass}>
          {submit.isPending ? t("auth.wait") : t("claim.finish")}
        </button>
      </form>
    </Shell>
  );
}

/**
 * Staff support panel: sign-in health for one member.
 * Exports: MemberSignInHealthPanel. Rendered by routes/_staff/members.$id.tsx.
 *
 * Answers the two questions the office actually gets on the phone — "it says
 * my password is wrong" and "I never got the mail" — without handing staff any
 * way to take an account over: the reset always goes to the address the account
 * itself holds, and a pending address change can only be confirmed by the
 * member from their own session.
 */
import { useEffect, useState } from "react";
import { useCms } from "@/i18n/cms";
import { getMemberSignInHealth, sendMemberPasswordReset } from "@/lib/members.functions";

type Health = Awaited<ReturnType<typeof getMemberSignInHealth>>;

const formatDate = (value: string | null, locale: string) =>
  value ? new Date(value).toLocaleString(locale) : "—";

export function MemberSignInHealthPanel({ memberId }: { memberId: string }) {
  const { t, locale } = useCms();
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      setHealth(await getMemberSignInHealth({ data: { memberId } }));
    } catch {
      setHealth(null);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const sendReset = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await sendMemberPasswordReset({
        data: { memberId, locale: locale as "en" | "de" | "fr" | "it", redirectOrigin: window.location.origin },
      });
      setNotice(
        result.ok
          ? t("members.signIn.resetSent")
          : t(`members.signIn.reset_${result.reason ?? "failed"}`),
      );
    } catch {
      setNotice(t("members.signIn.reset_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{t("members.signIn.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("members.signIn.note")}</p>

      {!health ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("members.signIn.loading")}</p>
      ) : !health.claimed ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("members.signIn.notClaimed")}</p>
      ) : (
        <>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t("members.signIn.address")}</dt>
              <dd className="font-medium">{health.signInEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("members.signIn.confirmed")}</dt>
              <dd className="font-medium">
                {health.emailConfirmed ? t("members.signIn.yes") : t("members.signIn.no")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("members.signIn.lastSignIn")}</dt>
              <dd className="font-medium">{formatDate(health.lastSignInAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("members.signIn.created")}</dt>
              <dd className="font-medium">{formatDate(health.createdAt, locale)}</dd>
            </div>
          </dl>

          {health.pending ? (
            <div className="mt-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
              <p className="font-medium">
                {health.pending.state === "blocked"
                  ? t("members.signIn.pendingBlockedTitle")
                  : t("members.signIn.pendingTitle")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("members.signIn.pendingBody")} {health.pending.pendingEmail}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {health.pending.state === "blocked"
                  ? t("members.signIn.pendingBlockedHint")
                  : t("members.signIn.pendingHint")}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendReset}
              disabled={busy}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t("members.signIn.sending") : t("members.signIn.sendReset")}
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
            >
              {t("members.signIn.refresh")}
            </button>
            {notice ? <span className="text-xs text-muted-foreground">{notice}</span> : null}
          </div>
        </>
      )}
    </section>
  );
}

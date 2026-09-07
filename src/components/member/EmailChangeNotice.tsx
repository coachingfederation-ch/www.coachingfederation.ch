/**
 * Member Area notice: a new address arrived from ICF Global.
 * Exports: EmailChangeNotice. Rendered by components/member/MemberHome.tsx.
 *
 * ICF Global masters contact data, but it cannot move the address someone
 * signs in with — only the member can, by clicking the link we send to the new
 * address. Until then the old address keeps working, which is exactly what
 * this notice says.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, ShieldAlert } from "lucide-react";
import { useCms } from "@/i18n/cms";
import {
  getPendingEmailChange,
  startEmailChangeConfirmation,
} from "@/lib/account-security.functions";

export function EmailChangeNotice() {
  const { t } = useCms();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const { data: pending, refetch } = useQuery({
    queryKey: ["member-pending-email"],
    queryFn: () => getPendingEmailChange(),
  });

  if (!pending) return null;
  const blocked = pending.state === "blocked";
  const alreadySent = pending.state === "sent" || state === "sent";

  const confirm = async () => {
    setState("busy");
    const result = await startEmailChangeConfirmation().catch(() => ({ ok: false }));
    setState(result.ok ? "sent" : "error");
    if (result.ok) void refetch();
  };

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        {blocked ? (
          <ShieldAlert className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
        ) : (
          <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" aria-hidden />
        )}
        <div>
          <h2 className="text-base font-semibold">
            {blocked ? t("member.emailChange.blockedTitle") : t("member.emailChange.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {blocked ? t("member.emailChange.blockedBody") : t("member.emailChange.body")}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">{t("member.emailChange.newAddress")}: </span>
            <strong>{pending.pendingEmail}</strong>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">{t("member.emailChange.current")}: </span>
            <strong>{pending.currentSignInEmail}</strong>
          </p>

          {blocked ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("member.emailChange.blockedHint")}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={confirm}
                disabled={state === "busy"}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {state === "busy"
                  ? t("member.emailChange.sending")
                  : alreadySent
                    ? t("member.emailChange.resend")
                    : t("member.emailChange.send")}
              </button>
              <span className="text-xs text-muted-foreground">
                {state === "error"
                  ? t("member.emailChange.error")
                  : alreadySent
                    ? t("member.emailChange.sentHint")
                    : t("member.emailChange.hint")}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

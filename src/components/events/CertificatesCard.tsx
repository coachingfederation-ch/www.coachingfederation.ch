/**
 * Certificates of completion — staff card on the door screen.
 *
 * The counts here are read-only reporting. Issuing, withdrawing and reissuing
 * all go through database routines that re-check attendance and the caller's
 * authority, so a stale screen can never produce a certificate for somebody
 * who was not present.
 */
import { useCallback, useEffect, useState } from "react";
import { Award } from "lucide-react";
import {
  issueCompletionDocuments,
  loadCertificateBoard,
  reissueCertificate,
  resendCertificateEmail,
  revokeCertificate,
  type CertificateBoard,
  type StaffCertificateRow,
} from "@/lib/certificates.functions";

type Props = {
  eventId: string;
  t: (key: string) => string;
};

const buttonPrimary =
  "min-h-11 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const buttonGhost =
  "min-h-9 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50";

function hoursLabel(row: StaffCertificateRow, t: Props["t"]) {
  const parts: string[] = [];
  if (row.cc_hours) parts.push(`${Number(row.cc_hours).toFixed(2)} CC`);
  if (row.rd_hours) parts.push(`${Number(row.rd_hours).toFixed(2)} RD`);
  return parts.length > 0 ? parts.join(" · ") : t("events.certificates.attendanceOnly");
}

function emailLabel(status: string, t: Props["t"]) {
  if (status === "sent") return t("events.certificates.emailSent");
  if (status === "sending") return t("events.certificates.emailSending");
  if (status === "failed") return t("events.certificates.emailFailed");
  return t("events.certificates.emailNotSent");
}

export function CertificatesCard({ eventId, t }: Props) {
  const [board, setBoard] = useState<CertificateBoard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setBoard(await loadCertificateBoard({ data: { eventId } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.certificates.failed"));
    }
  }, [eventId, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("events.certificates.failed"));
      } finally {
        setBusy(false);
      }
    },
    [reload, t],
  );

  if (!board) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Award aria-hidden className="size-4 text-primary" />
        {t("events.certificates.title")}
      </h2>

      {!board.certificatesEnabled ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("events.certificates.disabled")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">{t("events.certificates.help")}</p>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-background p-3">
              <dt className="text-muted-foreground">{t("events.certificates.checkedIn")}</dt>
              <dd className="text-base font-bold">{board.checkedIn}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-muted-foreground">{t("events.certificates.issued")}</dt>
              <dd className="text-base font-bold">{board.issued}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-muted-foreground">{t("events.certificates.pendingEmails")}</dt>
              <dd className="text-base font-bold">{board.pendingEmails}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-muted-foreground">{t("events.certificates.revoked")}</dt>
              <dd className="text-base font-bold">{board.revoked}</dd>
            </div>
          </dl>

          {board.ccApproved.cc !== null || board.ccApproved.rd !== null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("events.certificates.hoursNote")}
            </p>
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => issueCompletionDocuments({ data: { eventId } }))}
            className={`${buttonPrimary} mt-3`}
          >
            {busy ? t("events.certificates.issuing") : t("events.certificates.issue")}
          </button>

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

          <ul className="mt-4 space-y-2">
            {board.rows.length === 0 ? (
              <li className="text-xs text-muted-foreground">{t("events.certificates.empty")}</li>
            ) : null}
            {board.rows.map((row) => (
              <li key={row.id} className="rounded-xl bg-background p-3 text-xs">
                <p className="font-semibold">{row.holder_name}</p>
                <p className="text-muted-foreground">
                  {row.serial} · {hoursLabel(row, t)} ·{" "}
                  {row.status === "issued"
                    ? emailLabel(row.email_status, t)
                    : t("events.certificates.revoked")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.status === "issued" ? (
                    <>
                      <a
                        className={buttonGhost}
                        href={`/verify/certificate/${row.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("events.certificates.view")}
                      </a>
                      <button
                        type="button"
                        disabled={busy}
                        className={buttonGhost}
                        onClick={() =>
                          void run(() =>
                            resendCertificateEmail({ data: { certificateId: row.id } }),
                          )
                        }
                      >
                        {t("events.certificates.resend")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className={buttonGhost}
                        onClick={() => {
                          if (!window.confirm(t("events.certificates.revokeConfirm"))) return;
                          void run(() => revokeCertificate({ data: { certificateId: row.id } }));
                        }}
                      >
                        {t("events.certificates.revoke")}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      className={buttonGhost}
                      onClick={() =>
                        void run(() => reissueCertificate({ data: { certificateId: row.id } }))
                      }
                    >
                      {t("events.certificates.reissue")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

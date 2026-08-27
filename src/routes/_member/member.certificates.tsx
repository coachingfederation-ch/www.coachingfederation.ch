/**
 * Member Area certificates list (/member/certificates).
 * Exports: Route. Lists the signed-in member's own certificates so they can
 * open and reprint one at any time.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberShell } from "@/components/member/MemberShell";
import { listMyCertificates, type MemberCertificate } from "@/lib/certificates.functions";

export const Route = createFileRoute("/_member/member/certificates")({
  head: () => ({
    meta: [
      { title: "Your certificates — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberCertificatesPage,
});

function MemberCertificatesPage() {
  const { t, i18n } = useTranslation("cms");
  const [rows, setRows] = useState<MemberCertificate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listMyCertificates()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MemberShell>
      <h1 className="font-heading text-3xl text-primary">{t("member.certificates.title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("member.certificates.help")}</p>

      {rows && rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("member.certificates.empty")}</p>
      ) : null}

      <ul className="mt-8 space-y-3">
        {(rows ?? []).map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div>
              <p className="font-semibold">{row.event_title_snapshot}</p>
              <p className="text-sm text-muted-foreground">
                {t("member.certificates.completedOn")}{" "}
                {dateFormat.format(new Date(`${row.completed_on}T12:00:00Z`))} ·{" "}
                {t("member.certificates.serial")} {row.serial}
              </p>
            </div>
            <Link
              to="/verify/certificate/$token"
              params={{ token: row.public_token }}
              target="_blank"
              className="min-h-11 rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary"
            >
              {t("member.certificates.open")}
            </Link>
          </li>
        ))}
      </ul>
    </MemberShell>
  );
}

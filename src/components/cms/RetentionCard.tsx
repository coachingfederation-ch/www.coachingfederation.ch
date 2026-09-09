/**
 * Grace-period retention card (admin, integration screen).
 *
 * Shows what the nightly lifecycle sweep is tracking: members whose ICF
 * membership has lapsed and who are in their closing period, how many have
 * already had the 30-day and 7-day warning, and how many records have passed
 * their date and are waiting for a staff member to confirm removal.
 *
 * Nothing here deletes anything — the confirmation stays on the existing
 * "Clean up" action in the actions card above.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { getLifecycleRetentionSummary } from "@/lib/members.functions";

const CARD = "rounded-2xl border border-border bg-card p-5";

type Summary = Awaited<ReturnType<typeof getLifecycleRetentionSummary>>;

export function RetentionCard() {
  const { t } = useCms();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setSummary(await getLifecycleRetentionSummary());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load retention status");
      }
    })();
  }, []);

  const stats: { label: string; value: number | string }[] = summary
    ? [
        { label: t("integration.retentionInGrace"), value: summary.inGrace },
        { label: t("integration.retentionWarned30"), value: summary.warned30 },
        { label: t("integration.retentionWarned7"), value: summary.warned7 },
        { label: t("integration.retentionDue"), value: summary.due },
      ]
    : [];

  return (
    <section className={CARD}>
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Clock className="h-4 w-4" /> {t("integration.retentionTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("integration.retentionIntro")}</p>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

      {summary ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border p-3">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {summary.nextDeletionAt
              ? `${t("integration.retentionNext")} ${new Date(summary.nextDeletionAt).toLocaleDateString()}`
              : t("integration.retentionNextNone")}
          </p>
        </>
      ) : (
        !error && <p className="mt-3 text-xs text-muted-foreground">{t("integration.loading")}</p>
      )}
    </section>
  );
}

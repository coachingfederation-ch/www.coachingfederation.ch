/**
 * Per-tier performance. Inactive tiers stay listed whenever they carry sales,
 * so historical revenue never vanishes from the report.
 */
import type { ReportTierRow } from "@/lib/event-reporting";

export function ReportTierTable({
  rows,
  money,
  t,
}: {
  rows: ReportTierRow[];
  money: (cents: number) => string;
  t: (k: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        {t("events.reporting.noTiers")}
      </div>
    );
  }

  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
  const td = "whitespace-nowrap px-3 py-2 text-sm";

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="min-w-full">
        <thead className="border-b border-border">
          <tr>
            <th className={th}>{t("events.reporting.colTier")}</th>
            <th className={th}>{t("events.reporting.colPrice")}</th>
            <th className={th}>{t("events.reporting.colCapacity")}</th>
            <th className={th}>{t("events.reporting.colConfirmed")}</th>
            <th className={th}>{t("events.reporting.colRemaining")}</th>
            <th className={th}>{t("events.reporting.colSellThrough")}</th>
            <th className={th}>{t("events.reporting.colGross")}</th>
            <th className={th}>{t("events.reporting.colRefunds")}</th>
            <th className={th}>{t("events.reporting.colNet")}</th>
            <th className={th}>{t("events.reporting.colCheckIns")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className={td}>
                <span className="font-semibold">{r.name || t("events.reporting.tierRemoved")}</span>
                {!r.isActive ? (
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {t("events.reporting.tierInactive")}
                  </span>
                ) : null}
              </td>
              <td className={td}>{r.priceCents === null ? "—" : money(r.priceCents)}</td>
              <td className={td}>{r.capacity ?? t("events.reporting.noCapacityShort")}</td>
              <td className={td}>{r.confirmed}</td>
              <td className={td}>{r.remaining ?? "—"}</td>
              <td className={td}>{r.sellThrough === null ? "—" : `${r.sellThrough}%`}</td>
              <td className={td}>{money(r.grossCents)}</td>
              <td className={td}>{money(r.refundCents)}</td>
              <td className={td}>{money(r.netCents)}</td>
              <td className={td}>{r.checkedIn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

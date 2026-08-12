/**
 * The single filter set every number on the reporting screen obeys — KPI
 * cards, tier table, charts and the CSV export all read this state.
 */
import type { ReportFilters as Filters, ReportGrouping } from "@/lib/event-reporting";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ReportFilters({
  filters,
  setFilters,
  grouping,
  setGrouping,
  tiers,
  onExport,
  exporting,
  t,
}: {
  filters: Filters;
  setFilters: (next: Filters) => void;
  grouping: ReportGrouping;
  setGrouping: (next: ReportGrouping) => void;
  tiers: { id: string; name: string }[];
  onExport: () => void | Promise<void>;
  exporting: boolean;
  t: (k: string) => string;
}) {
  const patch = (next: Partial<Filters>) => setFilters({ ...filters, ...next });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Labelled label={t("events.reporting.filterTier")}>
          <select
            className={inputClass}
            value={filters.tier}
            onChange={(e) => patch({ tier: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            <option value="none">{t("events.reporting.tierNone")}</option>
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name || t("events.reporting.tierRemoved")}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label={t("events.filterStatus")}>
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            <option value="confirmed">{t("events.reporting.statusConfirmed")}</option>
            <option value="cancelled">{t("events.reporting.statusCancelled")}</option>
          </select>
        </Labelled>
        <Labelled label={t("events.reporting.filterPayment")}>
          <select
            className={inputClass}
            value={filters.payment}
            onChange={(e) => patch({ payment: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            <option value="not_required">{t("events.reporting.paymentFree")}</option>
            <option value="pending">{t("events.reporting.paymentPending")}</option>
            <option value="paid">{t("events.reporting.paymentPaid")}</option>
            <option value="expired">{t("events.reporting.paymentExpired")}</option>
            <option value="refunded">{t("events.reporting.paymentRefunded")}</option>
          </select>
        </Labelled>
        <Labelled label={t("events.reporting.filterCheckIn")}>
          <select
            className={inputClass}
            value={filters.checkIn}
            onChange={(e) => patch({ checkIn: e.target.value })}
          >
            <option value="all">{t("events.filterAll")}</option>
            <option value="in">{t("events.checkIn.filterIn")}</option>
            <option value="out">{t("events.checkIn.filterOut")}</option>
          </select>
        </Labelled>
        <Labelled label={t("events.reporting.filterFrom")}>
          <input
            type="date"
            className={inputClass}
            value={filters.from}
            onChange={(e) => patch({ from: e.target.value })}
          />
        </Labelled>
        <Labelled label={t("events.reporting.filterTo")}>
          <input
            type="date"
            className={inputClass}
            value={filters.to}
            onChange={(e) => patch({ to: e.target.value })}
          />
        </Labelled>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-border p-1">
          {(["day", "week"] as ReportGrouping[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrouping(g)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                grouping === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t(`events.reporting.group${g === "day" ? "Day" : "Week"}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFilters({ ...filters, tier: "all", status: "all", payment: "all", checkIn: "all", from: "", to: "" })}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary"
        >
          {t("events.reporting.reset")}
        </button>
        <button
          type="button"
          onClick={() => void onExport()}
          disabled={exporting}
          className="ml-auto rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
        >
          {exporting ? t("events.exporting") : t("events.reporting.exportCsv")}
        </button>
      </div>
    </div>
  );
}

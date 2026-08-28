/**
 * Range bar. Owns no data: it reports the selected preset (or custom dates)
 * upwards and the page reloads the whole payload for it.
 */
import { RANGE_KEYS, type OverviewRangeKey } from "@/lib/chapter-overview";

export function OverviewRangeBar({
  value,
  custom,
  onChange,
  onCustomChange,
  loading,
  t,
}: {
  value: OverviewRangeKey;
  custom: { from: string; to: string };
  onChange: (key: OverviewRangeKey) => void;
  onCustomChange: (custom: { from: string; to: string }) => void;
  loading: boolean;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {RANGE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
              (key === value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground")
            }
          >
            {t(`overview.range.${key}`)}
          </button>
        ))}
      </div>

      {value === "custom" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={custom.from}
            max={custom.to || undefined}
            onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
            aria-label={t("overview.range.from")}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="date"
            value={custom.to}
            min={custom.from || undefined}
            onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
            className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
            aria-label={t("overview.range.to")}
          />
        </div>
      ) : null}

      {loading ? (
        <span className="text-xs text-muted-foreground">{t("overview.loading")}</span>
      ) : null}
    </div>
  );
}

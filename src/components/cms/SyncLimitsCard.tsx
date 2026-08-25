/**
 * Technical limits card (admin, integration screen).
 *
 * Tuning values used by the member sync and its exports. They live on the
 * `coach_finder_config` singleton row, whose internal columns are not granted
 * to `authenticated` over the Data API — the row is therefore read through the
 * staff-gated server function and written back on blur.
 */
import { useEffect, useState } from "react";
import { Input } from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { supabase } from "@/integrations/supabase/client";
import { getCoachFinderConfigForStaff } from "@/lib/coach-finder-config.functions";
import { type CoachFinderConfig } from "@/lib/vocabularies";

const CARD = "rounded-2xl border border-border bg-card p-5";
const NUMBERS = [
  { field: "feed_drop_threshold_pct", key: "feedDrop" },
  { field: "snapshot_retention_months", key: "retention" },
  { field: "csv_export_row_cap", key: "csvCap" },
] as const;

export function SyncLimitsCard() {
  const { t } = useCms();
  const [config, setConfig] = useState<CoachFinderConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setConfig(await getCoachFinderConfigForStaff());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load settings");
      }
    })();
  }, []);

  const patch = async (values: Partial<CoachFinderConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...values } : prev));
    const { error: err } = await supabase.from("coach_finder_config").update(values).eq("id", true);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section className={CARD}>
      <h2 className="text-sm font-bold">{t("integration.limitsTitle")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("integration.limitsBody")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <p className="mt-1 h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
        {saved ? t("integration.saved") : ""}
      </p>

      {!config ? (
        <p className="text-xs text-muted-foreground">{t("integration.limitsLoading")}</p>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {NUMBERS.map((n) => (
            <label key={n.field} className="text-xs text-muted-foreground">
              {t(`integration.limits.${n.key}`)}
              <Input
                type="number"
                min={1}
                value={config[n.field]}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, [n.field]: Number(e.target.value) } : prev,
                  )
                }
                onBlur={(e) => void patch({ [n.field]: Number(e.target.value) })}
                className="mt-1"
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

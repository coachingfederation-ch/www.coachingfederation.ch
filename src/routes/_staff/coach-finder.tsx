/**
 * Coach Finder configuration route (/_staff/coach-finder).
 * Exports: Route. Renders the admin settings for directory display,
 * sorting, search facets, and internal tuning parameters.
 */

import { createFileRoute } from "@tanstack/react-router";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { getCoachFinderConfigForStaff } from "@/lib/coach-finder-config.functions";
import { type CoachFinderConfig } from "@/lib/vocabularies";

export const Route = createFileRoute("/_staff/coach-finder")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Coach Finder settings — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachFinderSettingsPage,
});

const FACETS = [
  { enabled: "coaching_enabled", label: "coaching_label", key: "coaching" },
  { enabled: "mentoring_enabled", label: "mentoring_label", key: "mentoring" },
  { enabled: "supervision_enabled", label: "supervision_label", key: "supervision" },
] as const;

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/20";

function CoachFinderSettingsPage() {
  const { t } = useCms();
  const [config, setConfig] = useState<CoachFinderConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      // The internal tuning columns are not granted to `authenticated` over
      // the Data API, so the full row comes from a staff-gated server function.
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
    <Shell>
      <div className="mx-auto max-w-3xl px-10 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("finder.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("finder.subtitle")}</p>
        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
        <p className="mt-3 h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
          {saved ? t("finder.saved") : ""}
        </p>

        {!config ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("finder.loading")}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">{t("finder.modes")}</h2>
              <div className="mt-3 space-y-3">
                {FACETS.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="inline-flex w-40 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={config[f.enabled]}
                        onChange={(e) => void patch({ [f.enabled]: e.target.checked })}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                      {t(`finder.facets.${f.key}`)}
                    </label>
                    <input
                      value={config[f.label]}
                      aria-label={t(`finder.facets.${f.key}`) + " — " + t("finder.label")}
                      onChange={(e) =>
                        setConfig((prev) => (prev ? { ...prev, [f.label]: e.target.value } : prev))
                      }
                      onBlur={(e) => void patch({ [f.label]: e.target.value })}
                      className={INPUT + " flex-1"}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">{t("finder.display")}</h2>
              <label className="mt-3 block text-xs text-muted-foreground">
                {t("finder.defaultSort")}
                <select
                  value={config.default_sort}
                  onChange={(e) => void patch({ default_sort: e.target.value })}
                  className={INPUT + " mt-1 block w-56"}
                >
                  <option value="random">{t("finder.sort.random")}</option>
                  <option value="name">{t("finder.sort.name")}</option>

                  <option value="credential">{t("finder.sort.credential")}</option>
                  <option value="recent">{t("finder.sort.recent")}</option>
                </select>
              </label>
              <label className="mt-3 block text-xs text-muted-foreground">
                {t("finder.numbers.pageSize")}
                <Input
                  type="number"
                  min={1}
                  value={config.page_size}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev ? { ...prev, page_size: Number(e.target.value) } : prev,
                    )
                  }
                  onBlur={(e) => void patch({ page_size: Number(e.target.value) })}
                  className="mt-1 w-56"
                />
              </label>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold">{t("finder.eligibility.title")}</h2>
              <div className="mt-3 flex items-start gap-3">
                <Switch
                  id="allow-non-credentialed"
                  checked={config.allow_non_credentialed}
                  onCheckedChange={(checked) => void patch({ allow_non_credentialed: checked })}
                />
                <label htmlFor="allow-non-credentialed" className="text-sm">
                  {t("finder.eligibility.allowNonCredentialed")}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t("finder.eligibility.allowNonCredentialedHint")}
                  </span>
                </label>
              </div>
            </section>
          </div>
        )}
      </div>
    </Shell>
  );
}

/**
 * Feature switches card (admin, Integration page → Settings).
 *
 * Turns whole features on or off for visitors and members. Switching off asks
 * for confirmation; switching on applies immediately. Writes go to the
 * integration_config singleton (admin-only RLS) and stamp who changed it.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Switch,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { supabase } from "@/integrations/supabase/client";
import { FEATURE_COLUMNS, type FeatureName } from "@/lib/feature-flags";
import type { IntegrationConfig } from "@/lib/integration";

const CARD = "rounded-2xl border border-border bg-card p-5";
const FEATURES: { name: FeatureName; key: string }[] = [
  { name: "europe_pulse", key: "featureEuropePulse" },
  { name: "advertising", key: "featureAdvertising" },
];

export function FeatureTogglesCard({
  config,
  onChanged,
}: {
  config: IntegrationConfig;
  onChanged: () => void;
}) {
  const { t } = useCms();
  const queryClient = useQueryClient();
  const [pendingOff, setPendingOff] = useState<FeatureName | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = (name: FeatureName) =>
    (config as unknown as Record<string, boolean>)[FEATURE_COLUMNS[name]] !== false;

  const save = async (name: FeatureName, enabled: boolean) => {
    setBusy(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const { error: err } = await supabase
      .from("integration_config")
      .update({
        [FEATURE_COLUMNS[name]]: enabled,
        features_updated_at: new Date().toISOString(),
        features_updated_by: auth.user?.id ?? null,
      } as never)
      })
      .eq("id", true);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    onChanged();
  };

  const label = (name: FeatureName) =>
    t(`integration.${FEATURES.find((f) => f.name === name)!.key}Title`);

  return (
    <section id="section-features" className={CARD + " scroll-mt-6"}>
      <h2 className="text-sm font-bold">{t("integration.featuresTitle")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("integration.featuresBody")}</p>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      <ul className="mt-4 divide-y divide-border">
        {FEATURES.map((f) => {
          const on = value(f.name);
          const id = `feature-${f.name}`;
          return (
            <li key={f.name} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <label htmlFor={id} className="text-sm font-semibold">
                  {t(`integration.${f.key}Title`)}
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`integration.${f.key}Body`)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {on ? t("integration.featureOn") : t("integration.featureOff")}
                </span>
                <Switch
                  id={id}
                  checked={on}
                  disabled={busy}
                  onCheckedChange={(next) => {
                    if (next) void save(f.name, true);
                    else setPendingOff(f.name);
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {config.features_updated_at ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("integration.featuresLastChanged")}{" "}
          {new Date(config.features_updated_at).toLocaleString()}
        </p>
      ) : null}

      <AlertDialog open={pendingOff !== null} onOpenChange={(o) => !o && setPendingOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("integration.featureConfirmTitle")} {pendingOff ? label(pendingOff) : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("integration.featureConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("integration.featureConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const name = pendingOff;
                setPendingOff(null);
                if (name) void save(name, false);
              }}
            >
              {t("integration.featureConfirmOff")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

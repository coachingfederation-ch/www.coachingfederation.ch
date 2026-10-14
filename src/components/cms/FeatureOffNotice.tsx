/**
 * Staff-side notice shown on a feature's management screen while the feature
 * is switched off on the Integration page.
 */
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { featureFlagsQueryOptions, type FeatureName } from "@/lib/feature-flags";

export function FeatureOffNotice({ feature }: { feature: FeatureName }) {
  const { t } = useCms();
  const { data } = useQuery(featureFlagsQueryOptions);
  if (!data || data[feature]) return null;
  return (
    <p
      role="status"
      className="mb-6 flex items-start gap-2 rounded-2xl border border-border bg-secondary p-4 text-sm text-secondary-foreground"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {t("integration.featureOffStaffNotice")}
    </p>
  );
}

/** Public notice for visitors while advertising bookings are paused. */
export function AdvertisingPausedNotice() {
  const { t } = useCms();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center">
        <h1 className="font-heading text-2xl text-foreground">{t("advertise.paused.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("advertise.paused.body")}</p>
        <p className="mt-4 text-sm text-muted-foreground">office@coachingfederation.ch</p>
      </div>
    </div>
  );
}

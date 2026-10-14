/**
 * Feature switches (Integration page → Features).
 *
 * The switches live on the `integration_config` singleton. Public pages read
 * only the two booleans through the `feature_flags()` definer function, so the
 * rest of the config row stays admin-only. A missing or unreadable value means
 * "on": a read failure must never silently hide a feature.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureName = "europe_pulse" | "advertising";
export type FeatureFlags = Record<FeatureName, boolean>;

export const FEATURE_DEFAULTS: FeatureFlags = { europe_pulse: true, advertising: true };

/** Column on integration_config that stores each switch. */
export const FEATURE_COLUMNS: Record<FeatureName, string> = {
  europe_pulse: "feature_europe_pulse_enabled",
  advertising: "feature_advertising_enabled",
};

export function parseFeatureFlags(raw: unknown): FeatureFlags {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    europe_pulse: value.europe_pulse !== false,
    advertising: value.advertising !== false,
  };
}

/** Where an ad click goes: the advertiser only while advertising is on. */
export function adClickDestination(flags: FeatureFlags, ctaUrl: string | null): string {
  if (!flags.advertising) return "/";
  return ctaUrl && /^https?:\/\//i.test(ctaUrl) ? ctaUrl : "/";
}

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("feature_flags");
    if (error) return FEATURE_DEFAULTS;
    return parseFeatureFlags(data);
  } catch {
    return FEATURE_DEFAULTS;
  }
}

export const featureFlagsQueryOptions = queryOptions({
  queryKey: ["feature-flags"],
  queryFn: fetchFeatureFlags,
  staleTime: 60_000,
});

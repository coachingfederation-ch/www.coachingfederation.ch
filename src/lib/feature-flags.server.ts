/**
 * Server-side feature switch checks. Reads the switches with the admin client
 * so cron and server functions see the stored value regardless of caller.
 */
import { FEATURE_DEFAULTS, parseFeatureFlags, type FeatureFlags, type FeatureName } from "./feature-flags";

export async function loadFeatureFlagsServer(): Promise<FeatureFlags> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin as any).rpc("feature_flags");
    if (error) return FEATURE_DEFAULTS;
    return parseFeatureFlags(data);
  } catch {
    return FEATURE_DEFAULTS;
  }
}

export class FeatureDisabledError extends Error {
  constructor(feature: FeatureName) {
    super(`This feature is currently switched off (${feature}).`);
    this.name = "FeatureDisabledError";
  }
}

/** Throws when the feature is switched off. */
export async function requireFeature(feature: FeatureName): Promise<void> {
  const flags = await loadFeatureFlagsServer();
  if (!flags[feature]) throw new FeatureDisabledError(feature);
}

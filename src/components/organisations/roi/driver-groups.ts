/** Value-driver grouping shared by the results page and the pitch deck. */
import type { DriverKey } from "@/lib/roi-model";

export type DriverGroupKey = "people" | "performance" | "leadership";

export const DRIVER_GROUPS: { key: DriverGroupKey; drivers: DriverKey[] }[] = [
  { key: "people", drivers: ["retention", "recruiting", "absence"] },
  { key: "performance", drivers: ["productivity", "engagement"] },
  { key: "leadership", drivers: ["derail", "ramp"] },
];

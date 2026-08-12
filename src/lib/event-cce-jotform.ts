/**
 * The single place that knows about ICF's official Jotform.
 *
 * Jotform prefills from query parameters keyed by the *form's own* field ids
 * (`q12_name`, …). Those ids are not published and we have no owner access to
 * the chapter CCE form, so only the handful of generic parameters below are
 * sent. Everything else is listed as manual and offered with a copy button in
 * the review screen — deliberately, because a wrong guess would silently drop
 * data from an official ICF submission.
 *
 * When the form owner supplies the real field ids, extend `JOTFORM_PREFILL`
 * and move entries out of `JOTFORM_MANUAL_FIELDS`. Nothing else changes.
 */
export const JOTFORM_URL = "https://coachingfederation.jotform.com/30775334564963";

/** Summary keys we can pass through today, mapped to Jotform parameter names. */
export const JOTFORM_PREFILL: { key: string; param: string }[] = [
  { key: "eventTitle", param: "eventTitle" },
  { key: "contactName", param: "name" },
  { key: "contactEmail", param: "email" },
];

/**
 * Summary keys that must be typed into Jotform by hand. Kept explicit so the
 * review page can render an honest "still to enter" checklist.
 */
export const JOTFORM_MANUAL_FIELDS = [
  "eventDate",
  "eventTime",
  "timezone",
  "language",
  "location",
  "deliveryMethod",
  "primaryFacilitator",
  "additionalFacilitators",
  "targetAudience",
  "learningObjectives",
  "completionRequirements",
  "attendanceMonitoring",
  "coreCompetencyHours",
  "resourceDevelopmentHours",
  "totalHours",
  "breakMinutes",
  "contentRationale",
  "schedule",
  "supportingMaterial",
] as const;

/** Builds the "open pre-filled official application" URL. */
export function jotformUrl(values: Record<string, string>) {
  const url = new URL(JOTFORM_URL);
  for (const { key, param } of JOTFORM_PREFILL) {
    const value = values[key];
    if (value) url.searchParams.set(param, value);
  }
  return url.toString();
}

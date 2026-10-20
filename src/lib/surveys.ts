/**
 * Public surveys — client-safe rules.
 *
 * A survey reuses the Forms question engine but is answered by anyone with
 * the link. Questions are stored as JSON in the template shape (conditions by
 * position), so this module maps them to the public renderer's shape and
 * decides whether a survey currently accepts answers. The server re-runs the
 * same checks before storing anything.
 */
import type { Locale } from "@/i18n/config";
import { localisedColumn, type PublicFormQuestion, type QuestionType } from "./event-forms";

export const SURVEY_STATUSES = ["draft", "open", "closed"] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

export type SurveyAvailability = "open" | "draft" | "not_open" | "closed" | "full";

export function surveyAvailability(
  survey: {
    status: SurveyStatus;
    opens_at: string | null;
    closes_at: string | null;
    max_responses: number | null;
  },
  responseCount: number,
  now: Date = new Date(),
): SurveyAvailability {
  if (survey.status === "draft") return "draft";
  if (survey.status === "closed") return "closed";
  if (survey.opens_at && new Date(survey.opens_at) > now) return "not_open";
  if (survey.closes_at && new Date(survey.closes_at) <= now) return "closed";
  if (survey.max_responses !== null && responseCount >= survey.max_responses) return "full";
  return "open";
}

type StoredQuestion = Record<string, unknown>;

function optionLabels(row: StoredQuestion, locale: Locale): string[] {
  const canonical = (row["options"] as string[] | null) ?? [];
  if (locale === "en") return canonical;
  const tr = (row[`options_${locale}`] as string[] | null) ?? null;
  if (!tr || tr.length !== canonical.length) return canonical;
  return canonical.map((v, i) => (tr[i] ?? "").trim() || v);
}

/** Stored survey questions → what the public renderer needs, in one locale. */
export function surveyQuestions(rows: StoredQuestion[], locale: Locale): PublicFormQuestion[] {
  return rows.map((row, i) => {
    const ci = Number(row["condition_index"] ?? -1);
    const hasCondition = ci >= 0 && ci < i;
    return {
      id: `q${i}`,
      key: String(row["question_key"] ?? `q${i}`),
      type: row["qtype"] as QuestionType,
      label: localisedColumn(row, "label", locale) ?? "",
      help: localisedColumn(row, "help_text", locale),
      options: (row["options"] as string[] | null) ?? [],
      optionLabels: optionLabels(row, locale),
      ratingMax: Number(row["rating_max"] ?? 5),
      scaleLow: localisedColumn(row, "scale_low_label", locale),
      scaleHigh: localisedColumn(row, "scale_high_label", locale),
      required: Boolean(row["is_required"]),
      conditionQuestionId: hasCondition ? `q${ci}` : null,
      conditionValue: hasCondition ? ((row["condition_value"] as string | null) ?? null) : null,
    };
  });
}

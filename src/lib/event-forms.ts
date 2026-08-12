/**
 * Event forms — client-safe vocabulary.
 *
 * One small form engine used in two places: the questions asked while someone
 * registers for an event, and the follow-up form emailed to confirmed
 * attendees afterwards. Nothing here decides access or trust; the server
 * re-derives visibility and validity from the same rules before storing an
 * answer.
 */
import type { Locale } from "@/i18n/config";

export const FORM_KINDS = ["registration", "follow_up"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "yes_no",
  "rating",
  "heading",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Types that can carry a condition (an earlier question with fixed answers). */
export const CONDITIONABLE_TYPES: QuestionType[] = ["single_choice", "yes_no"];

/** Multi-choice answers are stored as one string; this is the separator. */
export const MULTI_SEPARATOR = " | ";

export type PublicFormQuestion = {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  help: string | null;
  options: string[];
  ratingMax: number;
  scaleLow: string | null;
  scaleHigh: string | null;
  required: boolean;
  conditionQuestionId: string | null;
  conditionValue: string | null;
};

export type PublicForm = {
  id: string;
  kind: FormKind;
  thankYou: string | null;
  intro: string | null;
  questions: PublicFormQuestion[];
};

/** Picks the locale column with a fall back to the source (EN) text. */
export function localisedColumn(
  row: Record<string, unknown>,
  base: string,
  locale: Locale,
): string | null {
  const fallback = (row[base] as string | null | undefined) ?? null;
  if (locale === "en") return fallback;
  const translated = (row[`${base}_${locale}`] as string | null | undefined) ?? null;
  return translated && translated.trim() ? translated : fallback;
}

/**
 * A question is answerable unless it is a heading, or its single condition
 * points at an earlier question whose answer is something else. An unmet
 * condition means the question is neither shown nor validated.
 */
export function isQuestionVisible(
  question: PublicFormQuestion,
  answers: Record<string, string>,
  byId: Map<string, PublicFormQuestion>,
): boolean {
  if (!question.conditionQuestionId || question.conditionValue === null) return true;
  const source = byId.get(question.conditionQuestionId);
  if (!source) return true;
  const given = (answers[source.key] ?? "").trim();
  return given === question.conditionValue;
}

/** The questions actually shown, in order, given the answers so far. */
export function visibleQuestions(
  questions: PublicFormQuestion[],
  answers: Record<string, string>,
): PublicFormQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return questions.filter((q) => isQuestionVisible(q, answers, byId));
}

/** The answers a condition may test against, for the editor's value picker. */
export function conditionValuesFor(question: PublicFormQuestion | undefined): string[] {
  if (!question) return [];
  if (question.type === "yes_no") return ["true", "false"];
  if (question.type === "single_choice") return question.options;
  return [];
}

export type AnswerCheck = { ok: true; value: string } | { ok: false };

/**
 * Normalises and checks one answer against its question. Shared by the public
 * form and the server so the browser never sees a rule the server does not
 * apply, and vice versa.
 */
export function checkAnswer(question: PublicFormQuestion, raw: string): AnswerCheck {
  const value = (raw ?? "").toString().trim().slice(0, 2000);
  switch (question.type) {
    case "heading":
      return { ok: true, value: "" };
    case "yes_no": {
      const checked = value === "true";
      if (question.required && !checked) return { ok: false };
      return { ok: true, value: checked ? "true" : "false" };
    }
    case "single_choice": {
      if (value && !question.options.includes(value)) return { ok: false };
      if (question.required && !value) return { ok: false };
      return { ok: true, value };
    }
    case "multi_choice": {
      const picked = value
        ? value
            .split(MULTI_SEPARATOR)
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
      if (picked.some((v) => !question.options.includes(v))) return { ok: false };
      if (question.required && picked.length === 0) return { ok: false };
      return { ok: true, value: picked.join(MULTI_SEPARATOR) };
    }
    case "rating": {
      if (!value) return question.required ? { ok: false } : { ok: true, value: "" };
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > question.ratingMax) return { ok: false };
      return { ok: true, value: String(n) };
    }
    default: {
      if (question.required && !value) return { ok: false };
      return { ok: true, value };
    }
  }
}

/**
 * Validates a whole submission: drops answers to hidden questions, refuses a
 * missing required answer, and returns only the keys the organizer asked for.
 */
export function validateSubmission(
  questions: PublicFormQuestion[],
  answers: Record<string, string>,
): { ok: true; answers: Record<string, string> } | { ok: false } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cleaned: Record<string, string> = {};
  for (const question of questions) {
    if (question.type === "heading") continue;
    if (!isQuestionVisible(question, answers, byId)) continue;
    const check = checkAnswer(question, answers[question.key] ?? "");
    if (!check.ok) return { ok: false };
    if (check.value !== "") cleaned[question.key] = check.value;
  }
  return { ok: true, answers: cleaned };
}

/** Human-readable answer for tables, CSV and confirmation emails. */
export function displayAnswer(
  question: Pick<PublicFormQuestion, "type">,
  value: string,
  yes = "Yes",
  no = "No",
): string {
  if (question.type === "yes_no") return value === "true" ? yes : no;
  return value;
}

/** A stable key derived from the label, unique within the form. */
export function questionKeyFrom(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "question";
  let key = base;
  let n = 2;
  while (taken.includes(key)) key = `${base}_${n++}`;
  return key;
}
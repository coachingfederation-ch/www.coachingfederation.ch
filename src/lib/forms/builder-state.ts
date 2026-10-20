/**
 * State for the form builder, shared by event forms and library templates.
 *
 * Questions carry a client-only `uid`, and a "show only if" rule points at the
 * uid of its source question rather than at a position. Reordering therefore
 * keeps rules intact; a rule is only dropped when its source would no longer
 * come before it, or when the source is removed. Positions (`condition_index`)
 * are produced at the save boundary, which is what the server expects.
 */
import { questionKeyFrom, type PublicFormQuestion, type QuestionType } from "@/lib/event-forms";

export const TRANSLATED_LOCALES = ["de", "fr", "it"] as const;
export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];
type Trans = Record<TranslatedLocale, string>;

export type BuilderQuestion = {
  uid: string;
  id: string | null;
  question_key: string;
  qtype: QuestionType;
  label: string;
  label_de: string;
  label_fr: string;
  label_it: string;
  help_text: string;
  help_text_de: string;
  help_text_fr: string;
  help_text_it: string;
  options: string[];
  options_de: string[];
  options_fr: string[];
  options_it: string[];
  rating_max: number;
  scale_low_label: string;
  scale_low_label_de: string;
  scale_low_label_fr: string;
  scale_low_label_it: string;
  scale_high_label: string;
  scale_high_label_de: string;
  scale_high_label_fr: string;
  scale_high_label_it: string;
  is_required: boolean;
  condition_uid: string | null;
  condition_value: string;
};

export type BuilderForm = {
  name: string;
  active: boolean;
  autoSend: boolean;
  autoSentAt: string | null;
  intro: string;
  thankYou: string;
  introTrans: Trans;
  thankYouTrans: Trans;
  questions: BuilderQuestion[];
};

let counter = 0;
export function makeUid(): string {
  counter += 1;
  return `q${Date.now().toString(36)}${counter}`;
}

const blankTrans = (): Trans => ({ de: "", fr: "", it: "" });

export function emptyForm(name = ""): BuilderForm {
  return {
    name,
    active: true,
    autoSend: true,
    autoSentAt: null,
    intro: "",
    thankYou: "",
    introTrans: blankTrans(),
    thankYouTrans: blankTrans(),
    questions: [],
  };
}

export function newQuestion(qtype: QuestionType = "short_text"): BuilderQuestion {
  return {
    uid: makeUid(),
    id: null,
    question_key: "",
    qtype,
    label: "",
    label_de: "",
    label_fr: "",
    label_it: "",
    help_text: "",
    help_text_de: "",
    help_text_fr: "",
    help_text_it: "",
    options: qtype === "single_choice" || qtype === "multi_choice" ? ["", ""] : [],
    options_de: [],
    options_fr: [],
    options_it: [],
    rating_max: 5,
    scale_low_label: "",
    scale_low_label_de: "",
    scale_low_label_fr: "",
    scale_low_label_it: "",
    scale_high_label: "",
    scale_high_label_de: "",
    scale_high_label_fr: "",
    scale_high_label_it: "",
    is_required: false,
    condition_uid: null,
    condition_value: "",
  };
}

export const usesOptions = (q: { qtype: QuestionType }) =>
  q.qtype === "single_choice" || q.qtype === "multi_choice";

/** A rule may only point at an earlier single-choice or yes/no question. */
export const canBeConditionSource = (q: BuilderQuestion) =>
  q.qtype === "single_choice" || q.qtype === "yes_no";

/** Clears every rule whose source is gone or no longer comes first. */
function repairConditions(questions: BuilderQuestion[]): BuilderQuestion[] {
  return questions.map((q, i) => {
    if (!q.condition_uid) return q;
    const at = questions.findIndex((s) => s.uid === q.condition_uid);
    const source = questions[at];
    if (at < 0 || at >= i || !source || !canBeConditionSource(source)) {
      return { ...q, condition_uid: null, condition_value: "" };
    }
    return q;
  });
}

export type BuilderAction =
  | { type: "replace"; form: BuilderForm }
  | { type: "setForm"; patch: Partial<Omit<BuilderForm, "questions">> }
  | { type: "add"; qtype: QuestionType; at: number; uid?: string }
  | { type: "append"; questions: BuilderQuestion[] }
  | { type: "patch"; uid: string; patch: Partial<BuilderQuestion> }
  | { type: "remove"; uid: string }
  | { type: "move"; uid: string; to: number };

export function builderReducer(state: BuilderForm, action: BuilderAction): BuilderForm {
  switch (action.type) {
    case "replace":
      return action.form;
    case "setForm":
      return { ...state, ...action.patch };
    case "add": {
      const q = { ...newQuestion(action.qtype), ...(action.uid ? { uid: action.uid } : {}) };
      const at = Math.max(0, Math.min(action.at, state.questions.length));
      const next = [...state.questions];
      next.splice(at, 0, q);
      return { ...state, questions: next };
    }
    case "append":
      return { ...state, questions: [...state.questions, ...action.questions] };
    case "patch":
      return {
        ...state,
        questions: repairConditions(
          state.questions.map((q) => (q.uid === action.uid ? { ...q, ...action.patch } : q)),
        ),
      };
    case "remove":
      return {
        ...state,
        questions: repairConditions(state.questions.filter((q) => q.uid !== action.uid)),
      };
    case "move": {
      const from = state.questions.findIndex((q) => q.uid === action.uid);
      if (from < 0) return state;
      const to = Math.max(0, Math.min(action.to, state.questions.length - 1));
      if (to === from) return state;
      const next = [...state.questions];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row!);
      return { ...state, questions: repairConditions(next) };
    }
  }
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

/** Builds a question from a stored row (event question or template entry). */
function rowToQuestion(row: Record<string, unknown>): BuilderQuestion {
  return {
    ...newQuestion((row["qtype"] as QuestionType) ?? "short_text"),
    id: row["id"] ? String(row["id"]) : null,
    question_key: str(row["question_key"]),
    label: str(row["label"]),
    label_de: str(row["label_de"]),
    label_fr: str(row["label_fr"]),
    label_it: str(row["label_it"]),
    help_text: str(row["help_text"]),
    help_text_de: str(row["help_text_de"]),
    help_text_fr: str(row["help_text_fr"]),
    help_text_it: str(row["help_text_it"]),
    options: list(row["options"]),
    options_de: list(row["options_de"]),
    options_fr: list(row["options_fr"]),
    options_it: list(row["options_it"]),
    rating_max: Number(row["rating_max"] ?? 5),
    scale_low_label: str(row["scale_low_label"]),
    scale_low_label_de: str(row["scale_low_label_de"]),
    scale_low_label_fr: str(row["scale_low_label_fr"]),
    scale_low_label_it: str(row["scale_low_label_it"]),
    scale_high_label: str(row["scale_high_label"]),
    scale_high_label_de: str(row["scale_high_label_de"]),
    scale_high_label_fr: str(row["scale_high_label_fr"]),
    scale_high_label_it: str(row["scale_high_label_it"]),
    is_required: Boolean(row["is_required"]),
    condition_value: str(row["condition_value"]),
  };
}

/** Event rows link conditions by question id. */
export function questionsFromEventRows(rows: Record<string, unknown>[]): BuilderQuestion[] {
  const built = rows.map(rowToQuestion);
  return built.map((q, i) => {
    const cid = rows[i]?.["condition_question_id"];
    const source = cid ? built.find((s) => s.id === cid) : undefined;
    return source ? { ...q, condition_uid: source.uid } : { ...q, condition_value: "" };
  });
}

/** Template and copied rows link conditions by position. */
export function questionsFromIndexed(rows: Record<string, unknown>[]): BuilderQuestion[] {
  const built = rows.map((r) => ({ ...rowToQuestion(r), id: null }));
  return built.map((q, i) => {
    const ci = Number(rows[i]?.["condition_index"] ?? -1);
    const source = ci >= 0 && ci < i ? built[ci] : undefined;
    return source ? { ...q, condition_uid: source.uid } : { ...q, condition_value: "" };
  });
}

export function formFromEventRow(
  form: Record<string, unknown>,
  rows: Record<string, unknown>[],
): BuilderForm {
  return {
    name: str(form["name"]),
    active: Boolean(form["is_active"]),
    autoSend: form["auto_send"] === undefined ? true : Boolean(form["auto_send"]),
    autoSentAt: (form["auto_sent_at"] as string | null) ?? null,
    intro: str(form["intro"]),
    thankYou: str(form["thank_you"]),
    introTrans: { de: str(form["intro_de"]), fr: str(form["intro_fr"]), it: str(form["intro_it"]) },
    thankYouTrans: {
      de: str(form["thank_you_de"]),
      fr: str(form["thank_you_fr"]),
      it: str(form["thank_you_it"]),
    },
    questions: questionsFromEventRows(rows),
  };
}

const orNull = (s: string) => (s.trim() === "" ? null : s);

/** The question list in the shape `saveEventForm` and templates store. */
export function toQuestionPayload(questions: BuilderQuestion[]) {
  const taken: string[] = [];
  return questions.map((q) => {
    const key = q.question_key || questionKeyFrom(q.label, taken);
    taken.push(key);
    const options = q.options.filter((o) => o.trim() !== "");
    const aligned = (l: string[]) => (l.length === options.length ? l : null);
    const ci = q.condition_uid ? questions.findIndex((s) => s.uid === q.condition_uid) : -1;
    return {
      id: q.id,
      question_key: key,
      qtype: q.qtype,
      label: q.label,
      label_de: orNull(q.label_de),
      label_fr: orNull(q.label_fr),
      label_it: orNull(q.label_it),
      help_text: orNull(q.help_text),
      help_text_de: orNull(q.help_text_de),
      help_text_fr: orNull(q.help_text_fr),
      help_text_it: orNull(q.help_text_it),
      options,
      options_de: aligned(q.options_de),
      options_fr: aligned(q.options_fr),
      options_it: aligned(q.options_it),
      rating_max: q.rating_max,
      scale_low_label: orNull(q.scale_low_label),
      scale_low_label_de: orNull(q.scale_low_label_de),
      scale_low_label_fr: orNull(q.scale_low_label_fr),
      scale_low_label_it: orNull(q.scale_low_label_it),
      scale_high_label: orNull(q.scale_high_label),
      scale_high_label_de: orNull(q.scale_high_label_de),
      scale_high_label_fr: orNull(q.scale_high_label_fr),
      scale_high_label_it: orNull(q.scale_high_label_it),
      is_required: q.is_required,
      condition_index: ci,
      condition_value: ci >= 0 ? orNull(q.condition_value) : null,
    };
  });
}

/** Problems that would make the save fail, as translation keys. */
export function validateForm(form: BuilderForm): string[] {
  const issues: string[] = [];
  if (form.name.trim().length < 2) issues.push("forms.issue.name");
  if (form.questions.some((q) => q.label.trim() === "")) issues.push("forms.issue.label");
  if (form.questions.some((q) => usesOptions(q) && q.options.filter((o) => o.trim()).length < 2))
    issues.push("forms.issue.options");
  return issues;
}

type TranslationResult = Record<
  TranslatedLocale,
  {
    intro?: string | null;
    thankYou?: string | null;
    questions: {
      label?: string;
      help?: string | null;
      options?: string[];
      scaleLow?: string | null;
      scaleHigh?: string | null;
    }[];
  }
>;

/** Merges a machine translation into the form as ordinary editable text. */
export function applyTranslation(form: BuilderForm, result: TranslationResult): BuilderForm {
  const pick = (l: TranslatedLocale, k: "intro" | "thankYou") => result[l][k] ?? "";
  return {
    ...form,
    introTrans: { de: pick("de", "intro"), fr: pick("fr", "intro"), it: pick("it", "intro") },
    thankYouTrans: {
      de: pick("de", "thankYou"),
      fr: pick("fr", "thankYou"),
      it: pick("it", "thankYou"),
    },
    questions: form.questions.map((q, i) => {
      const next = { ...q };
      for (const l of TRANSLATED_LOCALES) {
        const r = result[l].questions[i];
        next[`label_${l}`] = r?.label ?? q[`label_${l}`];
        next[`help_text_${l}`] = r?.help ?? "";
        next[`options_${l}`] = r?.options ?? [];
        next[`scale_low_label_${l}`] = r?.scaleLow ?? "";
        next[`scale_high_label_${l}`] = r?.scaleHigh ?? "";
      }
      return next;
    }),
  };
}

/** The input `translateEventForm` expects. */
export function translationInput(form: BuilderForm, withTexts: boolean) {
  return {
    intro: withTexts ? orNull(form.intro) : null,
    thankYou: withTexts ? orNull(form.thankYou) : null,
    questions: form.questions.map((q) => ({
      label: q.label,
      help: orNull(q.help_text),
      options: q.options.filter((o) => o.trim() !== ""),
      scaleLow: q.qtype === "rating" ? orNull(q.scale_low_label) : null,
      scaleHigh: q.qtype === "rating" ? orNull(q.scale_high_label) : null,
    })),
  };
}

/** The questions as the attendee-facing renderer reads them. */
export function toPreviewQuestions(questions: BuilderQuestion[]): PublicFormQuestion[] {
  const payload = toQuestionPayload(questions);
  return questions.map((q, i) => {
    const options = payload[i]!.options;
    return {
      id: q.uid,
      key: payload[i]!.question_key || q.uid,
      type: q.qtype,
      label: q.label,
      help: orNull(q.help_text),
      options,
      optionLabels: options,
      ratingMax: q.rating_max,
      scaleLow: orNull(q.scale_low_label),
      scaleHigh: orNull(q.scale_high_label),
      required: q.is_required,
      conditionQuestionId: q.condition_uid,
      conditionValue: q.condition_uid ? orNull(q.condition_value) : null,
    };
  });
}

/** Stable comparison for the "unsaved changes" state; uids are ignored. */
export function snapshot(form: BuilderForm): string {
  return JSON.stringify({
    ...form,
    autoSentAt: null,
    questions: toQuestionPayload(form.questions),
  });
}

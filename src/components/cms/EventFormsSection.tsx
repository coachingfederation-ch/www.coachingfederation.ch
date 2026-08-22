/**
 * Custom forms for one event.
 *
 * Two kinds share one editor: the single registration form, whose questions
 * are asked during sign-up, and any number of follow-up forms, which are sent
 * to attendees afterwards. The whole question list is saved in one call so
 * reordering and conditions can never end up half-written.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Section } from "./EventEditorSections";
import {
  CONDITIONABLE_TYPES,
  QUESTION_TYPES,
  conditionValuesFor,
  questionKeyFrom,
  type QuestionType,
} from "@/lib/event-forms";
import {
  createEventForm,
  deleteEventForm,
  getEventForm,
  listCopyableForms,
  listEventForms,
  saveEventForm,
} from "@/lib/event-forms.functions";
import { translateEventForm } from "@/lib/event-form-translations.functions";

/** The locales every questionnaire is machine-translated into on save. */
const TRANSLATED_LOCALES = ["de", "fr", "it"] as const;
type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];

type FormRow = {
  id: string;
  kind: "registration" | "follow_up";
  name: string;
  is_active: boolean;
  question_count: number;
  sent_count: number;
  response_count: number;
};

type Draft = {
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
  condition_index: number;
  condition_value: string;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60";

function emptyDraft(): Draft {
  return {
    id: null,
    question_key: "",
    qtype: "short_text",
    label: "",
    label_de: "",
    label_fr: "",
    label_it: "",
    help_text: "",
    help_text_de: "",
    help_text_fr: "",
    help_text_it: "",
    options: [],
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
    condition_index: -1,
    condition_value: "",
  };
}

export function EventFormsSection({ eventId, t }: { eventId: string; t: (k: string) => string }) {
  const [forms, setForms] = useState<FormRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setForms((await listEventForms({ data: { eventId } })) as unknown as FormRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (kind: "registration" | "follow_up") => {
    setBusy(true);
    setError(null);
    try {
      const created = await createEventForm({
        data: {
          eventId,
          kind,
          name: kind === "registration" ? t("events.forms.registrationName") : t("events.forms.followUpName"),
        },
      });
      await load();
      setOpenId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const hasRegistration = forms.some((f) => f.kind === "registration");

  return (
    <Section title={t("events.forms.title")} hint={t("events.forms.hint")}>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3">
        {forms.map((form) => (
          <div key={form.id} className="rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-3 p-3">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                {form.kind === "registration"
                  ? t("events.forms.kindRegistration")
                  : t("events.forms.kindFollowUp")}
              </span>
              <span className="text-sm font-semibold">{form.name}</span>
              {!form.is_active ? (
                <span className="text-xs text-muted-foreground">{t("events.forms.inactive")}</span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {form.question_count} {t("events.forms.questionsLabel")}
                {form.kind === "follow_up"
                  ? ` · ${form.sent_count} ${t("events.forms.sentLabel")} · ${form.response_count} ${t("events.forms.responsesLabel")}`
                  : ""}
              </span>
              <div className="ml-auto flex gap-2">
                {form.kind === "follow_up" ? (
                  <Link
                    to="/manage/events/$id/forms/$formId"
                    params={{ id: eventId, formId: form.id }}
                    className={buttonClass}
                  >
                    {t("events.forms.openResults")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => setOpenId(openId === form.id ? null : form.id)}
                >
                  {openId === form.id ? t("events.forms.close") : t("events.forms.edit")}
                </button>
              </div>
            </div>
            {openId === form.id ? (
              <FormEditor
                formId={form.id}
                onSaved={load}
                onDeleted={async () => {
                  setOpenId(null);
                  await load();
                }}
                t={t}
              />
            ) : null}
          </div>
        ))}

        {forms.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("events.forms.empty")}</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!hasRegistration ? (
          <button
            type="button"
            disabled={busy}
            className={buttonClass}
            onClick={() => void add("registration")}
          >
            {t("events.forms.addRegistration")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          className={buttonClass}
          onClick={() => void add("follow_up")}
        >
          {t("events.forms.addFollowUp")}
        </button>
      </div>
    </Section>
  );
}

function FormEditor({
  formId,
  onSaved,
  onDeleted,
  t,
}: {
  formId: string;
  onSaved: () => Promise<void>;
  onDeleted: () => Promise<void>;
  t: (k: string) => string;
}) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [intro, setIntro] = useState("");
  const [thankYou, setThankYou] = useState("");
  const [introTrans, setIntroTrans] = useState<Record<TranslatedLocale, string>>({ de: "", fr: "", it: "" });
  const [thankYouTrans, setThankYouTrans] = useState<Record<TranslatedLocale, string>>({ de: "", fr: "", it: "" });
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyable, setCopyable] = useState<{ id: string; name: string; events: { title: string } | null }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { form, questions: rows } = (await getEventForm({ data: { formId } })) as unknown as {
          form: Record<string, unknown>;
          questions: Record<string, unknown>[];
        };
        setName(String(form["name"] ?? ""));
        setActive(Boolean(form["is_active"]));
        setIntro(String(form["intro"] ?? ""));
        setThankYou(String(form["thank_you"] ?? ""));
        setIntroTrans({
          de: String(form["intro_de"] ?? ""),
          fr: String(form["intro_fr"] ?? ""),
          it: String(form["intro_it"] ?? ""),
        });
        setThankYouTrans({
          de: String(form["thank_you_de"] ?? ""),
          fr: String(form["thank_you_fr"] ?? ""),
          it: String(form["thank_you_it"] ?? ""),
        });
        const ids = rows.map((r) => String(r["id"]));
        setQuestions(
          rows.map((row) => {
            const conditionId = row["condition_question_id"] as string | null;
            return {
              id: String(row["id"]),
              question_key: String(row["question_key"] ?? ""),
              qtype: (row["qtype"] as QuestionType) ?? "short_text",
              label: String(row["label"] ?? ""),
              label_de: String(row["label_de"] ?? ""),
              label_fr: String(row["label_fr"] ?? ""),
              label_it: String(row["label_it"] ?? ""),
              help_text: String(row["help_text"] ?? ""),
              help_text_de: String(row["help_text_de"] ?? ""),
              help_text_fr: String(row["help_text_fr"] ?? ""),
              help_text_it: String(row["help_text_it"] ?? ""),
              options: (row["options"] as string[] | null) ?? [],
              options_de: (row["options_de"] as string[] | null) ?? [],
              options_fr: (row["options_fr"] as string[] | null) ?? [],
              options_it: (row["options_it"] as string[] | null) ?? [],
              rating_max: Number(row["rating_max"] ?? 5),
              scale_low_label: String(row["scale_low_label"] ?? ""),
              scale_low_label_de: String(row["scale_low_label_de"] ?? ""),
              scale_low_label_fr: String(row["scale_low_label_fr"] ?? ""),
              scale_low_label_it: String(row["scale_low_label_it"] ?? ""),
              scale_high_label: String(row["scale_high_label"] ?? ""),
              scale_high_label_de: String(row["scale_high_label_de"] ?? ""),
              scale_high_label_fr: String(row["scale_high_label_fr"] ?? ""),
              scale_high_label_it: String(row["scale_high_label_it"] ?? ""),
              is_required: Boolean(row["is_required"]),
              condition_index: conditionId ? ids.indexOf(conditionId) : -1,
              condition_value: String(row["condition_value"] ?? ""),
            };
          }),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [formId]);

  const patch = (index: number, next: Partial<Draft>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...next } : q)));

  const move = (index: number, delta: number) =>
    setQuestions((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row!);
      // Conditions point at positions, so a move can invalidate them.
      return next.map((q, i) => (q.condition_index >= i ? { ...q, condition_index: -1, condition_value: "" } : q));
    });

  /**
   * Saves the form. The whole questionnaire is machine-translated into DE, FR
   * and IT first — one batched call, from the English source — and the result
   * is merged into the drafts before saving, so the translations land in the
   * editor as ordinary editable text. A failed translation never blocks the
   * save: the English copy is stored and the editor says so.
   */
  const save = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    let drafts = questions;
    let intros = introTrans;
    let thanks = thankYouTrans;
    let translationFailed = false;

    try {
      const result = await translateEventForm({
        data: {
          intro: intro || null,
          thankYou: thankYou || null,
          questions: questions.map((q) => ({
            label: q.label,
            help: q.help_text || null,
            options: q.options.filter((o) => o.trim() !== ""),
            scaleLow: q.qtype === "rating" ? q.scale_low_label || null : null,
            scaleHigh: q.qtype === "rating" ? q.scale_high_label || null : null,
          })),
        },
      });
      intros = { de: result.de.intro ?? "", fr: result.fr.intro ?? "", it: result.it.intro ?? "" };
      thanks = {
        de: result.de.thankYou ?? "",
        fr: result.fr.thankYou ?? "",
        it: result.it.thankYou ?? "",
      };
      drafts = questions.map((q, i) => ({
        ...q,
        label_de: result.de.questions[i]?.label ?? q.label_de,
        label_fr: result.fr.questions[i]?.label ?? q.label_fr,
        label_it: result.it.questions[i]?.label ?? q.label_it,
        help_text_de: result.de.questions[i]?.help ?? "",
        help_text_fr: result.fr.questions[i]?.help ?? "",
        help_text_it: result.it.questions[i]?.help ?? "",
        options_de: result.de.questions[i]?.options ?? [],
        options_fr: result.fr.questions[i]?.options ?? [],
        options_it: result.it.questions[i]?.options ?? [],
        scale_low_label_de: result.de.questions[i]?.scaleLow ?? "",
        scale_low_label_fr: result.fr.questions[i]?.scaleLow ?? "",
        scale_low_label_it: result.it.questions[i]?.scaleLow ?? "",
        scale_high_label_de: result.de.questions[i]?.scaleHigh ?? "",
        scale_high_label_fr: result.fr.questions[i]?.scaleHigh ?? "",
        scale_high_label_it: result.it.questions[i]?.scaleHigh ?? "",
      }));
      setQuestions(drafts);
      setIntroTrans(intros);
      setThankYouTrans(thanks);
    } catch {
      translationFailed = true;
    }

    try {
      const taken: string[] = [];
      const payload = drafts.map((q) => {
        const key = q.question_key || questionKeyFrom(q.label, taken);
        taken.push(key);
        const options = q.options.filter((o) => o.trim() !== "");
        const translatedOptions = (list: string[]) =>
          list.length === options.length ? list : null;
        return {
          id: q.id,
          question_key: key,
          qtype: q.qtype,
          label: q.label,
          label_de: q.label_de || null,
          label_fr: q.label_fr || null,
          label_it: q.label_it || null,
          help_text: q.help_text || null,
          help_text_de: q.help_text_de || null,
          help_text_fr: q.help_text_fr || null,
          help_text_it: q.help_text_it || null,
          options,
          options_de: translatedOptions(q.options_de),
          options_fr: translatedOptions(q.options_fr),
          options_it: translatedOptions(q.options_it),
          rating_max: q.rating_max,
          scale_low_label: q.scale_low_label || null,
          scale_low_label_de: q.scale_low_label_de || null,
          scale_low_label_fr: q.scale_low_label_fr || null,
          scale_low_label_it: q.scale_low_label_it || null,
          scale_high_label: q.scale_high_label || null,
          scale_high_label_de: q.scale_high_label_de || null,
          scale_high_label_fr: q.scale_high_label_fr || null,
          scale_high_label_it: q.scale_high_label_it || null,
          is_required: q.is_required,
          condition_index: q.condition_index,
          condition_value: q.condition_value || null,
        };
      });
      await saveEventForm({
        data: {
          formId,
          name,
          is_active: active,
          intro: intro || null,
          intro_de: intros.de || null,
          intro_fr: intros.fr || null,
          intro_it: intros.it || null,
          thank_you: thankYou || null,
          thank_you_de: thanks.de || null,
          thank_you_fr: thanks.fr || null,
          thank_you_it: thanks.it || null,
          questions: payload,
        },
      });
      setMessage(translationFailed ? t("events.forms.savedNoTranslation") : t("events.forms.saved"));
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setSaving(false);
  };

  const copyFrom = async (sourceId: string) => {
    if (!sourceId) return;
    try {
      const { questions: rows } = (await getEventForm({ data: { formId: sourceId } })) as unknown as {
        questions: Record<string, unknown>[];
      };
      setQuestions((prev) => [
        ...prev,
        ...rows.map((row) => ({
          ...emptyDraft(),
          question_key: "",
          qtype: (row["qtype"] as QuestionType) ?? "short_text",
          label: String(row["label"] ?? ""),
          label_de: String(row["label_de"] ?? ""),
          label_fr: String(row["label_fr"] ?? ""),
          label_it: String(row["label_it"] ?? ""),
          help_text: String(row["help_text"] ?? ""),
          help_text_de: String(row["help_text_de"] ?? ""),
          help_text_fr: String(row["help_text_fr"] ?? ""),
          help_text_it: String(row["help_text_it"] ?? ""),
          options: (row["options"] as string[] | null) ?? [],
          options_de: (row["options_de"] as string[] | null) ?? [],
          options_fr: (row["options_fr"] as string[] | null) ?? [],
          options_it: (row["options_it"] as string[] | null) ?? [],
          rating_max: Number(row["rating_max"] ?? 5),
          is_required: Boolean(row["is_required"]),
        })),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="border-t border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold">{t("events.forms.name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <label className="flex items-center gap-2 self-end text-xs font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t("events.forms.active")}
        </label>
        <div>
          <label className="block text-xs font-semibold">{t("events.forms.intro")}</label>
          <textarea rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold">{t("events.forms.thankYou")}</label>
          <textarea rows={2} value={thankYou} onChange={(e) => setThankYou(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {TRANSLATED_LOCALES.map((locale) => (
          <div key={locale} className="rounded-xl border border-border p-3">
            <p className="text-xs font-semibold uppercase">{locale}</p>
            <label className="mt-2 block text-xs font-semibold">{t("events.forms.intro")}</label>
            <textarea
              rows={2}
              value={introTrans[locale]}
              onChange={(e) => setIntroTrans((prev) => ({ ...prev, [locale]: e.target.value }))}
              className={inputClass}
            />
            <label className="mt-2 block text-xs font-semibold">{t("events.forms.thankYou")}</label>
            <textarea
              rows={2}
              value={thankYouTrans[locale]}
              onChange={(e) => setThankYouTrans((prev) => ({ ...prev, [locale]: e.target.value }))}
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("events.forms.translationHint")}</p>

      <div className="mt-4 space-y-3">
        {questions.map((question, index) => (
          <QuestionEditor
            key={question.id ?? `new-${index}`}
            question={question}
            index={index}
            earlier={questions.slice(0, index)}
            onPatch={(next) => patch(index, next)}
            onMove={(delta) => move(index, delta)}
            onRemove={() => setQuestions((prev) => prev.filter((_, i) => i !== index))}
            t={t}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => setQuestions((prev) => [...prev, emptyDraft()])}
        >
          {t("events.forms.addQuestion")}
        </button>
        <select
          className="min-h-11 rounded-full border border-border bg-background px-3 text-sm"
          value=""
          onFocus={() => {
            if (copyable.length === 0) {
              void listCopyableForms({ data: { exceptFormId: formId } })
                .then((rows) => setCopyable(rows))
                .catch(() => undefined);
            }
          }}
          onChange={(e) => void copyFrom(e.target.value)}
        >
          <option value="">{t("events.forms.copyFrom")}</option>
          {copyable.map((form) => (
            <option key={form.id} value={form.id}>
              {form.events?.title ? `${form.events.title} — ${form.name}` : form.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={saving} className={primaryClass} onClick={() => void save()}>
          {saving ? t("events.forms.translatingAndSaving") : t("events.forms.save")}
        </button>
        <button
          type="button"
          className={`${buttonClass} text-destructive`}
          onClick={async () => {
            setError(null);
            try {
              await deleteEventForm({ data: { formId } });
              await onDeleted();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          {t("events.forms.delete")}
        </button>
        {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
        {error ? <span className="text-sm text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  earlier,
  onPatch,
  onMove,
  onRemove,
  t,
}: {
  question: Draft;
  index: number;
  earlier: Draft[];
  onPatch: (next: Partial<Draft>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  t: (k: string) => string;
}) {
  const usesOptions = question.qtype === "single_choice" || question.qtype === "multi_choice";
  const conditionSources = earlier
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => CONDITIONABLE_TYPES.includes(q.qtype));
  const source = question.condition_index >= 0 ? earlier[question.condition_index] : undefined;
  const conditionValues = conditionValuesFor(
    source
      ? {
          id: "",
          key: source.question_key,
          type: source.qtype,
          label: source.label,
          help: null,
          options: source.options,
          ratingMax: source.rating_max,
          scaleLow: null,
          scaleHigh: null,
          required: source.is_required,
          conditionQuestionId: null,
          conditionValue: null,
        }
      : undefined,
  );

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div>
          <label className="block text-xs font-semibold">
            {t("events.forms.questionLabel")} ({index + 1})
          </label>
          <input
            value={question.label}
            onChange={(e) => onPatch({ label: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold">{t("events.forms.questionType")}</label>
          <select
            value={question.qtype}
            onChange={(e) => onPatch({ qtype: e.target.value as QuestionType })}
            className={inputClass}
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`events.forms.type.${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        {TRANSLATED_LOCALES.map((locale) => (
          <div key={locale} className="rounded-xl border border-border p-3">
            <p className="text-xs font-semibold uppercase">{locale}</p>
            <label className="mt-2 block text-xs font-semibold">{t("events.forms.questionLabel")}</label>
            <input
              value={question[`label_${locale}`]}
              onChange={(e) => onPatch({ [`label_${locale}`]: e.target.value } as Partial<Draft>)}
              className={inputClass}
            />
            <label className="mt-2 block text-xs font-semibold">{t("events.forms.help")}</label>
            <input
              value={question[`help_text_${locale}`]}
              onChange={(e) => onPatch({ [`help_text_${locale}`]: e.target.value } as Partial<Draft>)}
              className={inputClass}
            />
            {usesOptions ? (
              <>
                <label className="mt-2 block text-xs font-semibold">{t("events.forms.options")}</label>
                <textarea
                  rows={3}
                  value={question[`options_${locale}`].join("\n")}
                  onChange={(e) =>
                    onPatch({ [`options_${locale}`]: e.target.value.split("\n") } as Partial<Draft>)
                  }
                  className={inputClass}
                />
              </>
            ) : null}
            {question.qtype === "rating" ? (
              <>
                <label className="mt-2 block text-xs font-semibold">{t("events.forms.scaleLow")}</label>
                <input
                  value={question[`scale_low_label_${locale}`]}
                  onChange={(e) =>
                    onPatch({ [`scale_low_label_${locale}`]: e.target.value } as Partial<Draft>)
                  }
                  className={inputClass}
                />
                <label className="mt-2 block text-xs font-semibold">{t("events.forms.scaleHigh")}</label>
                <input
                  value={question[`scale_high_label_${locale}`]}
                  onChange={(e) =>
                    onPatch({ [`scale_high_label_${locale}`]: e.target.value } as Partial<Draft>)
                  }
                  className={inputClass}
                />
              </>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <label className="block text-xs font-semibold">{t("events.forms.help")}</label>
        <input value={question.help_text} onChange={(e) => onPatch({ help_text: e.target.value })} className={inputClass} />
      </div>

      {usesOptions ? (
        <div className="mt-2">
          <label className="block text-xs font-semibold">{t("events.forms.options")}</label>
          <textarea
            rows={3}
            value={question.options.join("\n")}
            onChange={(e) => onPatch({ options: e.target.value.split("\n") })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">{t("events.forms.optionsHint")}</p>
        </div>
      ) : null}

      {question.qtype === "rating" ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold">{t("events.forms.ratingMax")}</label>
            <input
              type="number"
              min={2}
              max={10}
              value={question.rating_max}
              onChange={(e) => onPatch({ rating_max: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold">{t("events.forms.scaleLow")}</label>
            <input value={question.scale_low_label} onChange={(e) => onPatch({ scale_low_label: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold">{t("events.forms.scaleHigh")}</label>
            <input value={question.scale_high_label} onChange={(e) => onPatch({ scale_high_label: e.target.value })} className={inputClass} />
          </div>
        </div>
      ) : null}

      {question.qtype !== "heading" && conditionSources.length > 0 ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold">{t("events.forms.conditionOn")}</label>
            <select
              value={String(question.condition_index)}
              onChange={(e) => onPatch({ condition_index: Number(e.target.value), condition_value: "" })}
              className={inputClass}
            >
              <option value="-1">{t("events.forms.conditionNone")}</option>
              {conditionSources.map(({ q, i }) => (
                <option key={i} value={i}>
                  {q.label || `#${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          {question.condition_index >= 0 ? (
            <div>
              <label className="block text-xs font-semibold">{t("events.forms.conditionValue")}</label>
              <select
                value={question.condition_value}
                onChange={(e) => onPatch({ condition_value: e.target.value })}
                className={inputClass}
              >
                <option value="" />
                {conditionValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {question.qtype !== "heading" ? (
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={question.is_required}
              onChange={(e) => onPatch({ is_required: e.target.checked })}
            />
            {t("events.forms.required")}
          </label>
        ) : null}
        <div className="ml-auto flex gap-2">
          <button type="button" className={buttonClass} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className={buttonClass} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" className={`${buttonClass} text-destructive`} onClick={onRemove}>
            {t("events.forms.removeQuestion")}
          </button>
        </div>
      </div>
    </div>
  );
}
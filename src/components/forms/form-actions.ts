/**
 * Glue between the builder state and the two persistence scopes: an event's
 * own form (`event_forms`) and a library template (`form_templates`).
 */
import {
  createEventForm,
  getEventForm,
  listCopyableForms,
  saveEventForm,
} from "@/lib/event-forms.functions";
import { createFormTemplate, getFormTemplate, listFormTemplates } from "@/lib/forms.functions";
import {
  emptyForm,
  questionsFromEventRows,
  questionsFromIndexed,
  toQuestionPayload,
  type BuilderForm,
  type BuilderQuestion,
} from "@/lib/forms/builder-state";
import type { CopySource } from "./FormBuilder";

const orNull = (s: string) => (s.trim() === "" ? null : s);

export async function saveEventFormFromBuilder(
  formId: string,
  form: BuilderForm,
  kind: "registration" | "follow_up",
) {
  const texts = kind === "follow_up";
  await saveEventForm({
    data: {
      formId,
      name: form.name,
      is_active: form.active,
      auto_send: form.autoSend,
      intro: texts ? orNull(form.intro) : null,
      intro_de: texts ? orNull(form.introTrans.de) : null,
      intro_fr: texts ? orNull(form.introTrans.fr) : null,
      intro_it: texts ? orNull(form.introTrans.it) : null,
      thank_you: texts ? orNull(form.thankYou) : null,
      thank_you_de: texts ? orNull(form.thankYouTrans.de) : null,
      thank_you_fr: texts ? orNull(form.thankYouTrans.fr) : null,
      thank_you_it: texts ? orNull(form.thankYouTrans.it) : null,
      questions: toQuestionPayload(form.questions),
    },
  });
}

/** Library questions are stored without ids, so every copy starts fresh. */
export function templateQuestions(questions: BuilderQuestion[]) {
  return toQuestionPayload(questions).map((q) => ({ ...q, id: null }));
}

export async function loadTemplateAsForm(id: string) {
  const tpl = await getFormTemplate({ data: { id } });
  const form: BuilderForm = {
    ...emptyForm(tpl.name),
    intro: tpl.intro ?? "",
    thankYou: tpl.thank_you ?? "",
    questions: questionsFromIndexed(tpl.questions),
  };
  return { kind: tpl.kind, form };
}

/**
 * Creates an event form, either blank or as a copy of a library template,
 * and returns its id so the caller can open the builder on it.
 */
export async function addEventForm(input: {
  eventId: string;
  kind: "registration" | "follow_up";
  name: string;
  templateId: string | null;
}) {
  const created = await createEventForm({
    data: {
      eventId: input.eventId,
      kind: input.kind,
      name: input.name,
      templateId: input.templateId,
    },
  });
  if (input.templateId) {
    const { form } = await loadTemplateAsForm(input.templateId);
    await saveEventFormFromBuilder(created.id, { ...form, active: true }, input.kind);
  }
  return created.id;
}

export async function saveFormAsTemplate(kind: "registration" | "follow_up", form: BuilderForm) {
  return createFormTemplate({
    data: {
      kind,
      name: form.name,
      intro: orNull(form.intro),
      thank_you: orNull(form.thankYou),
      questions: templateQuestions(form.questions),
    },
  });
}

/** Library forms plus earlier event forms, for "Copy questions from…". */
export async function copySourcesFor(
  exceptEventFormId: string | null,
  libraryLabel: string,
): Promise<CopySource[]> {
  const [templates, forms] = await Promise.all([
    listFormTemplates(),
    exceptEventFormId
      ? listCopyableForms({ data: { exceptFormId: exceptEventFormId } })
      : Promise.resolve([]),
  ]);
  return [
    ...templates.map((tpl) => ({ id: `tpl:${tpl.id}`, label: `${libraryLabel}: ${tpl.name}` })),
    ...forms.map((f) => ({
      id: `evt:${f.id}`,
      label: f.events?.title ? `${f.events.title} — ${f.name}` : f.name,
    })),
  ];
}

export async function copyQuestionsFrom(sourceId: string): Promise<BuilderQuestion[]> {
  const [scope, id] = sourceId.split(":");
  if (!id) return [];
  if (scope === "tpl") return (await loadTemplateAsForm(id)).form.questions;
  const { questions } = (await getEventForm({ data: { formId: id } })) as unknown as {
    questions: Record<string, unknown>[];
  };
  // Copies never keep ids; conditions are re-linked inside the copied set.
  return questionsFromEventRows(questions).map((q) => ({ ...q, id: null, question_key: "" }));
}

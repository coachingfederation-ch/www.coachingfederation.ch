/**
 * Form library — reusable form templates.
 *
 * A template is a name, a kind, optional intro/thank-you texts and a question
 * list stored as JSON in the same shape `saveEventForm` accepts (conditions by
 * position). Attaching a template to an event copies it into the event's own
 * form, so editing a template never changes an event that already uses it.
 * All reads and writes go through the caller's RLS-scoped client.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { FORM_KINDS } from "./event-forms";

/** One stored question: plain JSON values only. */
export type TemplateQuestion = { [key: string]: string | number | boolean | null | string[] };

export type FormTemplateRow = {
  id: string;
  kind: "registration" | "follow_up";
  name: string;
  question_count: number;
  event_count: number;
  updated_at: string;
};

const templateInput = z.object({
  kind: z.enum(FORM_KINDS),
  name: z.string().trim().min(2).max(120),
  intro: z.string().trim().max(1000).nullable().optional(),
  thank_you: z.string().trim().max(1000).nullable().optional(),
  // Validated in full when the copy is saved onto an event.
  questions: z.array(z.record(z.string(), z.unknown())).max(40),
});

export const listFormTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FormTemplateRow[]> => {
    await assertOrganizer(context);
    const { data, error } = await context.supabase
      .from("form_templates")
      .select("id, kind, name, questions, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r) => r.id);
    const { data: uses } = ids.length
      ? await context.supabase.from("event_forms").select("template_id").in("template_id", ids)
      : { data: [] as { template_id: string | null }[] };
    const counts = new Map<string, number>();
    for (const u of uses ?? []) {
      if (u.template_id) counts.set(u.template_id, (counts.get(u.template_id) ?? 0) + 1);
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind as FormTemplateRow["kind"],
      name: r.name,
      question_count: Array.isArray(r.questions) ? r.questions.length : 0,
      event_count: counts.get(r.id) ?? 0,
      updated_at: r.updated_at,
    }));
  });

export const getFormTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("form_templates")
      .select("id, kind, name, intro, thank_you, questions")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("This form is not available.");
    return {
      id: row.id,
      kind: row.kind as FormTemplateRow["kind"],
      name: row.name,
      intro: row.intro,
      thank_you: row.thank_you,
      questions: (Array.isArray(row.questions) ? row.questions : []) as TemplateQuestion[],
    };
  });

export const createFormTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => templateInput.parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("form_templates")
      .insert({
        kind: data.kind,
        name: data.name,
        intro: data.intro || null,
        thank_you: data.thank_you || null,
        questions: data.questions as never,
      })
      .select("id")
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "The form could not be created.");
    return { id: row.id };
  });

export const saveFormTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    templateInput.omit({ kind: true }).extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase
      .from("form_templates")
      .update({
        name: data.name,
        intro: data.intro || null,
        thank_you: data.thank_you || null,
        questions: data.questions as never,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFormTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase.from("form_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

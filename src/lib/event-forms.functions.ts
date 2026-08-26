/**
 * Event forms — server functions.
 *
 * Staff CRUD runs through `context.supabase`, the caller's own RLS-scoped
 * client, so "organizers touch only their own events" stays a database
 * decision. The two public endpoints resolve an emailed single-use link and
 * never accept a form, event or attendee id from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { FORM_KINDS, QUESTION_TYPES } from "./event-forms";

const FORM_COLUMNS =
  "id, event_id, kind, name, is_active, auto_send, auto_sent_at, auto_reminder_at, intro, intro_de, intro_fr, intro_it, thank_you, thank_you_de, thank_you_fr, thank_you_it, created_at";

const QUESTION_COLUMNS =
  "id, form_id, question_key, qtype, label, label_de, label_fr, label_it, help_text, help_text_de, help_text_fr, help_text_it, options, options_de, options_fr, options_it, rating_max, scale_low_label, scale_low_label_de, scale_low_label_fr, scale_low_label_it, scale_high_label, scale_high_label_de, scale_high_label_fr, scale_high_label_it, is_required, sort_order, condition_question_id, condition_value";

const questionInput = z.object({
  id: z.string().uuid().nullable().optional(),
  question_key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/),
  qtype: z.enum(QUESTION_TYPES),
  label: z.string().trim().min(1).max(300),
  label_de: z.string().trim().max(300).nullable().optional(),
  label_fr: z.string().trim().max(300).nullable().optional(),
  label_it: z.string().trim().max(300).nullable().optional(),
  help_text: z.string().trim().max(500).nullable().optional(),
  help_text_de: z.string().trim().max(500).nullable().optional(),
  help_text_fr: z.string().trim().max(500).nullable().optional(),
  help_text_it: z.string().trim().max(500).nullable().optional(),
  options: z.array(z.string().trim().min(1).max(200)).max(20),
  options_de: z.array(z.string().trim().max(200)).max(20).nullable().optional(),
  options_fr: z.array(z.string().trim().max(200)).max(20).nullable().optional(),
  options_it: z.array(z.string().trim().max(200)).max(20).nullable().optional(),
  rating_max: z.number().int().min(2).max(10),
  scale_low_label: z.string().trim().max(60).nullable().optional(),
  scale_low_label_de: z.string().trim().max(60).nullable().optional(),
  scale_low_label_fr: z.string().trim().max(60).nullable().optional(),
  scale_low_label_it: z.string().trim().max(60).nullable().optional(),
  scale_high_label: z.string().trim().max(60).nullable().optional(),
  scale_high_label_de: z.string().trim().max(60).nullable().optional(),
  scale_high_label_fr: z.string().trim().max(60).nullable().optional(),
  scale_high_label_it: z.string().trim().max(60).nullable().optional(),
  is_required: z.boolean(),
  /** Index of the earlier question this one depends on, -1 for none. */
  condition_index: z.number().int().min(-1).max(99),
  condition_value: z.string().trim().max(200).nullable().optional(),
});

/** Keeps a translated option list only when it matches the canonical one. */
function alignedOptions(
  translated: string[] | null | undefined,
  canonical: string[],
  usesOptions: boolean,
): string[] | null {
  if (!usesOptions || !translated || translated.length !== canonical.length) return null;
  return canonical.map((value, i) => (translated[i] ?? "").trim() || value);
}

/** Every form on one event, with the counts the list needs. */
export const listEventForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: forms, error } = await context.supabase
      .from("event_forms")
      .select(FORM_COLUMNS)
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = ((forms ?? []) as { id: string }[]).map((f) => f.id);
    if (ids.length === 0) return [];

    const [{ data: questions }, { data: recipients }, { data: responses }] = await Promise.all([
      context.supabase.from("event_form_questions").select("id, form_id").in("form_id", ids),
      context.supabase.from("event_form_recipients").select("form_id, status").in("form_id", ids),
      context.supabase.from("event_form_responses").select("form_id").in("form_id", ids),
    ]);

    const count = (rows: { form_id: string }[] | null, id: string) =>
      (rows ?? []).filter((r) => r.form_id === id).length;

    return ((forms ?? []) as Record<string, unknown>[]).map((form) => {
      const id = form["id"] as string;
      return {
        ...form,
        question_count: count(questions as { form_id: string }[] | null, id),
        sent_count: ((recipients ?? []) as { form_id: string; status: string }[]).filter(
          (r) => r.form_id === id && r.status !== "not_sent",
        ).length,
        response_count: count(responses as { form_id: string }[] | null, id),
      };
    });
  });

/** One form with its questions, for the editor and the results page. */
export const getEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ formId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: form, error } = await context.supabase
      .from("event_forms")
      .select(FORM_COLUMNS)
      .eq("id", data.formId)
      .maybeSingle();
    if (error || !form) throw new Error("This form is not available.");
    const { data: questions } = await context.supabase
      .from("event_form_questions")
      .select(QUESTION_COLUMNS)
      .eq("form_id", data.formId)
      .order("sort_order", { ascending: true });
    return { form, questions: questions ?? [] };
  });

/** Creates an empty form. Question editing happens in a second step. */
export const createEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        kind: z.enum(FORM_KINDS),
        name: z.string().trim().min(2).max(120),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("event_forms")
      .insert({ event_id: data.eventId, kind: data.kind, name: data.name, is_active: true })
      .select("id")
      .maybeSingle();
    if (error || !row) {
      throw new Error(
        error?.message.includes("event_forms_one_active_registration")
          ? "This event already has an active registration form."
          : (error?.message ?? "The form could not be created."),
      );
    }
    return row as { id: string };
  });

/**
 * Saves the form and the whole question list in one go, mirroring the editor
 * form. Conditions arrive as indices so a brand-new question can already be
 * the condition of a later one; they are resolved to ids after the insert.
 */
export const saveEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        formId: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        is_active: z.boolean(),
        auto_send: z.boolean().optional(),
        intro: z.string().trim().max(1000).nullable().optional(),
        intro_de: z.string().trim().max(1000).nullable().optional(),
        intro_fr: z.string().trim().max(1000).nullable().optional(),
        intro_it: z.string().trim().max(1000).nullable().optional(),
        thank_you: z.string().trim().max(1000).nullable().optional(),
        thank_you_de: z.string().trim().max(1000).nullable().optional(),
        thank_you_fr: z.string().trim().max(1000).nullable().optional(),
        thank_you_it: z.string().trim().max(1000).nullable().optional(),
        questions: z.array(questionInput).max(40),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);

    const { error: formError } = await context.supabase
      .from("event_forms")
      .update({
        name: data.name,
        is_active: data.is_active,
        ...(data.auto_send === undefined ? {} : { auto_send: data.auto_send }),
        intro: data.intro || null,
        intro_de: data.intro_de || null,
        intro_fr: data.intro_fr || null,
        intro_it: data.intro_it || null,
        thank_you: data.thank_you || null,
        thank_you_de: data.thank_you_de || null,
        thank_you_fr: data.thank_you_fr || null,
        thank_you_it: data.thank_you_it || null,
      })
      .eq("id", data.formId);
    if (formError) {
      throw new Error(
        formError.message.includes("event_forms_one_active_registration")
          ? "This event already has an active registration form."
          : formError.message,
      );
    }

    const keep = data.questions.map((q) => q.id).filter(Boolean) as string[];
    const { data: existing } = await context.supabase
      .from("event_form_questions")
      .select("id")
      .eq("form_id", data.formId);
    const removable = ((existing ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !keep.includes(id));
    if (removable.length > 0) {
      await context.supabase.from("event_form_questions").delete().in("id", removable);
    }

    // Pass one: write the questions without their conditions.
    const ids: string[] = [];
    for (const [index, question] of data.questions.entries()) {
      const usesOptions = question.qtype === "single_choice" || question.qtype === "multi_choice";
      const row = {
        form_id: data.formId,
        question_key: question.question_key,
        qtype: question.qtype,
        label: question.label,
        label_de: question.label_de || null,
        label_fr: question.label_fr || null,
        label_it: question.label_it || null,
        help_text: question.help_text || null,
        help_text_de: question.help_text_de || null,
        help_text_fr: question.help_text_fr || null,
        help_text_it: question.help_text_it || null,
        options: usesOptions ? question.options : [],
        // A translated list only means anything next to the canonical one, so
        // it is stored solely when it lines up position for position.
        options_de: alignedOptions(question.options_de, question.options, usesOptions),
        options_fr: alignedOptions(question.options_fr, question.options, usesOptions),
        options_it: alignedOptions(question.options_it, question.options, usesOptions),
        rating_max: question.rating_max,
        scale_low_label: question.scale_low_label || null,
        scale_low_label_de: question.scale_low_label_de || null,
        scale_low_label_fr: question.scale_low_label_fr || null,
        scale_low_label_it: question.scale_low_label_it || null,
        scale_high_label: question.scale_high_label || null,
        scale_high_label_de: question.scale_high_label_de || null,
        scale_high_label_fr: question.scale_high_label_fr || null,
        scale_high_label_it: question.scale_high_label_it || null,
        is_required: question.qtype === "heading" ? false : question.is_required,
        sort_order: index,
        condition_question_id: null,
        condition_value: null,
      };
      if (question.id) {
        const { error } = await context.supabase
          .from("event_form_questions")
          .update(row)
          .eq("id", question.id);
        if (error) throw new Error(error.message);
        ids.push(question.id);
      } else {
        const { data: inserted, error } = await context.supabase
          .from("event_form_questions")
          .insert(row)
          .select("id")
          .maybeSingle();
        if (error || !inserted)
          throw new Error(error?.message ?? "The question could not be saved.");
        ids.push((inserted as { id: string }).id);
      }
    }

    // Pass two: a condition may only point at an *earlier* question.
    for (const [index, question] of data.questions.entries()) {
      const source = question.condition_index;
      const valid =
        source >= 0 &&
        source < index &&
        question.condition_value !== null &&
        question.condition_value !== undefined &&
        question.condition_value !== "";
      await context.supabase
        .from("event_form_questions")
        .update({
          condition_question_id: valid ? ids[source] : null,
          condition_value: valid ? question.condition_value : null,
        })
        .eq("id", ids[index]!);
    }

    return { ok: true as const };
  });

/** Deletes a form. Blocked once it has responses — deactivate it instead. */
export const deleteEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ formId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { count } = await context.supabase
      .from("event_form_responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", data.formId);
    if (count && count > 0) throw new Error("This form has responses; deactivate it instead.");
    const { error } = await context.supabase.from("event_forms").delete().eq("id", data.formId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Follow-up forms the caller may manage, for copying questions across events. */
export const listCopyableForms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ exceptFormId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: rows } = await context.supabase
      .from("event_forms")
      .select("id, name, kind, event_id, events(title)")
      .eq("kind", "follow_up")
      .neq("id", data.exceptFormId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (rows ?? []) as unknown as {
      id: string;
      name: string;
      events: { title: string } | null;
    }[];
  });

/** Eligible attendees, invitation status and responses for one follow-up form. */
export const getFormResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ formId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: form, error } = await context.supabase
      .from("event_forms")
      .select("id, event_id, kind, name")
      .eq("id", data.formId)
      .maybeSingle();
    if (error || !form) throw new Error("This form is not available.");
    const meta = form as { id: string; event_id: string; kind: string; name: string };

    const isRegistration = meta.kind === "registration";

    // Registration answers live on the registration row itself — there is no
    // second write path and no invitation, so the two kinds read differently.
    const [{ data: recipients }, { data: responses }] = await Promise.all([
      isRegistration
        ? Promise.resolve({ data: [] })
        : context.supabase
            .from("event_form_recipients")
            .select(
              "id, registration_id, email, locale, status, sent_at, reminder_sent_at, completed_at",
            )
            .eq("form_id", data.formId),
      isRegistration
        ? Promise.resolve({ data: [] })
        : context.supabase
            .from("event_form_responses")
            .select("id, registration_id, answers, submitted_at")
            .eq("form_id", data.formId)
            .order("submitted_at", { ascending: false }),
    ]);

    const { data: attendees } = await context.supabase
      .from("event_registrations")
      .select("id, full_name, email, status, payment_status, refund_status, answers, created_at")
      .eq("event_id", meta.event_id)
      .order("created_at", { ascending: false });

    const rows = (attendees ?? []) as unknown as {
      id: string;
      status: string;
      answers: Record<string, string> | null;
      created_at: string;
    }[];

    const registrationResponses = rows
      .filter((r) => r.status === "confirmed" && r.answers && Object.keys(r.answers).length > 0)
      .map((r) => ({
        id: r.id,
        registration_id: r.id,
        answers: r.answers ?? {},
        submitted_at: r.created_at,
      }));

    const { loadFormQuestions, eligibleAttendees } = await import("./event-forms.server");
    const eligible = isRegistration
      ? rows.filter((r) => r.status === "confirmed").length
      : (await eligibleAttendees(meta.event_id)).length;

    return {
      form: meta,
      questions: await loadFormQuestions(data.formId),
      eligible,
      recipients: recipients ?? [],
      responses: isRegistration ? registrationResponses : (responses ?? []),
      attendees: attendees ?? [],
    };
  });

/** Sends invitations or reminders for a follow-up form. */
export const sendFollowUpForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        formId: z.string().uuid(),
        mode: z.enum(["invite", "reminder"]),
        registrationId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    // The caller's own client proves they may manage this form before the
    // trusted path mints tokens and sends mail.
    const { data: form, error } = await context.supabase
      .from("event_forms")
      .select("id")
      .eq("id", data.formId)
      .maybeSingle();
    if (error || !form) throw new Error("This form is not available.");

    const { sendFollowUp } = await import("./event-forms.server");
    return sendFollowUp(data.formId, data.mode, data.registrationId);
  });

/** CSV of one form's responses. */
export const exportFormResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ formId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: form, error } = await context.supabase
      .from("event_forms")
      .select("id")
      .eq("id", data.formId)
      .maybeSingle();
    if (error || !form) throw new Error("This form is not available.");
    const { buildFormResponsesCsv } = await import("./event-forms.server");
    return buildFormResponsesCsv(data.formId);
  });

/** Public: resolve an emailed follow-up link. Unknown tokens return null. */
export const getFollowUpForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().trim().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { resolveFollowUpToken } = await import("./event-forms.server");
    return resolveFollowUpToken(data.token);
  });

/** Public: submit a follow-up form. Rate limited; one response per attendee. */
export const submitFollowUpForm = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().trim().min(8).max(128),
        answers: z.record(z.string(), z.string().max(2000)),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { clientIp, checkRateLimit } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const verdict = await checkRateLimit("event-form-submit", `ip:${clientIp(getRequest())}`, [
      { windowSeconds: 600, max: 10 },
      { windowSeconds: 86_400, max: 60 },
    ]);
    if (!verdict.allowed) return { ok: false as const, reason: "rate_limited" as const };

    const { submitFollowUp } = await import("./event-forms.server");
    return submitFollowUp(data.token, data.answers);
  });

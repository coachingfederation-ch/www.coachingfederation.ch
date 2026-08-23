/**
 * Event forms — server-only logic.
 *
 * Two jobs. First, resolving and validating the questions asked during
 * registration (answers still live on `event_registrations.answers`, so the
 * Stripe path is untouched). Second, the follow-up cycle: who is eligible,
 * minting single-use links (only the SHA-256 hash is stored), sending the
 * localized invitation through the one managed sender, and recording the
 * response exactly once.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath, type Locale } from "@/i18n/config";
import {
  displayAnswer,
  localisedColumn,
  validateSubmission,
  type PublicForm,
  type PublicFormQuestion,
  type QuestionType,
} from "./event-forms";
import { FOLLOW_UP_COPY } from "./email-templates/event-follow-up-copy";

export type QuestionRow = {
  id: string;
  question_key: string;
  qtype: QuestionType;
  label: string;
  label_de: string | null;
  label_fr: string | null;
  label_it: string | null;
  help_text: string | null;
  help_text_de: string | null;
  help_text_fr: string | null;
  help_text_it: string | null;
  options: string[] | null;
  options_de: string[] | null;
  options_fr: string[] | null;
  options_it: string[] | null;
  rating_max: number;
  scale_low_label: string | null;
  scale_low_label_de: string | null;
  scale_low_label_fr: string | null;
  scale_low_label_it: string | null;
  scale_high_label: string | null;
  scale_high_label_de: string | null;
  scale_high_label_fr: string | null;
  scale_high_label_it: string | null;
  is_required: boolean;
  sort_order: number;
  condition_question_id: string | null;
  condition_value: string | null;
};

/**
 * Display strings for the options, positionally aligned with the canonical
 * list. A translated array of a different length is ignored outright: a
 * partial mapping would silently label an option with the wrong words.
 */
function optionLabelsFor(row: QuestionRow, locale: Locale): string[] {
  const canonical = row.options ?? [];
  if (locale === "en") return canonical;
  const translated = (row[`options_${locale}` as keyof QuestionRow] as string[] | null) ?? null;
  if (!translated || translated.length !== canonical.length) return canonical;
  return canonical.map((value, i) => {
    const label = (translated[i] ?? "").trim();
    return label || value;
  });
}

export function toPublicQuestion(row: QuestionRow, locale: Locale): PublicFormQuestion {
  return {
    id: row.id,
    key: row.question_key,
    type: row.qtype,
    label: localisedColumn(row as never, "label", locale) ?? row.label,
    help: localisedColumn(row as never, "help_text", locale),
    options: row.options ?? [],
    optionLabels: optionLabelsFor(row, locale),
    ratingMax: row.rating_max ?? 5,
    scaleLow: localisedColumn(row as never, "scale_low_label", locale),
    scaleHigh: localisedColumn(row as never, "scale_high_label", locale),
    required: row.is_required,
    conditionQuestionId: row.condition_question_id,
    conditionValue: row.condition_value,
  };
}

const QUESTION_COLUMNS =
  "id, question_key, qtype, label, label_de, label_fr, label_it, help_text, help_text_de, help_text_fr, help_text_it, options, options_de, options_fr, options_it, rating_max, scale_low_label, scale_low_label_de, scale_low_label_fr, scale_low_label_it, scale_high_label, scale_high_label_de, scale_high_label_fr, scale_high_label_it, is_required, sort_order, condition_question_id, condition_value";

/** The event's active registration form as the public page needs it. */
export async function loadPublicRegistrationForm(
  eventId: string,
  locale: Locale,
): Promise<PublicForm | null> {
  const { publicSupabaseClient } = await import("./supabase-public.server");
  const supabase = publicSupabaseClient();
  const { data: form } = await supabase
    .from("event_forms_public")
    .select("id, kind, thank_you, thank_you_de, thank_you_fr, thank_you_it")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!form) return null;
  const { data: rows } = await supabase
    .from("event_form_questions_public")
    .select(QUESTION_COLUMNS)
    .eq("form_id", (form as { id: string }).id)
    .order("sort_order", { ascending: true });
  return {
    id: (form as { id: string }).id,
    kind: "registration",
    thankYou: localisedColumn(form as never, "thank_you", locale),
    intro: null,
    questions: ((rows ?? []) as unknown as QuestionRow[]).map((row) =>
      toPublicQuestion(row, locale),
    ),
  };
}

/** Trusted read of one form's questions, for validation and staff surfaces. */
export async function loadFormQuestions(
  formId: string,
  locale: Locale = "en",
): Promise<PublicFormQuestion[]> {
  const { data } = await supabaseAdmin
    .from("event_form_questions")
    .select(QUESTION_COLUMNS)
    .eq("form_id", formId)
    .order("sort_order", { ascending: true });
  return ((data ?? []) as unknown as QuestionRow[]).map((row) => toPublicQuestion(row, locale));
}

/** The event's active registration form id, if it has one. */
export async function activeRegistrationFormId(eventId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("event_forms")
    .select("id")
    .eq("event_id", eventId)
    .eq("kind", "registration")
    .eq("is_active", true)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Keeps only the answers the organizer actually asked for, refuses a missing
 * required answer, and ignores questions whose condition is not met.
 */
export async function validateRegistrationAnswers(
  eventId: string,
  answers: Record<string, string>,
): Promise<{ ok: true; answers: Record<string, string> } | { ok: false }> {
  const formId = await activeRegistrationFormId(eventId);
  if (!formId) return { ok: true, answers: {} };
  const questions = await loadFormQuestions(formId);
  return validateSubmission(questions, answers);
}

/** Labelled answers in one locale — used by the confirmation email and CSV. */
export async function labelAnswers(
  formId: string,
  answers: Record<string, string>,
  locale: Locale,
  yes: string,
  no: string,
): Promise<{ label: string; value: string }[]> {
  const questions = await loadFormQuestions(formId, locale);
  const out: { label: string; value: string }[] = [];
  for (const question of questions) {
    if (question.type === "heading") continue;
    const raw = answers[question.key];
    if (raw === undefined || raw === "") continue;
    out.push({ label: question.label, value: displayAnswer(question, raw, yes, no) });
  }
  return out;
}

// ---------------------------------------------------------------- follow-up

export function hashFormToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type EligibleAttendee = {
  registrationId: string;
  fullName: string;
  email: string;
  locale: Locale;
};

function normaliseLocale(value: string | null | undefined): Locale {
  return value === "de" || value === "fr" || value === "it" ? value : "en";
}

/**
 * Confirmed attendees only: no cancelled, pending, refunded or refund-pending
 * seat, and one row per email address.
 */
export async function eligibleAttendees(eventId: string): Promise<EligibleAttendee[]> {
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .select("id, full_name, email, locale, status, payment_status, refund_status")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });
  const seen = new Set<string>();
  const out: EligibleAttendee[] = [];
  for (const row of (data ?? []) as Record<string, string | null>[]) {
    const paid = row["payment_status"] === "not_required" || row["payment_status"] === "paid";
    const refunded = row["refund_status"] === "refunded" || row["refund_status"] === "pending";
    const email = (row["email"] ?? "").toLowerCase();
    if (!paid || refunded || !email || seen.has(email)) continue;
    seen.add(email);
    out.push({
      registrationId: row["id"] as string,
      fullName: row["full_name"] ?? "",
      email,
      locale: normaliseLocale(row["locale"]),
    });
  }
  return out;
}

type FormRow = {
  id: string;
  event_id: string;
  kind: string;
  name: string;
  is_active: boolean;
  intro: string | null;
  intro_de: string | null;
  intro_fr: string | null;
  intro_it: string | null;
  thank_you: string | null;
  thank_you_de: string | null;
  thank_you_fr: string | null;
  thank_you_it: string | null;
};

async function loadForm(formId: string): Promise<FormRow | null> {
  const { data } = await supabaseAdmin
    .from("event_forms")
    .select(
      "id, event_id, kind, name, is_active, intro, intro_de, intro_fr, intro_it, thank_you, thank_you_de, thank_you_fr, thank_you_it",
    )
    .eq("id", formId)
    .maybeSingle();
  return (data as FormRow | null) ?? null;
}

export type SendOutcome = { sent: number; skipped: number; failed: number };

/**
 * Sends the invitation (or a reminder) for a follow-up form. Each recipient
 * gets one row, one token and one send; a reminder only touches people who
 * were already sent the invitation and have not answered.
 */
export async function sendFollowUp(
  formId: string,
  mode: "invite" | "reminder",
  onlyRegistrationId?: string,
): Promise<SendOutcome> {
  const form = await loadForm(formId);
  if (!form || form.kind !== "follow_up") throw new Error("This form is not available.");

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("id, slug, title, starts_at")
    .eq("id", form.event_id)
    .maybeSingle();
  if (!eventRow) throw new Error("Event not found");

  const attendees = await eligibleAttendees(form.event_id);
  const { data: existingRows } = await supabaseAdmin
    .from("event_form_recipients")
    .select("id, registration_id, status")
    .eq("form_id", formId);
  const existing = new Map(
    ((existingRows ?? []) as { id: string; registration_id: string; status: string }[]).map((r) => [
      r.registration_id,
      r,
    ]),
  );

  const outcome: SendOutcome = { sent: 0, skipped: 0, failed: 0 };

  for (const attendee of attendees) {
    if (onlyRegistrationId && attendee.registrationId !== onlyRegistrationId) continue;
    const row = existing.get(attendee.registrationId);
    if (mode === "invite" && row && row.status !== "not_sent" && !onlyRegistrationId) {
      outcome.skipped += 1;
      continue;
    }
    if (mode === "reminder" && (!row || row.status !== "sent")) {
      outcome.skipped += 1;
      continue;
    }

    const token = randomBytes(32).toString("base64url");
    const nowIso = new Date().toISOString();
    let recipientId = row?.id ?? null;

    if (recipientId) {
      await supabaseAdmin
        .from("event_form_recipients")
        .update({
          token_hash: hashFormToken(token),
          email: attendee.email,
          locale: attendee.locale,
          ...(mode === "reminder" ? { reminder_sent_at: nowIso } : { sent_at: nowIso }),
          status: "sent",
          send_error: null,
        })
        .eq("id", recipientId);
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("event_form_recipients")
        .insert({
          form_id: formId,
          registration_id: attendee.registrationId,
          email: attendee.email,
          locale: attendee.locale,
          token_hash: hashFormToken(token),
          status: "sent",
          sent_at: nowIso,
        })
        .select("id")
        .maybeSingle();
      if (error || !inserted) {
        outcome.failed += 1;
        continue;
      }
      recipientId = (inserted as { id: string }).id;
    }

    const copy = FOLLOW_UP_COPY[attendee.locale];
    const intro = localisedColumn(form as never, "intro", attendee.locale);
    const formUrl = `${SITE_URL}${localizePath(`/form/${token}`, attendee.locale)}`;
    const eventUrl = `${SITE_URL}${localizePath(`/events/${eventRow.slug}`, attendee.locale)}`;

    try {
      const { sendTemplateEmail } = await import("./email-templates/send-email");
      await sendTemplateEmail("event-follow-up-invitation", attendee.email, {
        idempotencyKey: `follow-up-${recipientId}-${mode}-${nowIso.slice(0, 13)}`,
        templateData: {
          locale: attendee.locale,
          attendeeName: attendee.fullName,
          eventTitle: eventRow.title,
          intro: intro || copy.introDefault,
          formUrl,
          eventUrl,
          isReminder: mode === "reminder",
        },
      });
      outcome.sent += 1;
    } catch (error) {
      outcome.failed += 1;
      await supabaseAdmin
        .from("event_form_recipients")
        .update({
          status: row?.status === "sent" ? "sent" : "not_sent",
          send_error: error instanceof Error ? error.message.slice(0, 400) : "send failed",
        })
        .eq("id", recipientId);
    }
  }

  return outcome;
}

export type ResolvedFollowUp = {
  state: "open" | "completed";
  formId: string;
  eventTitle: string;
  eventUrl: string;
  intro: string | null;
  thankYou: string | null;
  locale: Locale;
  questions: PublicFormQuestion[];
};

/** Resolves an emailed link. Unknown or revoked tokens simply return null. */
export async function resolveFollowUpToken(token: string): Promise<ResolvedFollowUp | null> {
  const { data: recipient } = await supabaseAdmin
    .from("event_form_recipients")
    .select("id, form_id, registration_id, locale, status")
    .eq("token_hash", hashFormToken(token))
    .maybeSingle();
  if (!recipient) return null;

  const r = recipient as {
    id: string;
    form_id: string;
    locale: string;
    status: string;
  };
  const form = await loadForm(r.form_id);
  if (!form || !form.is_active) return null;

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select("title, slug")
    .eq("id", form.event_id)
    .maybeSingle();
  const locale = normaliseLocale(r.locale);

  return {
    state: r.status === "completed" ? "completed" : "open",
    formId: form.id,
    eventTitle: (eventRow as { title?: string } | null)?.title ?? "",
    eventUrl: `${SITE_URL}${localizePath(`/events/${(eventRow as { slug?: string } | null)?.slug ?? ""}`, locale)}`,
    intro: localisedColumn(form as never, "intro", locale),
    thankYou: localisedColumn(form as never, "thank_you", locale),
    locale,
    questions: await loadFormQuestions(form.id, locale),
  };
}

/** Records one response. A second submission is a no-op, never a duplicate. */
export async function submitFollowUp(
  token: string,
  answers: Record<string, string>,
): Promise<{ ok: true; thankYou: string | null } | { ok: false; reason: "invalid" | "rejected" }> {
  const { data: recipient } = await supabaseAdmin
    .from("event_form_recipients")
    .select("id, form_id, registration_id, locale, status")
    .eq("token_hash", hashFormToken(token))
    .maybeSingle();
  if (!recipient) return { ok: false, reason: "invalid" };
  const r = recipient as {
    id: string;
    form_id: string;
    registration_id: string;
    locale: string;
    status: string;
  };
  const form = await loadForm(r.form_id);
  if (!form || !form.is_active) return { ok: false, reason: "invalid" };
  const locale = normaliseLocale(r.locale);
  const thankYou = localisedColumn(form as never, "thank_you", locale);
  if (r.status === "completed") return { ok: true, thankYou };

  const questions = await loadFormQuestions(r.form_id);
  const checked = validateSubmission(questions, answers);
  if (!checked.ok) return { ok: false, reason: "rejected" };

  const { error } = await supabaseAdmin.from("event_form_responses").insert({
    form_id: r.form_id,
    registration_id: r.registration_id,
    recipient_id: r.id,
    answers: checked.answers,
  });
  // A duplicate simply means somebody submitted twice; the first answer stands.
  if (error && !error.message.includes("duplicate")) {
    return { ok: false, reason: "rejected" };
  }
  await supabaseAdmin
    .from("event_form_recipients")
    .update({ status: "completed", completed_at: new Date().toISOString(), token_hash: null })
    .eq("id", r.id);
  return { ok: true, thankYou };
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Attendee-supplied text is untrusted: neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One form's responses as CSV, with the questions as columns. */
export async function buildFormResponsesCsv(formId: string) {
  const form = await loadForm(formId);
  const questions = (await loadFormQuestions(formId)).filter((q) => q.type !== "heading");
  // A registration form's answers sit on the registration row; a follow-up
  // form's answers sit in its own response table.
  const { data: rows } =
    form?.kind === "registration"
      ? await supabaseAdmin
          .from("event_registrations")
          .select("id, answers, created_at")
          .eq("event_id", form.event_id)
          .eq("status", "confirmed")
          .order("created_at", { ascending: true })
          .then(({ data }) => ({
            data: (
              (data ?? []) as {
                id: string;
                answers: Record<string, string> | null;
                created_at: string;
              }[]
            )
              .filter((r) => r.answers && Object.keys(r.answers).length > 0)
              .map((r) => ({
                registration_id: r.id,
                answers: r.answers ?? {},
                submitted_at: r.created_at,
              })),
          }))
      : await supabaseAdmin
          .from("event_form_responses")
          .select("registration_id, answers, submitted_at")
          .eq("form_id", formId)
          .order("submitted_at", { ascending: true });

  const ids = ((rows ?? []) as { registration_id: string }[]).map((r) => r.registration_id);
  const { data: regs } = ids.length
    ? await supabaseAdmin.from("event_registrations").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string }[] };
  const people = new Map(
    ((regs ?? []) as { id: string; full_name: string; email: string }[]).map((r) => [r.id, r]),
  );

  const header = ["attendee", "email", "submitted_at", ...questions.map((q) => q.label)];
  const lines = (
    (rows ?? []) as {
      registration_id: string;
      answers: Record<string, string>;
      submitted_at: string;
    }[]
  ).map((row) => {
    const person = people.get(row.registration_id);
    const answers = row.answers ?? {};
    return [
      person?.full_name ?? "",
      person?.email ?? "",
      row.submitted_at,
      ...questions.map((q) => displayAnswer(q, answers[q.key] ?? "")),
    ]
      .map(cell)
      .join(",");
  });

  return {
    filename: `form-responses-${(form?.name ?? "form").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header.map(cell).join(","), ...lines].join("\n"),
    rows: lines.length,
  };
}

/**
 * Public surveys built with the Forms module.
 *
 * Staff functions go through the caller's RLS-bound client after an
 * organizer check. The two public functions (read by slug, submit) use the
 * service-role client inside the handler, only after the survey's own
 * availability rules pass, and submissions are rate-limited per visitor.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertOrganizer } from "./authz";
import { uniqueSlug, slugify } from "./articles";
import { surveyAvailability, surveyQuestions, SURVEY_STATUSES, type SurveyStatus } from "./surveys";
import { validateSubmission } from "./event-forms";

export type SurveyRow = {
  id: string;
  slug: string;
  name: string;
  status: SurveyStatus;
  closes_at: string | null;
  response_count: number;
  updated_at: string;
};

const SURVEY_COLUMNS =
  "id, slug, name, status, opens_at, closes_at, max_responses, collect_contact, one_per_browser, members_only, intro, intro_de, intro_fr, intro_it, thank_you, thank_you_de, thank_you_fr, thank_you_it, questions";

const nullableText = z.string().trim().max(1000).nullable().optional();

export const listSurveys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SurveyRow[]> => {
    await assertOrganizer(context);
    const { data, error } = await context.supabase
      .from("surveys")
      .select("id, slug, name, status, closes_at, updated_at, survey_responses(count)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status as SurveyStatus,
      closes_at: r.closes_at,
      updated_at: r.updated_at,
      response_count:
        (r.survey_responses as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
  });

export const getSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: row, error } = await context.supabase
      .from("surveys")
      .select(SURVEY_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("This survey is not available.");
    return {
      ...row,
      status: row.status as SurveyStatus,
      questions: (Array.isArray(row.questions) ? row.questions : []) as Record<string, never>[],
    };
  });

export const createSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ name: z.string().trim().min(2).max(120), templateId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    let intro: string | null = null;
    let thankYou: string | null = null;
    let questions: unknown = [];
    if (data.templateId) {
      const { data: tpl } = await context.supabase
        .from("form_templates")
        .select("intro, thank_you, questions")
        .eq("id", data.templateId)
        .maybeSingle();
      if (!tpl) throw new Error("This library form is not available.");
      intro = tpl.intro;
      thankYou = tpl.thank_you;
      questions = tpl.questions;
    }
    const { data: row, error } = await context.supabase
      .from("surveys")
      .insert({
        name: data.name,
        slug: uniqueSlug(slugify(data.name) || "survey", 80),
        intro,
        thank_you: thankYou,
        questions: questions as never,
        template_id: data.templateId,
      })
      .select("id")
      .maybeSingle();
    if (error || !row) throw new Error(error?.message ?? "The survey could not be created.");
    return { id: row.id };
  });

export const saveSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(120),
        intro: nullableText,
        intro_de: nullableText,
        intro_fr: nullableText,
        intro_it: nullableText,
        thank_you: nullableText,
        thank_you_de: nullableText,
        thank_you_fr: nullableText,
        thank_you_it: nullableText,
        questions: z.array(z.record(z.string(), z.unknown())).max(40),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { id, questions, ...rest } = data;
    const { error } = await context.supabase
      .from("surveys")
      .update({ ...rest, questions: questions as never })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSurveyPublishing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(SURVEY_STATUSES),
        opens_at: z.string().datetime().nullable(),
        closes_at: z.string().datetime().nullable(),
        max_responses: z.number().int().positive().max(100_000).nullable(),
        collect_contact: z.boolean(),
        one_per_browser: z.boolean(),
        members_only: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("surveys").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { error } = await context.supabase.from("surveys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSurveyResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertOrganizer(context);
    const { data: survey, error } = await context.supabase
      .from("surveys")
      .select("id, name, slug, collect_contact, questions")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !survey) throw new Error("This survey is not available.");
    const { data: rows, error: rErr } = await context.supabase
      .from("survey_responses")
      .select("id, answers, contact_name, contact_email, locale, created_at")
      .eq("survey_id", data.id)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (rErr) throw new Error(rErr.message);
    return {
      name: survey.name,
      slug: survey.slug,
      collectContact: survey.collect_contact,
      questions: surveyQuestions(
        (Array.isArray(survey.questions) ? survey.questions : []) as Record<string, unknown>[],
        "en",
      ),
      responses: (rows ?? []).map((r) => ({
        ...r,
        answers: (r.answers ?? {}) as Record<string, string>,
      })),
    };
  });

// ------------------------------------------------------------------ public

async function loadOpenSurvey(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("surveys")
    .select(SURVEY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (!row || row.status === "draft") return null;
  const { count } = await supabaseAdmin
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", row.id);
  const availability = surveyAvailability(
    { ...row, status: row.status as SurveyStatus },
    count ?? 0,
  );
  return { row, availability, supabaseAdmin };
}

/** Public: a survey by its link. Drafts and unknown links return null. */
export const getPublicSurvey = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(140) }).parse(input),
  )
  .handler(async ({ data }) => {
    const found = await loadOpenSurvey(data.slug);
    if (!found) return null;
    const { row, availability } = found;
    return {
      slug: row.slug,
      name: row.name,
      availability,
      collectContact: row.collect_contact,
      onePerBrowser: row.one_per_browser,
      membersOnly: row.members_only,
      texts: {
        intro: { en: row.intro, de: row.intro_de, fr: row.intro_fr, it: row.intro_it },
        thankYou: {
          en: row.thank_you,
          de: row.thank_you_de,
          fr: row.thank_you_fr,
          it: row.thank_you_it,
        },
      },
      questions: (availability === "open" && Array.isArray(row.questions)
        ? row.questions
        : []) as Record<string, string | number | boolean | null | string[]>[],
    };
  });

/** Public: submit an answer. Rate limited; outcome-neutral failures. */
export const submitSurveyResponse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().trim().min(1).max(140),
        locale: z.enum(["en", "de", "fr", "it"]),
        answers: z.record(z.string(), z.string().max(2000)),
        contactName: z.string().trim().max(120).optional(),
        contactEmail: z.string().trim().max(254).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { clientIp, checkRateLimit } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const verdict = await checkRateLimit("survey-submit", `ip:${clientIp(getRequest())}`, [
      { windowSeconds: 600, max: 10 },
      { windowSeconds: 86_400, max: 60 },
    ]);
    if (!verdict.allowed) return { ok: false as const, reason: "rate_limited" as const };

    const found = await loadOpenSurvey(data.slug);
    if (!found || found.availability !== "open") {
      return { ok: false as const, reason: "unavailable" as const };
    }
    const { row, supabaseAdmin } = found;
    const questions = surveyQuestions(
      (Array.isArray(row.questions) ? row.questions : []) as Record<string, unknown>[],
      "en",
    );
    const checked = validateSubmission(questions, data.answers);
    if (!checked.ok) return { ok: false as const, reason: "invalid" as const };

    let name: string | null = null;
    let email: string | null = null;
    if (row.collect_contact) {
      name = data.contactName?.trim() || null;
      email = data.contactEmail?.trim().toLowerCase() || null;
      if (!name || !email || !z.string().email().safeParse(email).success) {
        return { ok: false as const, reason: "invalid" as const };
      }
    }
    // Members-only surveys: verify the signed-in account belongs to an active
    // or grace member, and record participation in a separate table so the
    // answer itself stays unlinked from the member.
    let participantId: string | null = null;
    if (row.members_only) {
      const auth = getRequest().headers.get("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
      if (!token) return { ok: false as const, reason: "members_only" as const };
      const { data: user } = await supabaseAdmin.auth.getUser(token);
      if (!user.user) return { ok: false as const, reason: "members_only" as const };
      const { data: member } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("auth_user_id", user.user.id)
        .in("activity_state", ["active", "grace"])
        .maybeSingle();
      if (!member) return { ok: false as const, reason: "members_only" as const };
      const { error: pErr } = await supabaseAdmin
        .from("survey_participations")
        .insert({ survey_id: row.id, member_id: member.id as string });
      if (pErr) return { ok: false as const, reason: "already" as const };
      participantId = member.id as string;
    }
    const { error } = await supabaseAdmin.from("survey_responses").insert({
      survey_id: row.id,
      answers: checked.answers,
      contact_name: name,
      contact_email: email,
      locale: data.locale,
    });
    if (error) {
      if (participantId) {
        await supabaseAdmin
          .from("survey_participations")
          .delete()
          .eq("survey_id", row.id)
          .eq("member_id", participantId);
      }
      return { ok: false as const, reason: "unavailable" as const };
    }
    return { ok: true as const };
  });

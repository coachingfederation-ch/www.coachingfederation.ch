/**
 * Server function to submit and record organisation maturity survey responses.
 * Exports: submitOrganisationSurvey (createServerFn). Called by organisation pages.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submissionSchema = z.object({
  locale: z.enum(["en", "de", "fr", "it"]),
  primaryPressure: z.string().trim().max(64).nullable().optional(),
  answers: z.record(z.string().max(16), z.number().int().min(1).max(5)),
  dimensionScores: z.record(z.string().max(32), z.number().int().min(0).max(100)),
  totalScore: z.number().int().min(0).max(100),
  maturityBand: z.string().trim().max(32),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  contactOrganisation: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  consent: z.boolean(),
  // Honeypot: must stay empty.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type SurveySubmission = z.input<typeof submissionSchema>;

const nullable = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const submitOrganisationSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };

    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    // The table takes anonymous inserts, so one host cannot flood it.
    const verdict = await checkRateLimit("organisation-survey", `ip:${clientIp(request)}`, [
      { windowSeconds: 3_600, max: 8 },
      { windowSeconds: 86_400, max: 30 },
    ]);
    if (!verdict.allowed) return { ok: true as const };

    const { publicSupabaseClient } = await import("./supabase-public.server");
    const supabase = publicSupabaseClient();

    const { error } = await supabase.from("organisation_survey_responses").insert({
      locale: data.locale,
      primary_pressure: data.primaryPressure ?? null,
      answers: data.answers,
      dimension_scores: data.dimensionScores,
      total_score: data.totalScore,
      maturity_band: data.maturityBand,
      contact_name: nullable(data.contactName),
      contact_email: nullable(data.contactEmail),
      contact_organisation: nullable(data.contactOrganisation),
      message: nullable(data.message),
      consent: data.consent,
      source: "for-organisations",
    });

    if (error) {
      console.error("organisation survey insert failed", error);
      return { ok: false as const };
    }
    return { ok: true as const };
  });

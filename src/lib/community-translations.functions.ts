/**
 * AI translation for operational-structure community content.
 *
 * Mirrors the article/event workflow: the English source (name, markdown
 * description, cadence note) is machine-translated into one target locale and
 * written back into the `*_de` / `*_fr` / `*_it` columns of `op_projects`.
 *
 * Paid AI call — gated on `admin`, the same role that may edit the operational
 * structure at all. The write-back goes through the caller's own RLS-scoped
 * client, so the "admins manage op_projects" policy stays the real boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
};

const inputSchema = z.object({
  projectId: z.string().uuid(),
  locale: z.enum(["de", "fr", "it"]),
});

export type CommunityTranslationResult = {
  locale: "de" | "fr" | "it";
  name: string;
  description: string | null;
  cadence_note: string | null;
};

export const translateCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<CommunityTranslationResult> => {
    const { supabase } = context;
    await assertPlatformAdmin(context);

    const { data: project, error } = await supabase
      .from("op_projects")
      .select("id, name, description, cadence_note")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Translation service is not configured");

    const prompt = [
      `Translate the following local-community content from English into ${LOCALE_NAMES[data.locale]}.`,
      "Keep Markdown formatting, links and structure exactly as they are.",
      "Use a warm, professional tone suitable for The Switzerland Chapter of ICF.",
      "Do not translate proper nouns such as ICF, ACC, PCC, MCC, Zürich, Basel, Bern, Lausanne, Genève, Lugano.",
      'Respond with JSON only, in the shape {"name": "...", "description": "...", "cadence_note": "..."}.',
      "Use an empty string for any field that is empty in the source.",
      "",
      `NAME: ${project.name ?? ""}`,
      `CADENCE_NOTE: ${project.cadence_note ?? ""}`,
      "DESCRIPTION:",
      project.description ?? "",
    ].join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a professional Swiss editorial translator. You reply with JSON only.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached — please try again shortly.");
    if (response.status === 402)
      throw new Error("AI credits exhausted — please top up the workspace.");
    if (!response.ok) throw new Error(`Translation service error (${response.status})`);

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    let parsed: { name?: string; description?: string; cadence_note?: string };
    try {
      parsed = JSON.parse(
        raw
          .replace(/^```(?:json)?/i, "")
          .replace(/```$/, "")
          .trim(),
      );
    } catch {
      throw new Error("Translation service returned an unexpected response");
    }

    const clean = (value: string | undefined) => (value && value.trim() ? value : null);
    const suffix = data.locale;
    const update = {
      [`name_${suffix}`]: clean(parsed.name) ?? project.name,
      [`description_${suffix}`]: clean(parsed.description),
      [`cadence_note_${suffix}`]: clean(parsed.cadence_note),
    };

    const { error: updateError } = await supabase
      .from("op_projects")
      .update(update as never)
      .eq("id", data.projectId);
    if (updateError) throw new Error(updateError.message);

    return {
      locale: data.locale,
      name: update[`name_${suffix}`] as string,
      description: update[`description_${suffix}`] as string | null,
      cadence_note: update[`cadence_note_${suffix}`] as string | null,
    };
  });

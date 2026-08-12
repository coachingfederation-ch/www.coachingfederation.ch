/**
 * AI writing assistance for the CMS Markdown body editor.
 *
 * Deliberately shaped like `translations.functions.ts`: same gateway, same
 * staff gate before any paid call, same error mapping — so editors meet one
 * AI model across the CMS. The handler only returns text; applying it to the
 * draft is a decision the editor makes in the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./authz";

const LOCALE_NAMES: Record<string, string> = {
  de: "Swiss Standard German (no ß, use ss)",
  fr: "Swiss French",
  it: "Swiss Italian",
  en: "English",
};

const ACTIONS = ["improve", "grammar", "shorten", "expand", "continue", "prompt"] as const;

const inputSchema = z.object({
  action: z.enum(ACTIONS),
  text: z.string().max(60000).default(""),
  prompt: z.string().max(2000).optional(),
  language: z.enum(["de", "fr", "it", "en"]).default("en"),
});

const INSTRUCTIONS: Record<(typeof ACTIONS)[number], string> = {
  improve:
    "Improve the writing: tighten it, make it clearer and more engaging, keep the meaning and every fact unchanged.",
  grammar:
    "Correct grammar, spelling and punctuation only. Do not rewrite, reorder or restyle anything else.",
  shorten: "Make the text noticeably shorter while keeping every important point.",
  expand: "Expand the text with more depth and detail, without inventing facts or claims.",
  continue:
    "Continue writing from where the text stops, in the same voice and structure. Return only the continuation, not the text you were given.",
  prompt: "Follow the editor's instruction below.",
};

/** Runs one writing action over the supplied Markdown and returns the result. */
export const assistWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Paid AI call: gate on a CMS role, never on merely being signed in.
    await assertStaff(context);

    const text = data.text.trim();
    const prompt = (data.prompt ?? "").trim();
    if (data.action === "prompt" && !prompt) throw new Error("Add an instruction first.");
    if (data.action !== "prompt" && !text) throw new Error("Add some text first.");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured");

    const userContent = [
      INSTRUCTIONS[data.action],
      `Write in ${LOCALE_NAMES[data.language] ?? "English"}.`,
      "Keep Markdown formatting, links and structure intact. Return only the resulting Markdown — no commentary, no code fences.",
      prompt ? `\nEDITOR INSTRUCTION:\n${prompt}` : "",
      text ? `\nTEXT:\n${text}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an editorial writing assistant for The Switzerland Chapter of ICF. You write in a professional, warm, inclusive editorial voice, in sentence case, with short clear sentences. You never invent statistics, testimonials or effectiveness claims. You reply with Markdown text only.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached — please try again shortly.");
    if (response.status === 402)
      throw new Error("AI credits exhausted — please top up the workspace.");
    if (!response.ok) throw new Error(`AI service error (${response.status})`);

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = (payload.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = raw
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```$/, "")
      .trim();
    if (!cleaned) throw new Error("The AI service returned an empty result");

    return { text: cleaned };
  });

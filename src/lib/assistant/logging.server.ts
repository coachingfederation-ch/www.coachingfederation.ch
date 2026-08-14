/**
 * Privacy-preserving telemetry for the site assistant.
 *
 * One metadata row per answered question: what kind of question it was, in
 * which language, how it went. The visitor's own words and the assistant's
 * reply are used once, in memory, to classify — never written down. No email
 * address, no IP address, no transcript.
 *
 * Logging is strictly best-effort: every path swallows its own errors so a
 * classification or database hiccup can never break, delay or truncate the
 * answer the visitor is reading.
 */
import { generateText } from "ai";
import type { Locale } from "@/i18n/config";
import type { ChatOutcome } from "@/lib/chat-insights";

const CONTACT_PATTERNS = [/office@coachingfederation\.ch/i, /\/contact\b/i];

/** The assistant showed the human fallback when the reply names it. */
export function detectContactShown(answer: string): boolean {
  return CONTACT_PATTERNS.some((p) => p.test(answer));
}

type ClassifyInput = {
  question: string;
  answer: string;
  locale: Locale;
  /** True when the stream ended in an error or produced no usable text. */
  errored: boolean;
};

type Classification = {
  category: string;
  detail: string | null;
  outcome: ChatOutcome;
  escalationReason: string | null;
};

const OUTCOME_SET = new Set<ChatOutcome>([
  "successful",
  "partially_successful",
  "escalated",
  "unsuccessful",
  "unknown",
]);

async function activeSlugs(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("chat_question_categories")
    .select("slug, description, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((c) => c.slug as string);
}

/**
 * Asks a small, cheap model to label the exchange. The rules mirror the
 * definitions the reporting page documents, so "escalated" always means the
 * same thing whether a human or the model decided it.
 */
async function classify(input: ClassifyInput, slugs: string[]): Promise<Classification> {
  const contactShown = detectContactShown(input.answer);
  const fallback: Classification = {
    category: "other",
    detail: null,
    outcome: input.errored ? "unsuccessful" : contactShown ? "escalated" : "unknown",
    escalationReason: contactShown ? "contact_details_offered" : null,
  };

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || input.errored || !input.question.trim()) return fallback;

  try {
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      system: `You label support conversations for The Switzerland Chapter of ICF. Reply with JSON only, no prose, no code fences.

Schema: {"category": string, "detail": string, "outcome": string, "escalation_reason": string}

"category" must be exactly one of: ${slugs.join(", ")}.
"detail" is at most six words describing the topic, with no names, emails or personal data. Use "" when nothing useful can be said.
"outcome" must be one of:
- "successful": a relevant, complete answer was given without offering the contact address.
- "partially_successful": useful information, but the visitor may still need more support.
- "escalated": the answer shows the contact email or tells the visitor to contact the chapter.
- "unsuccessful": no usable answer, or an error.
- "unknown": impossible to tell.
"escalation_reason" is at most eight words, only when the outcome is "escalated"; otherwise "".`,
      prompt: `Language: ${input.locale}
Contact address appeared in the answer: ${contactShown ? "yes" : "no"}

Visitor question:
${input.question.slice(0, 1500)}

Assistant answer:
${input.answer.slice(0, 3000)}`,
    });

    const json = text
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const category = typeof parsed.category === "string" ? parsed.category : "other";
    const outcome =
      typeof parsed.outcome === "string" ? (parsed.outcome as ChatOutcome) : "unknown";
    const detail = typeof parsed.detail === "string" ? parsed.detail.trim().slice(0, 120) : "";
    const reason =
      typeof parsed.escalation_reason === "string"
        ? parsed.escalation_reason.trim().slice(0, 160)
        : "";

    // The deterministic signal wins: if the contact address is on screen, the
    // interaction is an escalation whatever the model called it.
    const finalOutcome: ChatOutcome = contactShown
      ? "escalated"
      : OUTCOME_SET.has(outcome)
        ? outcome
        : "unknown";

    return {
      category: slugs.includes(category) ? category : "other",
      detail: detail || null,
      outcome: finalOutcome,
      escalationReason: finalOutcome === "escalated" ? reason || "contact_details_offered" : null,
    };
  } catch {
    return fallback;
  }
}

export type LogInput = {
  /** Client-generated interaction id, so feedback can find this row later. */
  interactionId: string;
  sessionId: string | null;
  locale: Locale;
  question: string;
  answer: string;
  errored: boolean;
};

/** Classifies and stores one interaction. Never throws. */
export async function logChatInteraction(input: LogInput): Promise<void> {
  try {
    const slugs = await activeSlugs();
    const result = await classify(
      {
        question: input.question,
        answer: input.answer,
        locale: input.locale,
        errored: input.errored,
      },
      slugs.length ? slugs : ["other"],
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("chat_interaction_logs").insert({
      id: input.interactionId,
      session_id: input.sessionId,
      category_slug: result.category,
      category_detail: result.detail,
      locale: input.locale,
      outcome: result.outcome,
      contact_shown: detectContactShown(input.answer),
      escalation_reason: result.escalationReason,
    });
    if (error) console.error("[assistant/logging] insert failed", error.message);
  } catch (e) {
    console.error("[assistant/logging]", e);
  }
}

/** Records visitor feedback or a click on the contact address. Never throws. */
export async function recordChatSignal(input: {
  interactionId: string;
  feedback?: "helpful" | "not_helpful";
  contactClicked?: boolean;
}): Promise<void> {
  try {
    const patch: { feedback?: "helpful" | "not_helpful"; contact_clicked?: boolean } = {};
    if (input.feedback) patch.feedback = input.feedback;
    if (input.contactClicked) patch.contact_clicked = true;
    if (Object.keys(patch).length === 0) return;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("chat_interaction_logs")
      .update(patch)
      .eq("id", input.interactionId);
    if (error) console.error("[assistant/logging] signal failed", error.message);
  } catch (e) {
    console.error("[assistant/logging]", e);
  }
}

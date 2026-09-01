/**
 * Contact conversation — server functions called from the About page.
 *
 * Exports: draftContactSummary, submitContactEnquiry, confirmContactEnquiry.
 * The drafting call turns the conversation into a summary the visitor then
 * edits; the visitor's edited text is what is actually sent, never the model
 * output. Sending is a two-step, double opt-in flow — see contact-agent.server.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const localeSchema = z.enum(["en", "de", "fr", "it"]);

/** The two conversation flows that end in a message to our office. */
export type EnquiryKind = "contact" | "event_proposal";

const kindSchema = z.enum(["contact", "event_proposal"]).default("contact");

const draftSchema = z.object({
  locale: localeSchema,
  kind: kindSchema,
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(4_000),
      }),
    )
    .min(1)
    .max(40),
});

const LANGUAGE_NAMES: Record<z.infer<typeof localeSchema>, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
};

export type ContactDraft = {
  ok: boolean;
  name: string;
  email: string;
  subject: string;
  body: string;
};

const SUMMARY_RULES = `- Summarise only what the visitor actually said. Never invent facts, needs, dates, numbers or claims.
- Return the visitor's name and email address exactly as they gave them. If one was never given, return an empty string for it.
- Always write "The Switzerland Chapter of ICF", "ICF Credential" and "credentialed coach".`;

function summarySystemPrompt(
  kind: z.infer<typeof kindSchema>,
  locale: z.infer<typeof localeSchema>,
) {
  const language = LANGUAGE_NAMES[locale];

  if (kind === "event_proposal") {
    return `You prepare an event proposal that a website visitor of The Switzerland Chapter of ICF is about to send to the chapter office.

Write the subject and the body in ${language}.

Rules:
- The body is written in the visitor's own voice ("I would like to propose…"), first person, sentence case, active voice, no salutation and no signature. Cover, in this order and only where the visitor said something about it: the idea and its takeaway, the type and format, the main audience, who would lead it, and the rough timing. Short sentences or a short list.
- The subject starts with "Event proposal: " followed by a short factual line, at most 70 characters in total.
${SUMMARY_RULES}`;
  }

  return `You prepare a message that a website visitor of The Switzerland Chapter of ICF is about to send to the chapter office.

Write the subject and the body in ${language}.

Rules:
- The body is written in the visitor's own voice ("I would like to…"), first person, three to eight short sentences or a short list. Sentence case, active voice, no salutation and no signature.
- The subject is a short factual line, at most 70 characters.
${SUMMARY_RULES}`;
}

/** Turns the conversation into a subject, a body and the contact details. */
export const draftContactSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => draftSchema.parse(data))
  .handler(async ({ data }): Promise<ContactDraft> => {
    const empty: ContactDraft = { ok: false, name: "", email: "", subject: "", body: "" };

    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const verdict = await checkRateLimit(
      data.kind === "event_proposal" ? "proposal-draft" : "contact-draft",
      `ip:${clientIp(getRequest())}`,
      [
        { windowSeconds: 3_600, max: 12 },
        { windowSeconds: 86_400, max: 40 },
      ],
    );
    if (!verdict.allowed) return empty;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return empty;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText, Output } = await import("ai");

    const conversation = data.transcript
      .map((turn) => `${turn.role === "user" ? "Visitor" : "Assistant"}: ${turn.text}`)
      .join("\n\n");

    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { output } = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        output: Output.object({
          schema: z.object({
            name: z.string(),
            email: z.string(),
            subject: z.string(),
            body: z.string(),
          }),
        }),
        system: summarySystemPrompt(data.kind, data.locale),
        prompt: `Conversation:\n\n${conversation}`,
      });

      return {
        ok: true,
        name: (output.name ?? "").trim().slice(0, 200),
        email: (output.email ?? "").trim().slice(0, 320),
        subject: (output.subject ?? "").trim().slice(0, 200),
        body: (output.body ?? "").trim().slice(0, 8_000),
      };
    } catch (err) {
      console.error("[contact-agent] summary failed", err);
      return empty;
    }
  });

const submitSchema = z.object({
  locale: localeSchema,
  kind: kindSchema,
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().min(3).max(320),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(8_000),
  // Honeypot: must stay empty.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactSubmitResult = { status: "verification_sent" | "rate_limited" | "error" };

/** Stores the reviewed summary and emails the visitor a confirmation link. */
export const submitContactEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }): Promise<ContactSubmitResult> => {
    if (data.website) return { status: "verification_sent" };

    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    // Each submission sends outbound mail, so the cap is tighter than the chat.
    const verdict = await checkRateLimit(
      data.kind === "event_proposal" ? "proposal-submit" : "contact-submit",
      `ip:${clientIp(getRequest())}`,
      [
        { windowSeconds: 3_600, max: 3 },
        { windowSeconds: 86_400, max: 10 },
      ],
    );
    if (!verdict.allowed) return { status: "rate_limited" };

    const { createPendingEnquiry, isPlausibleEmail } = await import("./contact-agent.server");
    if (!isPlausibleEmail(data.email)) return { status: "error" };

    const result = await createPendingEnquiry({
      name: data.name,
      email: data.email,
      subject: data.subject,
      body: data.body,
      locale: data.locale,
      kind: data.kind,
    });
    return {
      status: result.outcome === "verification_sent" ? "verification_sent" : result.outcome,
    };
  });

/** Consumes the one-time link from the visitor's inbox and delivers the message. */
export const confirmContactEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().min(10).max(128) }).parse(data))
  .handler(async ({ data }) => {
    const { checkRateLimit, clientIp } = await import("./rate-limit.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const verdict = await checkRateLimit("contact-confirm", `ip:${clientIp(getRequest())}`, [
      { windowSeconds: 3_600, max: 20 },
      { windowSeconds: 86_400, max: 60 },
    ]);
    if (!verdict.allowed) return { status: "invalid" as const };

    const { confirmEnquiry } = await import("./contact-agent.server");
    const result = await confirmEnquiry(data.token);
    return result.status === "invalid"
      ? { status: "invalid" as const }
      : { status: result.status, subject: result.subject, locale: result.locale };
  });

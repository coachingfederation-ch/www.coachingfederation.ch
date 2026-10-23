import { z } from "zod";

export const ballotQuestionSchema = z.string().trim().max(600);
export const ballotQuestionInput = z
  .object({
    title: z.string().trim().min(3).max(160),
    summary: z.string().trim().max(600),
    description: z.string().trim().max(20000),
    options: z
      .array(z.object({ label: z.string().trim().min(1).max(120) }))
      .min(2)
      .max(10),
  })
  .refine((value) => Boolean(value.summary || value.description), {
    message: "Add proposal text before requesting a ballot question.",
  });

export function parseBallotQuestion(text: string): string {
  return ballotQuestionSchema.min(1).parse(text);
}

export const QUESTION_FIELDS = [
  "ballot_question",
  "ballot_question_de",
  "ballot_question_fr",
  "ballot_question_it",
] as const;

export function ballotQuestionChanged(
  current: Partial<Record<(typeof QUESTION_FIELDS)[number], string | null>>,
  next: Partial<Record<(typeof QUESTION_FIELDS)[number], string | null>>,
) {
  return QUESTION_FIELDS.some((field) => (current[field] ?? null) !== (next[field] ?? null));
}

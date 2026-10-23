import { z } from "zod";

export const translatedOptionSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  label_de: z.string().trim().max(120).optional(),
  label_fr: z.string().trim().max(120).optional(),
  label_it: z.string().trim().max(120).optional(),
});
export const voteTranslationInput = z.object({
  title: z.string().trim().min(3).max(160),
  summary: z.string().trim().max(600),
  description: z.string().trim().max(20000),
  options: z.array(translatedOptionSchema).min(2).max(10),
});
const translatedText = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(600),
  description: z.string().trim().max(20000),
  options: z.array(z.object({ key: z.string(), label: z.string().trim().min(1).max(120) })),
});
export const voteTranslationOutput = z.object({ de: translatedText, fr: translatedText, it: translatedText });
export type VoteTranslations = z.infer<typeof voteTranslationOutput>;

/** Keys, not positions, bind translated labels to the existing ballot choices. */
export function parseVoteTranslations(raw: unknown, keys: string[]): VoteTranslations {
  const result = voteTranslationOutput.parse(raw);
  for (const locale of ["de", "fr", "it"] as const) {
    const got = result[locale].options.map((option) => option.key);
    if (got.length !== keys.length || new Set(got).size !== keys.length || keys.some((key) => !got.includes(key))) {
      throw new Error("Translation returned different voting options. Nothing was changed.");
    }
  }
  return result;
}
/**
 * Turns pasted text or a CSV file into a clean, de-duplicated email list.
 * Any cell that looks like an email is taken; everything else (names, header
 * rows) is ignored, except tokens containing "@" that fail validation, which
 * are reported as invalid so staff can spot typos.
 */
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

export const MAX_BULK_INVITES = 500;

export function parseInviteList(text: string): { emails: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/^[<"'(]+|[>"')]+$/g, "").trim();
    if (!token) continue;
    if (!token.includes("@")) continue;
    const email = token.toLowerCase();
    if (!EMAIL.test(email)) {
      invalid.push(token);
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return { emails, invalid };
}

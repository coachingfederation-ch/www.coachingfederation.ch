/**
 * Browser-safe cleanup of an uploaded meeting transcript before it is sent to
 * the AI recap draft. Strips what must never leave the browser for this use
 * (embedded images, links, email addresses) and caps the length so a 2 MB
 * "Notes by Gemini" export becomes a few dozen kilobytes of plain text.
 */
export const TRANSCRIPT_MAX_CHARS = 120_000;

export function cleanTranscript(raw: string): string {
  let text = raw;
  // Reference-style embedded images: [image1]: <data:image/png;base64,...>
  text = text.replace(/^\[[^\]]+\]:\s*<?data:[^\s>]*>?\s*$/gim, "");
  text = text.replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, "");
  // Markdown images, then links (keep the label, drop the URL).
  text = text.replace(/!\[[^\]]*\]\[[^\]]*\]|!\[[^\]]*\]\([^)]*\)/g, "");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/https?:\/\/\S+/g, "");
  // Token-wise email removal: a single regex backtracks badly on long runs.
  text = text
    .split("\n")
    .map((line) => (line.includes("@") ? line.split(/(\s+)/).filter((w) => !w.includes("@")).join("") : line))
    .join("\n");
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.slice(0, TRANSCRIPT_MAX_CHARS);
}

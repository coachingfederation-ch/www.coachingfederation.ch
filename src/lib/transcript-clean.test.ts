import { describe, expect, it } from "vitest";
import { TRANSCRIPT_MAX_CHARS, cleanTranscript } from "./transcript-clean";

describe("cleanTranscript", () => {
  it("removes embedded images", () => {
    const out = cleanTranscript("Hello\n![][image1]\n[image1]: <data:image/png;base64,AAAA>");
    expect(out).toBe("Hello");
  });
  it("keeps link labels but drops URLs and email addresses", () => {
    const out = cleanTranscript("Invited [Anna Muster](mailto:anna.muster@example.com) see https://x.y/z");
    expect(out).toBe("Invited Anna Muster see");
  });
  it("caps the length", () => {
    expect(cleanTranscript("a".repeat(TRANSCRIPT_MAX_CHARS + 50)).length).toBe(TRANSCRIPT_MAX_CHARS);
  });
});

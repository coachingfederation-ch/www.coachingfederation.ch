import { describe, expect, it } from "vitest";
import { parseVoteTranslations, translatedOptionSchema } from "./vote-translations";
import { voteOptionLabel } from "./votes";

const translated = () => ({ title: "Proposal", summary: "", description: "**Proposal**", options: [{ key: "yes", label: "Ja" }, { key: "no", label: "Nein" }] });
const result = () => ({ de: translated(), fr: translated(), it: translated() });

describe("vote translations", () => {
  it("preserves all three localized labels during save validation", () => {
    expect(translatedOptionSchema.parse({ key: "yes", label: "Yes", label_de: "Ja", label_fr: "Oui", label_it: "Sì" })).toEqual({ key: "yes", label: "Yes", label_de: "Ja", label_fr: "Oui", label_it: "Sì" });
  });
  it("falls back to English for legacy or empty labels", () => {
    expect(voteOptionLabel({ key: "yes", label: "Yes" }, "de")).toBe("Yes");
    expect(voteOptionLabel({ key: "yes", label: "Yes", label_fr: " " }, "fr")).toBe("Yes");
  });
  it("displays translated labels without changing the ballot key", () => {
    const option = { key: "yes", label: "Yes", label_it: "Sì" };
    expect(voteOptionLabel(option, "it")).toBe("Sì");
    expect(option.key).toBe("yes");
  });
  it("rejects replaced option keys", () => {
    const value = result(); value.fr.options[0] = { key: "oui", label: "Oui" };
    expect(() => parseVoteTranslations(value, ["yes", "no"])).toThrow();
  });
  it("rejects missing and duplicated options", () => {
    const missing = result(); missing.it.options.pop();
    expect(() => parseVoteTranslations(missing, ["yes", "no"])).toThrow();
    const duplicate = result(); duplicate.de.options[1] = { key: "yes", label: "Ja" };
    expect(() => parseVoteTranslations(duplicate, ["yes", "no"])).toThrow();
  });
  it("accepts reordered output because labels are matched by key", () => {
    const value = result(); value.de.options.reverse();
    expect(parseVoteTranslations(value, ["yes", "no"]).de.options.find((o) => o.key === "yes")?.label).toBe("Ja");
  });
});
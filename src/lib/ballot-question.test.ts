import { describe, expect, it } from "vitest";
import { ballotQuestionChanged, ballotQuestionInput, parseBallotQuestion } from "./ballot-question";
import { localized } from "./votes";

describe("ballot question", () => {
  it("requires proposal text to extract a suggestion", () => {
    const input = {
      title: "Community project",
      summary: "",
      description: "",
      options: [{ label: "Yes" }, { label: "No" }],
    };
    expect(ballotQuestionInput.safeParse(input).success).toBe(false);
    expect(
      ballotQuestionInput.safeParse({ ...input, description: "Launch a mentoring program." })
        .success,
    ).toBe(true);
  });
  it("accepts a question that can be refined without changing options", () => {
    expect(parseBallotQuestion("  Should we launch a mentoring program?  ")).toBe(
      "Should we launch a mentoring program?",
    );
  });
  it("rejects empty suggestions", () => {
    expect(() => parseBallotQuestion(" ")).toThrow();
  });
  it("detects changes to any frozen language version", () => {
    const current = {
      ballot_question: "Approve the project?",
      ballot_question_fr: "Approuver le projet ?",
    };
    expect(ballotQuestionChanged(current, current)).toBe(false);
    expect(
      ballotQuestionChanged(current, { ...current, ballot_question_fr: "Approuver le budget ?" }),
    ).toBe(true);
  });
  it("uses the translated question and English fallback for existing votes", () => {
    const row = {
      ballot_question: "Approve the project?",
      ballot_question_de: "Projekt genehmigen?",
    };
    expect(localized(row, "ballot_question", "de")).toBe("Projekt genehmigen?");
    expect(localized(row, "ballot_question", "it")).toBe("Approve the project?");
    expect(localized({}, "ballot_question", "en")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { surveyAvailability, surveyQuestions } from "./surveys";

const now = new Date("2026-10-20T12:00:00Z");
const base = { status: "open" as const, opens_at: null, closes_at: null, max_responses: null };

describe("surveyAvailability", () => {
  it("draft surveys are never answerable", () => {
    expect(surveyAvailability({ ...base, status: "draft" }, 0, now)).toBe("draft");
  });
  it("closed status wins over dates", () => {
    expect(surveyAvailability({ ...base, status: "closed" }, 0, now)).toBe("closed");
  });
  it("is not open before the opening time", () => {
    expect(surveyAvailability({ ...base, opens_at: "2026-10-21T00:00:00Z" }, 0, now)).toBe(
      "not_open",
    );
  });
  it("closes at the closing time", () => {
    expect(surveyAvailability({ ...base, closes_at: "2026-10-20T12:00:00Z" }, 0, now)).toBe(
      "closed",
    );
  });
  it("is full once the response limit is reached", () => {
    expect(surveyAvailability({ ...base, max_responses: 200 }, 200, now)).toBe("full");
    expect(surveyAvailability({ ...base, max_responses: 200 }, 199, now)).toBe("open");
  });
});

describe("surveyQuestions", () => {
  it("links conditions by position and falls back to English", () => {
    const qs = surveyQuestions(
      [
        {
          question_key: "role",
          qtype: "single_choice",
          label: "Role",
          label_de: "Rolle",
          options: ["Coach"],
          condition_index: -1,
        },
        {
          question_key: "why",
          qtype: "short_text",
          label: "Why",
          options: [],
          condition_index: 0,
          condition_value: "Coach",
        },
      ],
      "de",
    );
    expect(qs[0]?.label).toBe("Rolle");
    expect(qs[1]?.label).toBe("Why");
    expect(qs[1]?.conditionQuestionId).toBe("q0");
    expect(qs[1]?.conditionValue).toBe("Coach");
  });
});

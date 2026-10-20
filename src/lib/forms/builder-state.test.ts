import { describe, expect, it } from "vitest";
import {
  builderReducer,
  emptyForm,
  questionsFromIndexed,
  toQuestionPayload,
  type BuilderForm,
} from "./builder-state";

function withThree(): BuilderForm {
  let f = emptyForm("Feedback");
  f = builderReducer(f, { type: "add", qtype: "single_choice", at: 0, uid: "a" });
  f = builderReducer(f, { type: "add", qtype: "short_text", at: 1, uid: "b" });
  f = builderReducer(f, { type: "add", qtype: "short_text", at: 2, uid: "c" });
  f = builderReducer(f, {
    type: "patch",
    uid: "a",
    patch: { label: "Role", options: ["Coach", "Leader"] },
  });
  f = builderReducer(f, {
    type: "patch",
    uid: "c",
    patch: { label: "Why", condition_uid: "a", condition_value: "Coach" },
  });
  return f;
}

describe("form builder state", () => {
  it("keeps a show-only-if rule when its source still comes first after a move", () => {
    const f = builderReducer(withThree(), { type: "move", uid: "b", to: 0 });
    expect(f.questions.map((q) => q.uid)).toEqual(["b", "a", "c"]);
    expect(f.questions[2]!.condition_uid).toBe("a");
    expect(toQuestionPayload(f.questions)[2]!.condition_index).toBe(1);
  });

  it("drops the rule when the dependent question moves above its source", () => {
    const f = builderReducer(withThree(), { type: "move", uid: "c", to: 0 });
    expect(f.questions[0]!.condition_uid).toBeNull();
    expect(f.questions[0]!.condition_value).toBe("");
  });

  it("drops the rule when its source question is removed", () => {
    const f = builderReducer(withThree(), { type: "remove", uid: "a" });
    expect(f.questions.find((q) => q.uid === "c")!.condition_uid).toBeNull();
  });

  it("drops the rule when the source becomes a type that cannot carry one", () => {
    const f = builderReducer(withThree(), {
      type: "patch",
      uid: "a",
      patch: { qtype: "long_text" },
    });
    expect(f.questions[2]!.condition_uid).toBeNull();
  });

  it("round-trips position-based rules from a template", () => {
    const payload = toQuestionPayload(withThree().questions);
    const back = questionsFromIndexed(payload as unknown as Record<string, unknown>[]);
    expect(back[2]!.condition_uid).toBe(back[0]!.uid);
    expect(back.every((q) => q.id === null)).toBe(true);
  });
});

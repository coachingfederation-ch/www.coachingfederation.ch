import { describe, expect, it } from "vitest";
import { idlePhase } from "./use-idle-sign-out";

const MIN = 60_000;
describe("staff idle sign-out", () => {
  it("stays active before 28 minutes", () => {
    expect(idlePhase(0, 27 * MIN)).toBe("active");
  });
  it("warns from 28 minutes", () => {
    expect(idlePhase(0, 28 * MIN)).toBe("warning");
  });
  it("signs out at 30 minutes", () => {
    expect(idlePhase(0, 30 * MIN)).toBe("expired");
  });
});

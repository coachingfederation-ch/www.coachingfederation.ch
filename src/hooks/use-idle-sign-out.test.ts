import { describe, expect, it, vi } from "vitest";
import { createIdleTracker, idlePhase, type IdlePhase } from "./use-idle-sign-out";

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

function setup() {
  let clock = 0;
  let stored: number | null = null;
  const phases: IdlePhase[] = [];
  const onExpire = vi.fn();
  const tracker = createIdleTracker({
    now: () => clock,
    store: { read: () => stored, write: (v) => (stored = v) },
    onPhase: (p) => phases.push(p),
    onExpire,
  });
  tracker.start();
  /** Advance the clock in 15-second ticks, like the browser interval. */
  const advance = (ms: number) => {
    const end = clock + ms;
    while (clock < end) {
      clock = Math.min(end, clock + 15_000);
      tracker.tick();
    }
  };
  return { tracker, advance, phases, onExpire, setStored: (v: number) => (stored = v), now: () => clock };
}

describe("staff idle tracker", () => {
  it("keeps the warning open and signs out at 30 idle minutes", () => {
    const { tracker, advance, phases, onExpire } = setup();
    advance(28 * MIN);
    expect(tracker.phase).toBe("warning");
    advance(MIN);
    expect(tracker.phase).toBe("warning");
    expect(onExpire).not.toHaveBeenCalled();
    advance(MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(phases).toEqual(["warning", "expired"]);
  });

  it("ignores mouse and keyboard activity while the warning is open", () => {
    const { tracker, advance, onExpire } = setup();
    advance(28 * MIN);
    tracker.activity();
    advance(2 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("resets the timer when the staff member chooses to stay", () => {
    const { tracker, advance, onExpire } = setup();
    advance(28 * MIN);
    tracker.stay();
    expect(tracker.phase).toBe("active");
    advance(27 * MIN);
    expect(tracker.phase).toBe("active");
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("stays active while another staff tab records activity", () => {
    const { tracker, advance, setStored, now, onExpire } = setup();
    advance(20 * MIN);
    setStored(now());
    advance(20 * MIN);
    expect(tracker.phase).toBe("active");
    expect(onExpire).not.toHaveBeenCalled();
  });
});

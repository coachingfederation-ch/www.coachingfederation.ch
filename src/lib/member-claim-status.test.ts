import { describe, expect, it } from "vitest";
import { deriveClaimStatuses, type ClaimLinkRow } from "./member-claim-status";

const NOW = Date.parse("2026-11-12T13:20:00Z");
const link = (
  member_id: string,
  requested_at: string,
  expires_at: string,
  consumed_at: string | null = null,
): ClaimLinkRow => ({
  member_id,
  requested_at,
  expires_at,
  consumed_at,
});

describe("deriveClaimStatuses", () => {
  it("counts a member invited today as invited even behind more than 1,000 older links", () => {
    const old = Array.from({ length: 2718 }, (_, i) =>
      link(`m${i}`, "2026-09-01T08:00:00Z", "2026-09-08T08:00:00Z"),
    );
    const fresh = link("new-member", "2026-11-12T13:15:40Z", "2026-11-19T13:15:40Z");
    expect(deriveClaimStatuses([], [...old, fresh], NOW)["new-member"]).toBe("invited");
  });

  it("uses the newest link regardless of row order", () => {
    const lapsed = link("m1", "2026-10-01T08:00:00Z", "2026-10-08T08:00:00Z");
    const fresh = link("m1", "2026-11-12T08:00:00Z", "2026-11-19T08:00:00Z");
    expect(deriveClaimStatuses([], [fresh, lapsed], NOW).m1).toBe("invited");
  });

  it("marks a member expired when the newest link lapsed unused", () => {
    expect(
      deriveClaimStatuses([], [link("m1", "2026-10-01T08:00:00Z", "2026-10-08T08:00:00Z")], NOW).m1,
    ).toBe("expired");
  });

  it("keeps a bound member claimed even with an open link", () => {
    expect(
      deriveClaimStatuses(["m1"], [link("m1", "2026-11-12T08:00:00Z", "2026-11-19T08:00:00Z")], NOW)
        .m1,
    ).toBe("claimed");
  });

  it("leaves members without any link out, so the list shows them as not invited", () => {
    expect(deriveClaimStatuses([], [], NOW).m1).toBeUndefined();
  });
});

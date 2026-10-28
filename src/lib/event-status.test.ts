import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  authorize: vi.fn(),
  notify: vi.fn(),
  invitations: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./authz", () => ({ assertOrganizer: mock.authorize }));
vi.mock("./event-cancellation.server", () => ({ sendEventCancellationNotices: mock.notify }));
vi.mock("./event-invitations.server", () => ({ sendQueuedInvitations: mock.invitations }));

import { setEventStatus } from "./events-admin.functions";

const handler = setEventStatus as unknown as (input: {
  data: { id: string; status: string };
  context: { supabase: unknown; userId: string };
}) => Promise<unknown>;

function context(row: unknown, error: unknown = null) {
  const query = {
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    select: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: row, error })),
  };
  return { supabase: { from: vi.fn(() => query) }, userId: "test-staff" };
}

beforeEach(() => {
  vi.resetAllMocks();
  mock.authorize.mockResolvedValue(undefined);
  mock.notify.mockResolvedValue({ sent: 2, skipped: 0, failed: 0 });
  mock.invitations.mockResolvedValue({ sent: 0, failed: 0 });
});

describe("authorized event cancellation trigger", () => {
  it("notifies attendees only after an allowed event write returns a row", async () => {
    expect(
      await handler({
        data: { id: "event", status: "cancelled" },
        context: context({ id: "event" }),
      }),
    ).toEqual({ ok: true, cancellations: { sent: 2, skipped: 0, failed: 0 } });
    expect(mock.notify).toHaveBeenCalledWith("event");
  });
  it("does not expose recipients when RLS allows no event update", async () => {
    await expect(
      handler({ data: { id: "event", status: "cancelled" }, context: context(null) }),
    ).rejects.toThrow("not allowed");
    expect(mock.notify).not.toHaveBeenCalled();
  });
  it("does not send when the caller has no event-management role", async () => {
    mock.authorize.mockRejectedValue(new Error("Forbidden"));
    await expect(
      handler({ data: { id: "event", status: "cancelled" }, context: context({ id: "event" }) }),
    ).rejects.toThrow("Forbidden");
    expect(mock.notify).not.toHaveBeenCalled();
  });
  it("does not send cancellation notices on publish or unpublish", async () => {
    for (const status of ["published", "draft"]) {
      await handler({
        data: { id: "event", status },
        context: context({ id: "event", published_at: "2026-10-01" }),
      });
    }
    expect(mock.notify).not.toHaveBeenCalled();
    expect(mock.invitations).toHaveBeenCalledTimes(1);
  });
  it("preserves successful cancellation if notification dispatch fails", async () => {
    mock.notify.mockRejectedValue(new Error("temporary failure"));
    expect(
      await handler({
        data: { id: "event", status: "cancelled" },
        context: context({ id: "event" }),
      }),
    ).toEqual({ ok: true, cancellations: { sent: 0, skipped: 0, failed: 1 } });
  });
});

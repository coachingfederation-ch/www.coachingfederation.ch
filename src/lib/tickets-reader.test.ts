/**
 * Who may read an invite-only event's tiers and questions.
 *
 * The public ticketing views inherit `events` RLS, so the reader has to be
 * chosen the same way as the event page: anon when the event is public, the
 * caller's own session when it can see the event, and the trusted reader only
 * for a live personal invitation token of that very event.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  validToken: "valid-token-0123456789",
  rateAllowed: true,
}));

const admin = vi.hoisted(() => ({ name: "admin" }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));

/** A client that sees the event row or not. */
function fakeClient(sees: boolean) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: sees ? { id: "e1" } : null }) }),
      }),
    }),
  };
}

const anon = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("./supabase-public.server", () => ({ publicSupabaseClient: () => anon.client }));
vi.mock("./rate-limit.server", () => ({
  clientIp: () => "203.0.113.1",
  checkRateLimit: async () => ({ allowed: state.rateAllowed, retryAfterSeconds: 0 }),
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("http://x") }));
vi.mock("./event-invitations.server", () => ({
  resolveInvitationToken: async (_eventId: string, token: string) =>
    token === state.validToken ? { invitationId: "i1" } : null,
}));

import { resolveTicketingReader } from "./tickets.server";

const EVENT = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  state.rateAllowed = true;
  anon.client = fakeClient(false);
});

describe("resolveTicketingReader", () => {
  it("uses the anonymous reader for a public event", async () => {
    anon.client = fakeClient(true);
    expect(await resolveTicketingReader(EVENT, { inviteToken: state.validToken })).toBe(
      anon.client,
    );
  });

  it("uses the caller's own session when it can see the invite-only event", async () => {
    const mine = fakeClient(true);
    expect(await resolveTicketingReader(EVENT, { userClient: mine })).toBe(mine);
  });

  it("opens an invite-only event to a live invitation token", async () => {
    expect(await resolveTicketingReader(EVENT, { inviteToken: state.validToken })).toBe(admin);
  });

  it("falls back to the token when the caller's session cannot see the event", async () => {
    expect(
      await resolveTicketingReader(EVENT, {
        userClient: fakeClient(false),
        inviteToken: state.validToken,
      }),
    ).toBe(admin);
  });

  it("refuses an unknown token", async () => {
    expect(await resolveTicketingReader(EVENT, { inviteToken: "wrong-token-0123456789" })).toBe(
      null,
    );
  });

  it("refuses a signed-out visitor without a token", async () => {
    expect(await resolveTicketingReader(EVENT)).toBe(null);
  });

  it("refuses a valid token once the caller is rate limited", async () => {
    state.rateAllowed = false;
    expect(await resolveTicketingReader(EVENT, { inviteToken: state.validToken })).toBe(null);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  sent: [] as Array<{ to: string; options: Record<string, unknown> }>,
  suppress: new Set<string>(),
  fail: new Set<string>(),
  eventStatus: "cancelled",
}));

vi.mock("@/integrations/supabase/client.server", () => {
  class Query {
    filters: Array<(row: Record<string, unknown>) => boolean> = [];
    patch: Record<string, unknown> | null = null;
    cap = Infinity;
    table: string;
    constructor(table: string) {
      this.table = table;
    }
    select() {
      return this;
    }
    update(patch: Record<string, unknown>) {
      this.patch = patch;
      return this;
    }
    eq(key: string, value: unknown) {
      this.filters.push((row) => row[key] === value);
      return this;
    }
    in(key: string, values: unknown[]) {
      this.filters.push((row) => values.includes(row[key]));
      return this;
    }
    gt(key: string, value: string) {
      this.filters.push((row) => String(row[key]) > value);
      return this;
    }
    order() {
      return this;
    }
    limit(cap: number) {
      this.cap = cap;
      return this;
    }
    result() {
      if (this.table === "events")
        return { data: { id: "event", status: state.eventStatus, slug: "test" }, error: null };
      const rows = state.rows
        .filter((row) => this.filters.every((filter) => filter(row)))
        .sort((a, b) => String(a["id"]).localeCompare(String(b["id"])))
        .slice(0, this.cap);
      if (this.patch) for (const row of rows) Object.assign(row, this.patch);
      return { data: rows, error: null };
    }
    async maybeSingle() {
      const result = this.result();
      return {
        ...result,
        data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
      };
    }
    then(resolve: (result: unknown) => unknown) {
      return Promise.resolve(this.result()).then(resolve);
    }
  }
  return { supabaseAdmin: { from: (table: string) => new Query(table) } };
});
vi.mock("./event-confirmation.server", () => ({
  CHAPTER_CONTACT: "office@coachingfederation.ch",
  formatAmount: () => "CHF 50.00",
  formatLocation: () => "Zurich",
  formatWhen: () => "Tomorrow",
  loadLocalisedEvent: async () => ({ title: "Test event" }),
  normaliseLocale: (locale: string) => locale || "en",
}));
vi.mock("./email-templates/send-email", () => ({
  sendTemplateEmail: vi.fn(async (_template, to, options) => {
    if (state.fail.has(to)) throw new Error("send failed");
    state.sent.push({ to, options });
    return state.suppress.has(to)
      ? { sent: false, reason: "recipient_suppressed" }
      : { sent: true };
  }),
}));
vi.mock("@/i18n/config", () => ({
  SITE_URL: "https://example.com",
  localizePath: (path: string) => path,
}));
vi.mock("./tickets", () => ({ localisedText: () => "Ticket" }));

import { sendCancellationNotice, sendEventCancellationNotices } from "./event-cancellation.server";

function attendee(id: string, patch: Record<string, unknown> = {}) {
  return {
    id,
    event_id: "event",
    email: `${id}@example.com`,
    full_name: "Anna Muster",
    locale: "en",
    status: "confirmed",
    payment_status: "not_required",
    amount_cents: 0,
    refund_status: "none",
    cancellation_status: "not_sent",
    ...patch,
  };
}

beforeEach(() => {
  state.rows = [];
  state.sent = [];
  state.fail.clear();
  state.suppress.clear();
  state.eventStatus = "cancelled";
});

describe("whole-event cancellation", () => {
  it("notifies registered free and paid attendees, including guests, but not cancelled or unpaid seats or another event", async () => {
    state.rows = [
      attendee("free"),
      attendee("paid", { payment_status: "paid", amount_cents: 5000 }),
      attendee("guest", { user_id: null }),
      attendee("cancelled", { status: "cancelled" }),
      attendee("pending", { payment_status: "pending" }),
      attendee("expired", { payment_status: "expired" }),
      attendee("other", { event_id: "other-event" }),
    ];
    expect(await sendEventCancellationNotices("event")).toEqual({ sent: 3, skipped: 0, failed: 0 });
    expect(state.sent.map((send) => send.to).sort()).toEqual([
      "free@example.com",
      "guest@example.com",
      "paid@example.com",
    ]);
    expect(
      state.sent.every(
        (send) =>
          (send.options["templateData"] as Record<string, unknown>)["eventCancelled"] === true,
      ),
    ).toBe(true);
    expect(state.rows.find((row) => row["id"] === "paid")?.["refund_status"]).toBe("none");
    expect(state.rows.filter((row) => ["free", "paid", "guest"].includes(String(row["id"])))
      .map((row) => row["status"])).toEqual(["confirmed", "confirmed", "confirmed"]);
  });
  it("covers all registrations across multiple pages", async () => {
    state.rows = Array.from({ length: 205 }, (_, i) => attendee(String(i).padStart(4, "0")));
    expect(await sendEventCancellationNotices("event")).toEqual({
      sent: 205,
      skipped: 0,
      failed: 0,
    });
    expect(new Set(state.sent.map((send) => send.to)).size).toBe(205);
  });
  it("retries only failures without duplicating successful notices", async () => {
    state.rows = [attendee("a"), attendee("b"), attendee("c")];
    state.fail.add("b@example.com");
    expect(await sendEventCancellationNotices("event")).toEqual({ sent: 2, skipped: 0, failed: 1 });
    state.fail.clear();
    expect(await sendEventCancellationNotices("event")).toEqual({ sent: 1, skipped: 2, failed: 0 });
    expect(state.sent.map((send) => send.to)).toEqual([
      "a@example.com",
      "c@example.com",
      "b@example.com",
    ]);
  });
  it("does not bypass or retry recipient suppression", async () => {
    state.rows = [attendee("a")];
    state.suppress.add("a@example.com");
    expect(await sendEventCancellationNotices("event")).toEqual({ sent: 0, skipped: 1, failed: 0 });
    await sendEventCancellationNotices("event");
    expect(state.sent).toHaveLength(1);
  });
  it("guards against a request racing with an event reopening", async () => {
    state.rows = [attendee("a")];
    state.eventStatus = "published";
    expect(await sendEventCancellationNotices("event")).toEqual({ sent: 0, skipped: 0, failed: 1 });
    expect(state.sent).toHaveLength(0);
  });
  it("does not double send overlapping cancellation requests", async () => {
    state.rows = [attendee("a")];
    await Promise.all([
      sendEventCancellationNotices("event"),
      sendEventCancellationNotices("event"),
    ]);
    expect(state.sent).toHaveLength(1);
  });
  it("keeps the individual cancellation variant and chapter copy", async () => {
    state.rows = [attendee("a", { status: "cancelled" })];
    expect(await sendCancellationNotice("a", { force: true })).toEqual({ status: "sent" });
    expect(state.sent.map((send) => send.to)).toEqual([
      "a@example.com",
      "office@coachingfederation.ch",
    ]);
    expect(
      (state.sent[0]?.options["templateData"] as Record<string, unknown>)["eventCancelled"],
    ).toBe(false);
  });
});

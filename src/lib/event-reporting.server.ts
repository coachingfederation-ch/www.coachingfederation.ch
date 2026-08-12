/**
 * Event reporting aggregation.
 *
 * Server-only. The caller's right to this event is checked before this runs
 * (see `event-reporting.functions.ts`), so the aggregation reads through the
 * trusted client to see payment and refund columns the browser is deliberately
 * not granted.
 *
 * Everything here is arithmetic on integer cents. Nothing is formatted and
 * nothing is localised: the UI owns presentation, this owns the truth.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  pct,
  type EventReport,
  type ReportFilters,
  type ReportGrouping,
  type ReportPoint,
  type ReportTierRow,
} from "./event-reporting";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  payment_status: string;
  amount_cents: number | null;
  currency: string | null;
  tier_id: string | null;
  refund_status: string | null;
  refund_amount_cents: number | null;
  refunded_at: string | null;
  created_at: string;
  checked_in_at: string | null;
};

type Tier = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  capacity: number | null;
  is_active: boolean;
  sort_order: number;
};

const ROW_COLUMNS =
  "id, full_name, email, status, payment_status, amount_cents, currency, tier_id, refund_status, refund_amount_cents, refunded_at, created_at, checked_in_at";

/** A settled seat: someone we expect at the door and who is not refunded. */
function isActive(r: Row) {
  return (
    r.status === "confirmed" &&
    (r.payment_status === "paid" || r.payment_status === "not_required") &&
    r.refund_status !== "refunded"
  );
}

/**
 * Money we actually took for a live seat. Pending holds and free seats are
 * worth nothing, and a cancelled seat is not revenue — unless it was paid and
 * then refunded, where the gross is kept so the refund nets it out visibly
 * instead of pushing the net negative.
 */
function grossOf(r: Row) {
  if (r.payment_status !== "paid") return 0;
  if (r.status !== "confirmed" && r.refund_status !== "refunded") return 0;
  return r.amount_cents ?? 0;
}

function refundOf(r: Row) {
  return r.refund_status === "refunded" ? (r.refund_amount_cents ?? r.amount_cents ?? 0) : 0;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

/** Monday of the ISO week containing `iso`, as yyyy-mm-dd. */
function weekKey(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shift);
  return d.toISOString().slice(0, 10);
}

export function matchesReportFilters(r: Row, f: ReportFilters) {
  if (f.tier !== "all") {
    if (f.tier === "none" ? r.tier_id !== null : r.tier_id !== f.tier) return false;
  }
  if (f.status !== "all" && r.status !== f.status) return false;
  if (f.payment !== "all") {
    if (f.payment === "refunded") {
      if (r.refund_status !== "refunded") return false;
    } else if (r.payment_status !== f.payment) return false;
  }
  if (f.checkIn === "in" && !r.checked_in_at) return false;
  if (f.checkIn === "out" && r.checked_in_at) return false;
  const day = dayKey(r.created_at);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  return true;
}

async function loadEventData(eventId: string) {
  const [{ data: event }, { data: rows }, { data: tiers }] = await Promise.all([
    supabaseAdmin
      .from("events")
      .select("id, title, slug, starts_at, capacity, registration_mode")
      .eq("id", eventId)
      .maybeSingle(),
    supabaseAdmin
      .from("event_registrations")
      .select(ROW_COLUMNS)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("event_ticket_tiers")
      .select("id, name, price_cents, currency, capacity, is_active, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ]);
  return {
    event: event as {
      id: string;
      title: string;
      slug: string;
      starts_at: string | null;
      capacity: number | null;
      registration_mode: string;
    } | null,
    rows: (rows ?? []) as Row[],
    tiers: (tiers ?? []) as Tier[],
  };
}

function buildTierRows(rows: Row[], tiers: Tier[]): ReportTierRow[] {
  // Tiers deleted since the sale still have registrations pointing at them;
  // those keep a synthetic row so historical revenue never disappears.
  const known = new Map(tiers.map((t) => [t.id, t]));
  const ids = [...tiers.map((t) => t.id)];
  for (const r of rows) {
    if (r.tier_id && !known.has(r.tier_id) && !ids.includes(r.tier_id)) ids.push(r.tier_id);
  }

  const out: ReportTierRow[] = [];
  for (const id of ids) {
    const tier = known.get(id) ?? null;
    const mine = rows.filter((r) => r.tier_id === id);
    // A tier that no longer exists and never sold anything is not worth a row.
    if (!tier && mine.length === 0) continue;
    const confirmed = mine.filter(isActive).length;
    const capacity = tier?.capacity ?? null;
    const grossCents = mine.reduce((s, r) => s + grossOf(r), 0);
    const refundCents = mine.reduce((s, r) => s + refundOf(r), 0);
    out.push({
      id,
      // A removed tier keeps its sales; the UI labels the empty name.
      name: tier?.name ?? "",
      isActive: tier?.is_active ?? false,
      priceCents: tier?.price_cents ?? mine[0]?.amount_cents ?? null,
      currency: tier?.currency ?? mine[0]?.currency ?? "CHF",
      capacity,
      confirmed,
      remaining: capacity === null ? null : Math.max(capacity - confirmed, 0),
      sellThrough: pct(confirmed, capacity),
      grossCents,
      refundCents,
      netCents: grossCents - refundCents,
      checkedIn: mine.filter((r) => r.checked_in_at).length,
    });
  }
  return out;
}

function buildSeries(rows: Row[], grouping: ReportGrouping): ReportPoint[] {
  const key = grouping === "week" ? weekKey : dayKey;
  const buckets = new Map<string, ReportPoint>();
  const at = (date: string) => {
    let b = buckets.get(date);
    if (!b) {
      b = { date, confirmed: 0, paid: 0, free: 0, grossCents: 0, refundCents: 0, checkedIn: 0 };
      buckets.set(date, b);
    }
    return b;
  };

  for (const r of rows) {
    const b = at(key(r.created_at));
    if (isActive(r)) {
      b.confirmed += 1;
      if (r.payment_status === "paid") b.paid += 1;
      else b.free += 1;
    }
    b.grossCents += grossOf(r);
    // Refunds and check-ins land on the day they happened, not the day of sale.
    if (refundOf(r) > 0 && r.refunded_at) at(key(r.refunded_at)).refundCents += refundOf(r);
    if (r.checked_in_at) at(key(r.checked_in_at)).checkedIn += 1;
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function buildEventReport(
  eventId: string,
  filters: ReportFilters,
  grouping: ReportGrouping,
): Promise<EventReport | null> {
  const { event, rows, tiers } = await loadEventData(eventId);
  if (!event) return null;

  const matched = rows.filter((r) => matchesReportFilters(r, filters));

  const active = matched.filter(isActive);
  const checkedIn = matched.filter((r) => r.checked_in_at).length;
  const hasCheckIns = rows.some((r) => r.checked_in_at);
  const grossCents = matched.reduce((s, r) => s + grossOf(r), 0);
  const refundCents = matched.reduce((s, r) => s + refundOf(r), 0);
  const capacity = event.capacity ?? null;

  return {
    event: {
      id: event.id,
      title: event.title,
      startsAt: event.starts_at,
      capacity,
      registrationMode: event.registration_mode,
    },
    kpis: {
      confirmed: matched.filter((r) => r.status === "confirmed").length,
      pending: matched.filter((r) => r.payment_status === "pending" && r.status === "confirmed")
        .length,
      cancelled: matched.filter((r) => r.status === "cancelled").length,
      refunded: matched.filter((r) => r.refund_status === "refunded").length,
      active: active.length,
      checkedIn,
      noShows: hasCheckIns ? Math.max(active.length - checkedIn, 0) : null,
      attendanceRate: hasCheckIns ? pct(checkedIn, active.length) : null,
      capacity,
      remaining: capacity === null ? null : Math.max(capacity - active.length, 0),
      sellThrough: pct(active.length, capacity),
      grossCents,
      refundCents,
      netCents: grossCents - refundCents,
      freeCount: active.filter((r) => grossOf(r) === 0).length,
      currency: tiers[0]?.currency ?? matched.find((r) => r.currency)?.currency ?? "CHF",
    },
    tiers: buildTierRows(matched, tiers),
    series: buildSeries(matched, grouping),
    hasCheckIns,
    matched: matched.length,
  };
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Attendee-supplied text is untrusted: neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const EXPORT_COLUMNS = [
  "registration_id",
  "created_at",
  "attendee_name",
  "attendee_email",
  "tier",
  "tier_price",
  "currency",
  "status",
  "payment_status",
  "amount_paid",
  "refund_amount",
  "net_amount",
  "check_in_status",
  "checked_in_at",
] as const;

/**
 * The same filtered set the screen shows, as a file. Sharing
 * `matchesReportFilters` with the report is what keeps the two in agreement.
 */
export async function buildEventReportCsv(
  eventId: string,
  filters: ReportFilters,
): Promise<{ filename: string; csv: string; rows: number } | null> {
  const { event, rows, tiers } = await loadEventData(eventId);
  if (!event) return null;

  const tierById = new Map(tiers.map((t) => [t.id, t]));
  const matched = rows.filter((r) => matchesReportFilters(r, filters));

  const preamble = [
    ["event_title", event.title].map(cell).join(","),
    ["event_id", event.id].map(cell).join(","),
    ["exported_at", new Date().toISOString()].map(cell).join(","),
    "",
  ];

  const lines = matched.map((r) => {
    const tier = r.tier_id ? tierById.get(r.tier_id) : null;
    const gross = grossOf(r);
    const refund = refundOf(r);
    return [
      r.id,
      r.created_at,
      r.full_name ?? "",
      r.email ?? "",
      tier?.name ?? "",
      tier ? (tier.price_cents / 100).toFixed(2) : "",
      r.currency ?? tier?.currency ?? "",
      r.status,
      r.refund_status === "refunded" ? "refunded" : r.payment_status,
      (gross / 100).toFixed(2),
      (refund / 100).toFixed(2),
      ((gross - refund) / 100).toFixed(2),
      r.checked_in_at ? "checked_in" : "not_checked_in",
      r.checked_in_at ?? "",
    ]
      .map(cell)
      .join(",");
  });

  return {
    filename: `report-${event.slug ?? event.id}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [...preamble, EXPORT_COLUMNS.map(cell).join(","), ...lines].join("\n"),
    rows: lines.length,
  };
}

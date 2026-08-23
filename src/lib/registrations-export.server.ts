/**
 * Per-event attendee CSV.
 *
 * Server-only. The caller's right to this event is checked before this runs
 * (see `exportEventRegistrations`), so the export itself reads through the
 * trusted client to include columns the browser is deliberately not granted.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { activeRegistrationFormId, loadFormQuestions } from "./event-forms.server";
import { displayAnswer } from "./event-forms";

const BASE_COLUMNS = [
  "full_name",
  "email",
  "status",
  "payment_status",
  "amount",
  "currency",
  "tier",
  "discount_code",
  "locale",
  "registered_at",
  "checked_in_at",
  "confirmation_status",
  "refund_status",
  "created_by_staff",
  "notes",
] as const;

/** The registration columns this export selects, as returned by the query. */
interface ExportRow {
  full_name: string | null;
  email: string | null;
  status: string | null;
  payment_status: string | null;
  amount_cents: number | null;
  currency: string | null;
  tier_id: string | null;
  discount_code_text: string | null;
  locale: string | null;
  created_at: string;
  checked_in_at: string | null;
  confirmation_status: string | null;
  refund_status: string | null;
  created_by_staff: boolean | null;
  notes: string | null;
  answers: Record<string, string> | null;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Attendee-supplied text is untrusted: neutralise spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildRegistrationsCsv(
  eventId: string,
): Promise<{ filename: string; csv: string; rows: number }> {
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .maybeSingle();

  const formId = await activeRegistrationFormId(eventId);
  const [{ data: rows }, { data: tiers }, questions] = await Promise.all([
    supabaseAdmin
      .from("event_registrations")
      .select(
        "full_name, email, status, payment_status, amount_cents, currency, tier_id, discount_code_text, locale, created_at, checked_in_at, confirmation_status, refund_status, created_by_staff, notes, answers",
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("event_ticket_tiers").select("id, name").eq("event_id", eventId),
    formId ? loadFormQuestions(formId) : Promise.resolve([]),
  ]);

  const tierNames = new Map(
    ((tiers ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]),
  );
  const asked = questions.filter((q) => q.type !== "heading");
  const header = [...BASE_COLUMNS, ...asked.map((q) => q.label)];

  const lines = ((rows ?? []) as ExportRow[]).map((r) => {
    const answers = (r.answers ?? {}) as Record<string, string>;
    const values = [
      r.full_name,
      r.email,
      r.status,
      r.payment_status,
      r.amount_cents ? (r.amount_cents / 100).toFixed(2) : "0.00",
      r.currency,
      r.tier_id ? (tierNames.get(r.tier_id) ?? "") : "",
      r.discount_code_text ?? "",
      r.locale ?? "",
      r.created_at,
      r.checked_in_at ?? "",
      r.confirmation_status ?? "",
      r.refund_status ?? "",
      r.created_by_staff ? "yes" : "",
      r.notes ?? "",
      ...asked.map((q) => displayAnswer(q, answers[q.key] ?? "")),
    ];
    return values.map(cell).join(",");
  });

  return {
    filename: `attendees-${event?.slug ?? eventId}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header.map(cell).join(","), ...lines].join("\n"),
    rows: lines.length,
  };
}

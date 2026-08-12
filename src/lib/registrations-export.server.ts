/**
 * Per-event attendee CSV.
 *
 * Server-only. The caller's right to this event is checked before this runs
 * (see `exportEventRegistrations`), so the export itself reads through the
 * trusted client to include columns the browser is deliberately not granted.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

  const [{ data: rows }, { data: tiers }, { data: fields }] = await Promise.all([
    supabaseAdmin
      .from("event_registrations")
      .select(
        "full_name, email, status, payment_status, amount_cents, currency, tier_id, discount_code_text, locale, created_at, checked_in_at, confirmation_status, refund_status, created_by_staff, notes, answers",
      )
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("event_ticket_tiers").select("id, name").eq("event_id", eventId),
    supabaseAdmin
      .from("event_registration_fields")
      .select("field_key, label, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ]);

  const tierNames = new Map(((tiers ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
  const questions = (fields ?? []) as { field_key: string; label: string }[];
  const header = [...BASE_COLUMNS, ...questions.map((f) => f.label)];

  const lines = ((rows ?? []) as Record<string, any>[]).map((r) => {
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
      ...questions.map((f) => answers[f.field_key] ?? ""),
    ];
    return values.map(cell).join(",");
  });

  return {
    filename: `attendees-${event?.slug ?? eventId}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv: [header.map(cell).join(","), ...lines].join("\n"),
    rows: lines.length,
  };
}
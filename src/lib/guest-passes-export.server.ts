/**
 * Guest pass pilot CSV.
 *
 * Server-only. Authorisation happens in the calling server function
 * (`exportGuestPasses`, Membership & Engagement only), so this reads through
 * the trusted client and includes the guest contact details the browser is
 * deliberately not granted.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Untrusted text must never execute as a spreadsheet formula. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function buildGuestPassesCsv(
  headers: string[],
): Promise<{ filename: string; csv: string; rows: number }> {
  const { data, error } = await supabaseAdmin
    .from("guest_passes")
    .select(
      `id, guest_full_name, guest_email, guest_phone, guest_location, guest_preferred_language,
       inviting_member_name, inviting_member_email, inviting_member_cst_recno,
       status, decision_at, decision_note, registration_id, follow_up_status, follow_up_note,
       converted_member_id, created_at,
       events ( title, starts_at ),
       event_registrations ( checked_in_at )`,
    )
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const lines = [headers.map(cell).join(",")];

  for (const r of rows) {
    const event = (Array.isArray(r["events"]) ? r["events"][0] : r["events"]) as
      | { title?: string; starts_at?: string }
      | null
      | undefined;
    const registration = (
      Array.isArray(r["event_registrations"]) ? r["event_registrations"][0] : r["event_registrations"]
    ) as { checked_in_at?: string | null } | null | undefined;

    lines.push(
      [
        event?.title ?? "",
        event?.starts_at ?? "",
        r["inviting_member_name"],
        r["inviting_member_email"],
        r["inviting_member_cst_recno"],
        r["guest_full_name"],
        r["guest_email"],
        r["guest_phone"],
        r["guest_location"],
        r["guest_preferred_language"],
        r["status"],
        r["decision_at"],
        r["decision_note"],
        registration?.checked_in_at ? "yes" : "no",
        r["follow_up_status"],
        r["follow_up_note"],
        r["converted_member_id"] ? "yes" : "no",
        r["created_at"],
      ]
        .map(cell)
        .join(","),
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `guest-passes-${stamp}.csv`,
    csv: lines.join("\r\n"),
    rows: rows.length,
  };
}

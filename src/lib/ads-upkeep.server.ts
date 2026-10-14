/**
 * Nightly upkeep for advertising placements.
 *
 * Two jobs in one pass, both idempotent so a repeated cron run is harmless:
 * retire placements whose window has closed (and mark their request expired),
 * and send the one 30-day reminder before a placement ends. The reminder is
 * stamped on the request, so re-running the job never mails twice.
 */
import { expireFinishedPlacements } from "./ads-admin.functions";

export type AdUpkeepResult = { expired: number; reminded: number };

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export async function runAdPlacementUpkeep(): Promise<AdUpkeepResult> {
  const { supabaseAdmin: adminClient } = await import("@/integrations/supabase/client.server");
  // The ad_* tables arrive with the staged migration, so they are absent from
  // the generated types until it is applied; this alias keeps the module typed
  // loosely for those tables only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = adminClient as any;

  const { expired } = await expireFinishedPlacements(admin);

  // Requests still active whose window closes within the next 30 days.
  const { data: due } = await admin
    .from("ad_requests")
    .select("id, advertiser_name, contact_email, offer_type, package, active_until")
    .eq("status", "active")
    .is("expiry_notified_at", null)
    .lte("active_until", isoDay(30))
    .gte("active_until", isoDay(0));

  const rows = (due ?? []) as {
    id: string;
    advertiser_name: string | null;
    contact_email: string | null;
    offer_type: string;
    package: string | null;
    active_until: string | null;
  }[];

  let reminded = 0;
  for (const row of rows) {
    if (row.contact_email) {
      try {
        const { sendTemplateEmail } = await import("./email-templates/send-email");
        const { SITE_URL } = await import("@/i18n/config");
        const payload = {
          advertiserName: row.advertiser_name ?? "",
          endDate: row.active_until ?? "",
          placementsLabel: row.package ? `${row.offer_type} — ${row.package}` : row.offer_type,
          detailUrl: `${SITE_URL}/member/advertise`,
        };
        await sendTemplateEmail("ad-placement-expiring", row.contact_email, {
          templateData: payload,
        });
        await sendTemplateEmail("ad-placement-expiring", "office@coachingfederation.ch", {
          templateData: payload,
        });
        reminded += 1;
      } catch {
        // A failed reminder must not stop the rest of the run; the stamp below
        // is only written when the send succeeded.
        continue;
      }
    }
    await admin
      .from("ad_requests")
      .update({ expiry_notified_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  return { expired, reminded };
}

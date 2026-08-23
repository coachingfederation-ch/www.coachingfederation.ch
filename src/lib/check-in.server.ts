/**
 * Door operations: ticket codes, ticket lookup and the QR payload.
 *
 * Server-only. The check-in decision itself lives in the database
 * (`public.check_in_registration`), so a repeated scan can never produce two
 * attendances and an ineligible seat can never be opened — this module only
 * mints and resolves the code that identifies a registration at the door.
 */
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/i18n/config";
import {
  formatLocation,
  formatWhen,
  loadLocalisedEvent,
  normaliseLocale,
  type EventRow,
} from "./event-confirmation.server";
import { localisedText } from "./tickets";

const EVENT_COLUMNS =
  "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id";

/** URL-safe, unguessable, and short enough to survive a printed QR code. */
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function ticketUrl(token: string) {
  return `${SITE_URL}/ticket/${token}`;
}

export function ticketQrUrl(token: string) {
  return `${SITE_URL}/api/public/ticket-qr/${token}.png`;
}

/**
 * The registration's ticket code, minted on first use. Written with the
 * trusted client because the row guard treats the code as server-owned.
 */
export async function ensureCheckInToken(registrationId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .select("id, check_in_token, status")
    .eq("id", registrationId)
    .maybeSingle();
  if (!data || data.status === "cancelled") return null;
  if (data.check_in_token) return data.check_in_token;

  const token = newToken();
  const { data: updated } = await supabaseAdmin
    .from("event_registrations")
    .update({ check_in_token: token })
    .eq("id", registrationId)
    .is("check_in_token", null)
    .select("check_in_token");
  if (updated && updated.length > 0) return token;

  // Someone else minted one first; return theirs rather than a second code.
  const { data: again } = await supabaseAdmin
    .from("event_registrations")
    .select("check_in_token")
    .eq("id", registrationId)
    .maybeSingle();
  return again?.check_in_token ?? null;
}

export type TicketView = {
  registrationId: string;
  attendeeName: string;
  eventTitle: string;
  eventUrl: string;
  when: string;
  location: string;
  onlineUrl: string | null;
  tierName: string | null;
  status: string;
  paymentStatus: string;
  checkedIn: boolean;
  locale: string;
  qrUrl: string;
  practicalNotes: string | null;
};

/**
 * The attendee-facing ticket for one code. Public by design (the code is the
 * credential), so it carries only what the holder already knows: their own
 * name and the event's public details.
 */
export async function loadTicket(token: string): Promise<TicketView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select("id, event_id, full_name, locale, status, payment_status, tier_id, checked_in_at")
    .eq("check_in_token", token)
    .maybeSingle();
  if (!registration) return null;

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(
      `${EVENT_COLUMNS}, practical_notes, practical_notes_de, practical_notes_fr, practical_notes_it`,
    )
    .eq("id", registration.event_id)
    .maybeSingle();
  if (!eventRow) return null;

  const locale = normaliseLocale(registration.locale);
  const event = eventRow as unknown as EventRow;
  const content = await loadLocalisedEvent(event, locale);

  let tierName: string | null = null;
  if (registration.tier_id) {
    const { data: tier } = await supabaseAdmin
      .from("event_ticket_tiers")
      .select("name, name_de, name_fr, name_it")
      .eq("id", registration.tier_id)
      .maybeSingle();
    if (tier)
      tierName = localisedText(tier as unknown as Record<string, string | null>, "name", locale);
  }

  return {
    registrationId: registration.id,
    attendeeName: registration.full_name,
    eventTitle: content.title,
    eventUrl: `${SITE_URL}/events/${event.slug}`,
    when: formatWhen(event, locale),
    location: formatLocation(event, locale),
    onlineUrl: event.location_mode === "in_person" ? null : event.online_url,
    tierName,
    status: registration.status,
    paymentStatus: registration.payment_status,
    checkedIn: registration.checked_in_at !== null,
    locale,
    qrUrl: ticketQrUrl(token),
    practicalNotes: localisedText(
      eventRow as unknown as Record<string, string | null>,
      "practical_notes",
      locale,
    ),
  };
}

/** PNG QR code for the ticket URL, or null when the code is unknown. */
export async function ticketQrPng(token: string): Promise<Uint8Array | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .select("id, status")
    .eq("check_in_token", token)
    .maybeSingle();
  if (!data || data.status === "cancelled") return null;
  const buffer = await QRCode.toBuffer(ticketUrl(token), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#212251ff", light: "#ffffffff" },
  });
  return new Uint8Array(buffer);
}

/** Resolves a scanned value (full ticket URL or bare code) to a registration. */
export async function registrationForToken(
  token: string,
): Promise<{ id: string; event_id: string } | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .select("id, event_id")
    .eq("check_in_token", token)
    .maybeSingle();
  return data ?? null;
}

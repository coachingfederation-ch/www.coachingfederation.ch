/**
 * Client-safe waitlist vocabulary.
 *
 * A waitlist entry is not a registration: it holds no seat, costs nothing and
 * grants nothing until an organizer invites the person. Everything that
 * decides eligibility, ordering and invitation validity lives on the server.
 */
export type WaitlistStatus = "waiting" | "invited" | "converted" | "expired" | "withdrawn";

export type WaitlistEntry = {
  id: string;
  event_id: string;
  tier_id: string | null;
  full_name: string;
  email: string;
  locale: string;
  status: WaitlistStatus;
  note: string | null;
  invited_at: string | null;
  invite_expires_at: string | null;
  created_at: string;
};

/** Default window an invited person has to take the seat. */
export const WAITLIST_INVITE_HOURS = 72;

export function inviteIsLive(entry: Pick<WaitlistEntry, "status" | "invite_expires_at">) {
  return (
    entry.status === "invited" &&
    Boolean(entry.invite_expires_at) &&
    new Date(entry.invite_expires_at!).getTime() > Date.now()
  );
}

/**
 * Claim readiness for the staff members list.
 *
 * Derived, never stored: a member is `claimed` once the explicit `auth_user_id`
 * binding exists (never by email equality) or a link was consumed, `invited`
 * while the newest unconsumed link is still inside its TTL, `expired` when the
 * newest link lapsed unused, and `never` when no link was ever issued.
 *
 * Pure so it can be tested without the database; the caller is responsible for
 * passing *every* link row (see `loadClaimStatuses`, which pages past the Data
 * API's 1,000-row cap — truncating here once hid fresh invitations).
 */
export type MemberClaimStatus = "claimed" | "invited" | "expired" | "never";

export type ClaimLinkRow = {
  member_id: string;
  requested_at: string | null;
  consumed_at: string | null;
  expires_at: string | null;
};

export function deriveClaimStatuses(
  boundMemberIds: Iterable<string>,
  links: Iterable<ClaimLinkRow>,
  now: number = Date.now(),
): Record<string, MemberClaimStatus> {
  const status: Record<string, MemberClaimStatus> = {};
  for (const id of boundMemberIds) status[id] = "claimed";

  // Keep only the newest link per member, independent of input order, so a
  // freshly issued link supersedes a lapsed one.
  const newest = new Map<string, ClaimLinkRow>();
  const consumed = new Set<string>();
  for (const link of links) {
    if (link.consumed_at) consumed.add(link.member_id);
    const current = newest.get(link.member_id);
    if (!current || (link.requested_at ?? "") >= (current.requested_at ?? "")) {
      newest.set(link.member_id, link);
    }
  }

  for (const [memberId, link] of newest) {
    if (status[memberId] === "claimed") continue;
    if (link.consumed_at || consumed.has(memberId)) {
      status[memberId] = "claimed";
      continue;
    }
    const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : true;
    status[memberId] = expired ? "expired" : "invited";
  }
  return status;
}

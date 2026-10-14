/**
 * Who the advertiser is, decided server-side.
 *
 * The e-announcement price depends on the advertiser: CHF 150 for a chapter
 * member holding a valid ACC/PCC/MCC, CHF 300 for an ICF Global member with a
 * credential. The member never picks that tier — it is read from the member
 * record the ICF sync maintains. When it cannot be determined we fall back to
 * the HIGHER price and leave the adjustment to staff at review: erring toward
 * the cheaper tier would let an unverified account price its own placement.
 *
 * Schools pricing is not credential-derived; it needs an explicit attestation
 * that the advertiser represents a Level 1/2/3 or CCEU program, which staff
 * confirm before approving.
 */
import type { AdEligibility, AdSchoolAttestation } from "./ads";

const DIRECTORY_CREDENTIALS = ["ACC", "PCC", "MCC"];

type Client = {
  from: (table: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (columns: string) => any;
  };
};

/**
 * Resolves the caller's own member row into an eligibility tier. Reads through
 * the caller's RLS-scoped client: a member can only see their own row, so the
 * answer cannot be forged by pointing at somebody else's record.
 */
export async function resolveEligibility(
  client: Client,
  userId: string,
): Promise<AdEligibility & { memberId: string | null }> {
  const { data } = await client
    .from("members")
    .select("id, activity_state, credential_slug, credential_expires_on")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const row = (data ?? null) as {
    id: string;
    activity_state: string | null;
    credential_slug: string | null;
    credential_expires_on: string | null;
  } | null;

  if (!row) {
    return {
      tier: "icf_global",
      source: "derived",
      detail: { resolved: "no_member_record" },
      memberId: null,
    };
  }

  const credential = (row.credential_slug ?? "").toUpperCase();
  const credentialValid =
    DIRECTORY_CREDENTIALS.includes(credential) &&
    (!row.credential_expires_on || row.credential_expires_on >= new Date().toISOString().slice(0, 10));
  const chapterActive = row.activity_state === "active";

  return {
    tier: chapterActive && credentialValid ? "icfs_member" : "icf_global",
    source: "derived",
    detail: {
      membershipState: row.activity_state,
      credential: row.credential_slug,
      credentialExpiresOn: row.credential_expires_on,
      resolved: chapterActive && credentialValid ? "chapter_member_credentialed" : "fallback_global",
    },
    memberId: row.id,
  };
}

/** A schools request may only be submitted with a complete attestation. */
export function assertSchoolAttestation(
  attestation: AdSchoolAttestation | null,
): asserts attestation is AdSchoolAttestation {
  if (
    !attestation ||
    !attestation.organisation?.trim() ||
    !attestation.programType?.trim() ||
    !attestation.accreditationReference?.trim()
  ) {
    throw new Error(
      "Schools pricing applies to Level 1/2/3 and CCEU programs only — please complete the attestation.",
    );
  }
}

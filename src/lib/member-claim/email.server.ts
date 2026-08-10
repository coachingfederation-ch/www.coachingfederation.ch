/**
 * Member claim — email dispatch.
 *
 * Mints the claim token for one invitation and hands it to the member email
 * pipeline. Every send (first or resend) supersedes the previous pending
 * link via `mintClaimToken`, so an older message in an inbox stops working.
 */
import { hashToken, mintClaimToken, claimUrl } from "./tokens.server";

const TOKEN_TTL_DAYS = 7;
/** Chapter languages the invitation email is written in. */
const CLAIM_LOCALES = ["en", "de", "fr", "it"] as const;
export type ClaimEmailLocale = (typeof CLAIM_LOCALES)[number];

function normalizeLocale(value: string | null | undefined): ClaimEmailLocale {
  const candidate = (value ?? "").slice(0, 2).toLowerCase();
  return (CLAIM_LOCALES as readonly string[]).includes(candidate)
    ? (candidate as ClaimEmailLocale)
    : "en";
}

/**
 * Sends one claim invitation. The link is minted here and never re-used: every
 * send (first or resend) supersedes the previous pending link, so an older
 * message in an inbox stops working the moment a new one goes out.
 */
export async function deliverClaimInvitation(args: {
  memberId: string;
  email: string;
  firstName?: string | null;
  locale?: string | null;
  baseUrl: string;
  isResend: boolean;
}) {
  const token = await mintClaimToken(args.memberId, args.email);
  const url = claimUrl(args.baseUrl, token);

  const { sendMemberEmail } = await import("../member-email.server");
  return await sendMemberEmail({
    memberId: args.memberId,
    to: args.email,
    templateKey: "member_claim",
    subject: "Activate your Member Area account",
    body: url,
    template: {
      name: "member-claim-invitation",
      data: {
        claimUrl: url,
        baseUrl: args.baseUrl,
        firstName: args.firstName ?? undefined,
        expiresInDays: TOKEN_TTL_DAYS,
        isResend: args.isResend,
        locale: normalizeLocale(args.locale),
      },
      // Token-scoped: a retry of the same send is deduped, a genuine resend
      // mints a new token and therefore a new key.
      idempotencyKey: `member-claim-${hashToken(token).slice(0, 32)}`,
    },
  });
}

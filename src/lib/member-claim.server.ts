/**
 * Member account claim — invitation only.
 *
 * There is no self-service request form: a claim always begins with a link
 * issued by staff or by the claim campaign. Claiming cannot run while
 * `account_claim_enabled` is false, and the database refuses to set that flag
 * unless the integration is in LIVE mode with a recorded cutover. A TEST-shaped
 * (`zz`-wrapped) address can never become a claimable identity.
 *
 * Binding rule (deliberate, do not relax): the durable boundary is the explicit
 * `members.auth_user_id` link plus the granted `member` role, so an email that
 * also belongs to a staff account can never silently inherit someone else's
 * member profile.
 *
 * The token itself never touches the database: only its SHA-256 hash is
 * stored, so a database read cannot be replayed as a claim link.
 *
 * Implementation is split across `member-claim/{tokens,email,state}.server.ts`
 * (token issuing, email dispatch, claim state machine); this module keeps the
 * original export surface for existing callers.
 */
export { maskEmail, mintClaimToken, claimUrl } from "./member-claim/tokens.server";
export type { ClaimEmailLocale } from "./member-claim/email.server";
export {
  verifyClaimToken,
  completeClaim,
  issueClaimLinkForMember,
  loadClaimInvitationStatus,
  sendClaimInvitation,
} from "./member-claim/state.server";
export type {
  ClaimResult,
  ClaimTokenState,
  CompleteClaimResult,
  ClaimInvitationStatus,
} from "./member-claim/state.server";

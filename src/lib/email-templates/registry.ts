/**
 * Central registry mapping template names to their React Email components.
 * Exports: TEMPLATES. Called by lib/email-templates/send-email.ts.
 */
import type { ComponentType } from "react";

/** Props handed to a template at render time — one flat, template-specific bag. */
export type EmailTemplateData = Record<string, unknown>;

/**
 * Each template declares its own prop shape, so the registry stores them
 * type-erased (`never` props accept every concrete component) and the render
 * sites widen back to `EmailTemplateData` when passing the data bag.
 */
export type EmailTemplateComponent = ComponentType<never>;

export interface TemplateEntry {
  component: EmailTemplateComponent;
  subject: string | ((data: EmailTemplateData) => string);
  displayName?: string;
  previewData?: EmailTemplateData;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

import { template as memberClaimInvitation } from "./member-claim-invitation";
import { template as eventRegistrationConfirmation } from "./event-registration-confirmation";
import { template as eventCancellation } from "./event-cancellation";
import { template as eventWaitlistInvitation } from "./event-waitlist-invitation";
import { template as eventInvitation } from "./event-invitation";
import { template as eventReminder } from "./event-reminder";
import { template as eventFollowUpInvitation } from "./event-follow-up-invitation";
import { template as eventRecapThanks } from "./event-recap-thanks";
import { template as internalInvitation } from "./internal-invitation";
import { template as newsletterRefresh } from "./newsletter-refresh";
import { template as newsletterEdition } from "./newsletter-edition";
import { template as guestPassRequest } from "./guest-pass-request";
import { template as guestPassApproved } from "./guest-pass-approved";
import { template as guestPassDeclined } from "./guest-pass-declined";

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  "member-claim-invitation": memberClaimInvitation,
  "event-registration-confirmation": eventRegistrationConfirmation,
  "event-cancellation": eventCancellation,
  "event-waitlist-invitation": eventWaitlistInvitation,
  "event-invitation": eventInvitation,
  "event-reminder": eventReminder,
  "event-follow-up-invitation": eventFollowUpInvitation,
  "event-recap-thanks": eventRecapThanks,
  "internal-invitation": internalInvitation,
  "newsletter-refresh": newsletterRefresh,
  "newsletter-edition": newsletterEdition,
  "guest-pass-request": guestPassRequest,
  "guest-pass-approved": guestPassApproved,
  "guest-pass-declined": guestPassDeclined,
};

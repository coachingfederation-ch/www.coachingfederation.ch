/**
 * Central registry mapping template names to their React Email components.
 * Exports: TEMPLATES. Called by lib/email-templates/send-email.ts.
 */
import type { ComponentType } from "react";

export interface TemplateEntry {
  component: ComponentType<any>;
  subject: string | ((data: Record<string, any>) => string);
  displayName?: string;
  previewData?: Record<string, any>;
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string;
}

import { template as memberClaimInvitation } from "./member-claim-invitation";
import { template as eventRegistrationConfirmation } from "./event-registration-confirmation";
import { template as eventCancellation } from "./event-cancellation";
import { template as eventWaitlistInvitation } from "./event-waitlist-invitation";

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
};

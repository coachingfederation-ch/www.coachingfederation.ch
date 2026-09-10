/**
 * The four member engagement campaign emails (welcome, credential upgrade,
 * specialisation, grace re-engagement). Exports: welcomeTemplate,
 * credentialUpgradeTemplate, specialisationTemplate, graceReengagementTemplate,
 * CAMPAIGN_TEMPLATE_NAMES. Registered in lib/email-templates/registry.ts.
 *
 * All four reuse the shared member shell, exactly like the grace-period
 * warnings do, so every chapter email carries the same branding. The wording
 * comes from lib/email-templates/member-campaign-copy.ts.
 */
import { SITE_URL } from "@/i18n/config";
import type { EngagementCampaignKey } from "@/lib/member-engagement";
import { Email } from "./member-engagement";
import { campaignCopy, type CampaignCopyVars } from "./member-campaign-copy";
import type { EmailTemplateData, TemplateEntry } from "./registry";

/** Registry name used for each campaign, so Cloud → Emails lists them all. */
export const CAMPAIGN_TEMPLATE_NAMES: Record<EngagementCampaignKey, string> = {
  welcome_new_member: "member-welcome",
  credential_upgrade: "member-credential-change",
  credential_specialisation: "member-specialisation",
  grace_reengagement: "member-grace-reengagement",
  // The two warnings send through the templates already registered for them.
  grace_first_warning: "member-grace-notice",
  grace_final_warning: "member-grace-final-notice",
};

const preview = (key: EngagementCampaignKey, vars: CampaignCopyVars) => {
  const copy = campaignCopy(key, "en", vars);
  return { subject: copy.subject, body: copy.body, baseUrl: SITE_URL };
};

const entry = (
  key: EngagementCampaignKey,
  displayName: string,
  fallbackSubject: string,
  vars: CampaignCopyVars,
): TemplateEntry => ({
  component: Email,
  subject: (data: EmailTemplateData) => (data["subject"] as string) || fallbackSubject,
  displayName,
  previewData: preview(key, vars),
});

export const welcomeTemplate = entry(
  "welcome_new_member",
  "Member — welcome",
  "Welcome to The Switzerland Chapter of ICF",
  { first_name: "Anna", events_link: `${SITE_URL}/events` },
);

export const credentialUpgradeTemplate = entry(
  "credential_upgrade",
  "Member — credential upgrade",
  "Congratulations on your new credential",
  { first_name: "Anna", credential_from: "ACC", credential_to: "PCC" },
);

export const specialisationTemplate = entry(
  "credential_specialisation",
  "Member — credential specialisation",
  "Congratulations on your new specialisation",
  { first_name: "Anna", specialisation: "ACTC" },
);

export const graceReengagementTemplate = entry(
  "grace_reengagement",
  "Member — grace period re-engagement",
  "We would like to stay in touch",
  {
    first_name: "Anna",
    grace_end_date: "1 December 2026",
    leader_link: "mailto:office@coachingfederation.ch",
  },
);

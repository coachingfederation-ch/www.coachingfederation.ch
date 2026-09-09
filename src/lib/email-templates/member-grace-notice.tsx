/**
 * The two grace-period warning emails sent before a lapsed member's record is
 * removed. Exports: noticeTemplate, finalNoticeTemplate. Registered in
 * lib/email-templates/registry.ts.
 *
 * Both reuse the member engagement shell so a lapsing member sees the same
 * branding as every other chapter email; only the copy differs, and the copy
 * is composed per language by lib/email-templates/member-grace-copy.ts.
 */
import { SITE_URL } from "@/i18n/config";
import { Email } from "./member-engagement";
import { graceNoticeCopy } from "./member-grace-copy";
import type { EmailTemplateData, TemplateEntry } from "./registry";

const preview = (stage: "notice" | "final") => {
  const inThirtyDays = new Date(Date.now() + 30 * 86400000).toISOString();
  const copy = graceNoticeCopy(stage, "en", "Anna", inThirtyDays);
  return { subject: copy.subject, body: copy.body, baseUrl: SITE_URL };
};

export const noticeTemplate = {
  component: Email,
  subject: (data: EmailTemplateData) =>
    (data["subject"] as string) || "Your chapter record is in its closing period",
  displayName: "Member grace period — first warning",
  previewData: preview("notice"),
} satisfies TemplateEntry;

export const finalNoticeTemplate = {
  component: Email,
  subject: (data: EmailTemplateData) =>
    (data["subject"] as string) || "Last reminder: your chapter record closes soon",
  displayName: "Member grace period — final warning",
  previewData: preview("final"),
} satisfies TemplateEntry;

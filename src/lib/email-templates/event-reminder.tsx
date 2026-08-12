/**
 * React Email template for attendee event reminders (one week and one day).
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Deliberately shorter than the confirmation: the attendee already has the
 * full details, so this is the practical "how to turn up" email — when, where,
 * the ticket code, and how to tell us if they can no longer come.
 */
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/i18n/config";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import { REMINDER_COPY, fillReminder } from "./event-reminder-copy";
import type { TemplateEntry } from "./registry";

export interface EventReminderProps {
  locale?: Locale;
  baseUrl?: string;
  /** "week" = seven days out, "day" = the day before. */
  stage?: "week" | "day";
  attendeeName?: string;
  eventTitle?: string;
  when?: string;
  location?: string;
  onlineUrl?: string | null;
  tierName?: string | null;
  practicalNotes?: string | null;
  eventUrl?: string;
  ticketUrl?: string | null;
  qrUrl?: string | null;
  organiserEmail?: string;
}

const INK = "#212251";
const BLUE = "#2B379B";
const BONE = "#F8F0E4";
const MUTED = "#4b4d70";

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const root = (baseUrl || SITE_URL).replace(/\/$/, "");
  return `${root}${path}`;
}

const main = {
  backgroundColor: BONE,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: INK,
  margin: 0,
  padding: "24px 0",
};
const container = { backgroundColor: BONE, maxWidth: "600px", borderRadius: "4px", overflow: "hidden" };
const banner = { backgroundColor: INK, padding: "24px 32px", borderBottom: "4px solid #5778FA" };
const bannerInner = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const logoStyle = { display: "block", outline: "none", border: "none", textDecoration: "none" };
const bannerTag = {
  color: "#5778FA",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};
const content = { padding: "40px 32px" };
const heading = { fontSize: "28px", lineHeight: "1.2", margin: "0 0 16px", color: INK, fontWeight: 700 };
const paragraph = { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px", color: INK };
const label = {
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
  color: MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};
const value = { fontSize: "15px", lineHeight: "23px", margin: "0 0 12px", color: INK };
const panel = {
  backgroundColor: "#ffffff",
  padding: "20px 24px",
  borderRadius: "12px",
  border: "1px solid #e6e3dc",
};
const sectionTitle = {
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 10px",
  color: MUTED,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};
const link = { color: BLUE, textDecoration: "underline" };
const rule = { borderColor: "#e4ddd0", margin: "24px 0" };
const footer = { fontSize: "13px", lineHeight: "21px", color: MUTED, margin: "0 0 8px" };
const button = {
  backgroundColor: "#5778FA",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "16px 32px",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
};
const pageFooter = { backgroundColor: INK, padding: "24px 32px", textAlign: "center" as const };
const pageFooterText = { fontSize: "12px", color: "#ffffff", opacity: 0.6, margin: 0 };
const footerLogoStyle = { display: "block", margin: "0 auto 12px", outline: "none", border: "none" };

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Text style={label}>{title}</Text>
      <Text style={value}>{children}</Text>
    </>
  );
}

const Email = ({
  locale = "en",
  baseUrl,
  stage = "week",
  attendeeName = "",
  eventTitle = "",
  when = "",
  location = "",
  onlineUrl = null,
  tierName = null,
  practicalNotes = null,
  eventUrl = "",
  ticketUrl = null,
  qrUrl = null,
  organiserEmail = "office@coachingfederation.ch",
}: EventReminderProps) => {
  const copy = REMINDER_COPY[locale] ?? REMINDER_COPY.en;
  const [signoffLine, signoffName] = copy.signoff.split("\n");
  const day = stage === "day";

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{day ? copy.previewDay : copy.previewWeek}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <div style={bannerInner}>
              <Img
                src={assetUrl(logoNegativeAsset.url, baseUrl)}
                alt="The Switzerland Chapter of ICF"
                width={210}
                height={79}
                style={logoStyle}
              />
              <span style={bannerTag}>{copy.detailsTitle}</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{day ? copy.headingDay : copy.headingWeek}</Heading>
            <Text style={paragraph}>{fillReminder(copy.greeting, { name: attendeeName })},</Text>
            <Text style={paragraph}>{day ? copy.introDay : copy.introWeek}</Text>

            <Section style={panel}>
              <Text style={sectionTitle}>{copy.detailsTitle}</Text>
              <Text style={{ ...value, fontSize: "17px", fontWeight: 700 }}>{eventTitle}</Text>
              <Row title={copy.whenLabel}>{when}</Row>
              <Row title={copy.locationLabel}>{location}</Row>
              {onlineUrl ? (
                <Row title={copy.onlineLabel}>
                  <Link href={onlineUrl} style={link}>
                    {onlineUrl}
                  </Link>
                </Row>
              ) : null}
              {tierName ? <Row title={copy.ticketLabel}>{tierName}</Row> : null}
            </Section>

            {practicalNotes ? (
              <>
                <Hr style={rule} />
                <Text style={sectionTitle}>{copy.notesTitle}</Text>
                <Text style={paragraph}>{practicalNotes}</Text>
              </>
            ) : null}

            {ticketUrl ? (
              <>
                <Hr style={rule} />
                <Text style={sectionTitle}>{copy.ticketTitle}</Text>
                <Text style={paragraph}>{copy.ticketIntro}</Text>
                {qrUrl ? (
                  <Img src={qrUrl} alt={copy.ticketTitle} width={180} height={180} style={{ display: "block", margin: "0 0 16px" }} />
                ) : null}
                <Section style={{ margin: "8px 0 4px" }}>
                  <Button style={button} href={ticketUrl}>
                    {copy.openTicket} →
                  </Button>
                </Section>
              </>
            ) : (
              <Section style={{ margin: "24px 0 4px" }}>
                <Button style={button} href={eventUrl}>
                  {copy.viewEvent} →
                </Button>
              </Section>
            )}

            <Hr style={rule} />
            <Text style={footer}>{fillReminder(copy.cannotCome, { email: organiserEmail })}</Text>
            <Text style={footer}>{fillReminder(copy.questions, { email: organiserEmail })}</Text>
            <Text style={footer}>{signoffLine}</Text>
            <Text style={footer}>{signoffName}</Text>
          </Section>

          <Section style={pageFooter}>
            <Img
              src={assetUrl(logoWhiteAsset.url, baseUrl)}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={footerLogoStyle}
            />
            <Text style={pageFooterText}>
              © {new Date().getFullYear()} The Switzerland Chapter of ICF
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email,
  displayName: "Event reminder",
  subject: (data: Record<string, any>) => {
    const locale = (data?.locale as Locale) ?? "en";
    const copy = REMINDER_COPY[locale] ?? REMINDER_COPY.en;
    const raw = data?.stage === "day" ? copy.subjectDay : copy.subjectWeek;
    return fillReminder(raw, { title: String(data?.eventTitle ?? "") });
  },
  previewData: {
    locale: "en",
    stage: "day",
    attendeeName: "Anna Muster",
    eventTitle: "Coaching in organisations: an evening in Zürich",
    when: "Thursday, 12 March 2026, 18:00–20:00 (Europe/Zurich)",
    location: "Impact Hub, Zürich",
    tierName: "Member ticket",
    practicalNotes: "Doors open at 17:30. Please bring a photo ID for building access.",
    eventUrl: "https://new.coachingfederation.ch/events/example",
    ticketUrl: "https://new.coachingfederation.ch/ticket/example-token-value-1234",
    qrUrl: null,
    organiserEmail: "office@coachingfederation.ch",
  },
};
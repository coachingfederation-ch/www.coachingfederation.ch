/**
 * React Email template for attendee event confirmations (free and paid).
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Copy comes from `event-confirmation-copy.ts` so the same strings drive the
 * HTML and the plain-text rendering React Email derives from it.
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
import { CONFIRMATION_COPY, fill } from "./event-confirmation-copy";
import type { TemplateEntry } from "./registry";

export interface EventConfirmationProps {
  locale?: Locale;
  baseUrl?: string;
  paid?: boolean;
  attendeeName?: string;
  eventTitle?: string;
  eventSummary?: string | null;
  when?: string;
  location?: string;
  onlineUrl?: string | null;
  eventUrl?: string;
  tierName?: string | null;
  memberPrice?: boolean;
  nonMemberPrice?: boolean;
  amount?: string | null;
  reference?: string;
  answers?: { label: string; value: string }[];
  organiserEmail?: string;
  calendarUrl?: string | null;
  googleUrl?: string | null;
  outlookUrl?: string | null;
}

const INK = "#212251";
const BLUE = "#2B379B";
const BONE = "#F8F0E4";
const MUTED = "#4b4d70";

const DEFAULT_ASSET_BASE = SITE_URL;

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const root = (baseUrl || DEFAULT_ASSET_BASE).replace(/\/$/, "");
  return `${root}${path}`;
}

/** Same hand-drawn accent the member claim invitation uses under its heading. */
const BrushUnderline = () => (
  <svg
    width="100%"
    height="12"
    viewBox="0 0 400 12"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path d="M0,8 Q100,2 200,8 T400,6 L400,12 L0,12 Z" fill="#5778FA" fillOpacity="0.35" />
  </svg>
);

const main = {
  backgroundColor: BONE,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: INK,
  margin: 0,
  padding: "24px 0",
};
const container = {
  backgroundColor: BONE,
  maxWidth: "600px",
  borderRadius: "4px",
  overflow: "hidden",
};
const banner = {
  backgroundColor: INK,
  padding: "24px 32px",
  borderBottom: "4px solid #5778FA",
};
const bannerInner = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const logoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
};
const bannerTag = {
  color: "#5778FA",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};
const content = { padding: "40px 32px" };
const heading = {
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 8px",
  color: INK,
  fontWeight: 700,
};
const paragraph = { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px", color: INK };
const label = {
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
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
const pageFooter = {
  backgroundColor: INK,
  padding: "24px 32px",
  textAlign: "center" as const,
};
const pageFooterText = {
  fontSize: "12px",
  color: "#ffffff",
  opacity: 0.6,
  margin: 0,
};
const footerLogoStyle = {
  display: "block",
  margin: "0 auto 12px",
  outline: "none",
  border: "none",
};

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
  paid = false,
  attendeeName = "",
  eventTitle = "",
  eventSummary = null,
  when = "",
  location = "",
  onlineUrl = null,
  eventUrl = "",
  tierName = null,
  memberPrice = false,
  nonMemberPrice = false,
  amount = null,
  reference = "",
  answers = [],
  organiserEmail = "office@coachingfederation.ch",
  calendarUrl = null,
  googleUrl = null,
  outlookUrl = null,
}: EventConfirmationProps) => {
  const copy = CONFIRMATION_COPY[locale] ?? CONFIRMATION_COPY.en;
  const [signoffLine, signoffName] = copy.signoff.split("\n");
  const logo = assetUrl(logoNegativeAsset.url, baseUrl);
  const logoWhite = assetUrl(logoWhiteAsset.url, baseUrl);

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{paid ? copy.previewPaid : copy.previewFree}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <div style={bannerInner}>
              <Img
                src={logo}
                alt="The Switzerland Chapter of ICF"
                width={210}
                height={79}
                style={logoStyle}
              />
              <span style={bannerTag}>{copy.detailsTitle}</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{paid ? copy.headingPaid : copy.headingFree}</Heading>
            <div style={{ marginBottom: "24px" }}>
              <BrushUnderline />
            </div>
            <Text style={paragraph}>{fill(copy.greeting, { name: attendeeName })},</Text>
            <Text style={paragraph}>{paid ? copy.introPaid : copy.introFree}</Text>

            <Section style={panel}>
              <Text style={sectionTitle}>{copy.detailsTitle}</Text>
              <Text style={{ ...value, fontSize: "17px", fontWeight: 700 }}>{eventTitle}</Text>
              {eventSummary ? <Text style={value}>{eventSummary}</Text> : null}
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
              {paid && amount ? (
                <>
                  <Row title={copy.amountLabel}>
                    {amount} — {copy.paymentConfirmed}
                  </Row>
                  <Row title={copy.referenceLabel}>{reference}</Row>
                </>
              ) : null}
              {paid && memberPrice ? <Text style={value}>{copy.memberPriceNote}</Text> : null}
              {paid && nonMemberPrice ? <Text style={value}>{copy.nonMemberPriceNote}</Text> : null}
              <Text style={{ ...value, margin: "4px 0 0" }}>
                <Link href={eventUrl} style={link}>
                  {copy.viewEvent}
                </Link>
              </Text>
            </Section>

            <Section style={{ margin: "28px 0 4px" }}>
              <Button style={button} href={eventUrl}>
                {copy.viewEvent} →
              </Button>
            </Section>

            {answers.length > 0 ? (
              <>
                <Hr style={rule} />
                <Text style={sectionTitle}>{copy.answersTitle}</Text>
                {answers.map((a) => (
                  <Row key={a.label} title={a.label}>
                    {a.value}
                  </Row>
                ))}
              </>
            ) : null}

            {calendarUrl || googleUrl || outlookUrl ? (
              <>
                <Hr style={rule} />
                <Text style={sectionTitle}>{copy.calendarTitle}</Text>
                <Text style={paragraph}>{copy.calendarIntro}</Text>
                <Text style={paragraph}>
                  {calendarUrl ? (
                    <Link href={calendarUrl} style={link}>
                      {copy.addToCalendar}
                    </Link>
                  ) : null}
                  {calendarUrl && googleUrl ? " · " : null}
                  {googleUrl ? (
                    <Link href={googleUrl} style={link}>
                      {copy.addToGoogle}
                    </Link>
                  ) : null}
                  {(calendarUrl || googleUrl) && outlookUrl ? " · " : null}
                  {outlookUrl ? (
                    <Link href={outlookUrl} style={link}>
                      {copy.addToOutlook}
                    </Link>
                  ) : null}
                </Text>
              </>
            ) : null}

            <Hr style={rule} />
            <Text style={footer}>{fill(copy.questions, { email: organiserEmail })}</Text>
            <Text style={footer}>{signoffLine}</Text>
            <Text style={footer}>{signoffName}</Text>
          </Section>

          <Section style={pageFooter}>
            <Img
              src={logoWhite}
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

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) => {
    const locale = (data["locale"] as Locale) ?? "en";
    const copy = CONFIRMATION_COPY[locale] ?? CONFIRMATION_COPY.en;
    const pattern = data["paid"] ? copy.subjectPaid : copy.subjectFree;
    return fill(pattern, { title: String(data["eventTitle"] ?? "") });
  },
  displayName: "Event registration confirmation",
  previewData: {
    locale: "en",
    baseUrl: DEFAULT_ASSET_BASE,
    paid: true,
    attendeeName: "Anna Muster",
    eventTitle: "Coaching in organisations: an evening in Zürich",
    eventSummary: "An evening of practice and conversation with credentialed coaches.",
    when: "Thursday, 4 September 2026, 18:00–20:30 (Europe/Zurich)",
    location: "Impact Hub, Zürich",
    eventUrl: "https://new.coachingfederation.ch/events/coaching-in-organisations",
    tierName: "Member ticket",
    memberPrice: true,
    amount: "CHF 45.00",
    reference: "cs_test_000000",
    answers: [{ label: "Dietary requirements", value: "Vegetarian" }],
    organiserEmail: "office@coachingfederation.ch",
    calendarUrl: "https://new.coachingfederation.ch/api/public/calendar/demo.ics",
    googleUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    outlookUrl: "https://outlook.live.com/calendar/0/deeplink/compose",
  },
} satisfies TemplateEntry;

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
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Locale } from "@/i18n/config";
import { CONFIRMATION_COPY, fill } from "./event-confirmation-copy";
import type { TemplateEntry } from "./registry";

export interface EventConfirmationProps {
  locale?: Locale;
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
}

const INK = "#212251";
const BLUE = "#2B379B";
const BONE = "#F8F0E4";
const MUTED = "#4b4d70";

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: INK,
};
const container = { padding: "28px 24px", maxWidth: "600px" };
const heading = { fontSize: "22px", lineHeight: "30px", margin: "0 0 12px", color: INK };
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
const panel = { backgroundColor: BONE, padding: "18px 20px", borderRadius: "12px" };
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
}: EventConfirmationProps) => {
  const copy = CONFIRMATION_COPY[locale] ?? CONFIRMATION_COPY.en;
  const [signoffLine, signoffName] = copy.signoff.split("\n");

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{paid ? copy.previewPaid : copy.previewFree}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{paid ? copy.headingPaid : copy.headingFree}</Heading>
          <Text style={paragraph}>
            {fill(copy.greeting, { name: attendeeName })},
          </Text>
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
            {paid && nonMemberPrice ? (
              <Text style={value}>{copy.nonMemberPriceNote}</Text>
            ) : null}
            <Text style={{ ...value, margin: "4px 0 0" }}>
              <Link href={eventUrl} style={link}>
                {copy.viewEvent}
              </Link>
            </Text>
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

          {calendarUrl || googleUrl ? (
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
              </Text>
            </>
          ) : null}

          <Hr style={rule} />
          <Text style={footer}>
            {fill(copy.questions, { email: organiserEmail })}
          </Text>
          <Text style={footer}>{signoffLine}</Text>
          <Text style={footer}>{signoffName}</Text>
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
  },
} satisfies TemplateEntry;
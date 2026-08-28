/**
 * React Email template telling the inviting member that their guest pass
 * request was declined. Exports: template. Registered in registry.ts.
 *
 * Internal chapter administration runs in English, so this template is
 * English-only. The recipient is supplied by the caller.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface GuestPassDeclinedProps {
  invitingMemberName?: string;
  guestName?: string;
  eventTitle?: string;
  decisionNote?: string | null;
}

const Email = ({
  invitingMemberName = "",
  guestName = "",
  eventTitle = "",
  decisionNote = null,
}: GuestPassDeclinedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your guest pass request was not approved this time.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Guest pass request</Text>
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>Your guest pass request was declined</Heading>
          <Text style={paragraph}>
            Dear {invitingMemberName || "member"}, we could not approve the guest pass you requested
            for {guestName || "your guest"} at {eventTitle || "the event"}.
          </Text>
          {decisionNote ? (
            <Text style={row}>
              <strong>Reason:</strong> {decisionNote}
            </Text>
          ) : null}
          <Text style={muted}>
            Your guest is still very welcome to register for the event themselves. Reply to this
            email if you would like to talk it through with us.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    `Guest pass request — ${(data["guestName"] as string) || "your guest"}`,
  displayName: "Guest pass declined",
  previewData: {
    invitingMemberName: "Anna Muster",
    guestName: "Luca Beispiel",
    eventTitle: "Coaching in organisations",
    decisionNote: "The event is fully booked.",
  },
};

const main = { backgroundColor: "#f8f0e4", fontFamily: "Helvetica, Arial, sans-serif" };

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "16px",
  overflow: "hidden" as const,
};

const banner = { backgroundColor: "#212251", padding: "20px 32px" };

const bannerText = {
  color: "#efcb30",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: 0,
};

const content = { padding: "28px 32px 32px" };

const headingStyle = {
  fontSize: "20px",
  color: "#212251",
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const paragraph = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 16px" };

const row = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 8px" };

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "16px 0 0" };

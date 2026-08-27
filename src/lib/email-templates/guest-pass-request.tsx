/**
 * React Email template notifying Membership & Engagement that a member asked
 * for a guest pass. Exports: template. Registered in registry.ts.
 *
 * Internal chapter administration runs in English, so this template is
 * English-only, and its recipient is fixed to the chapter office address.
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

export interface GuestPassRequestProps {
  invitingMemberName?: string;
  invitingMemberEmail?: string;
  guestName?: string;
  guestEmail?: string;
  eventTitle?: string;
  eventStartsAt?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-CH", { dateStyle: "full", timeStyle: "short" });
};

const Email = ({
  invitingMemberName = "",
  invitingMemberEmail = "",
  guestName = "",
  guestEmail = "",
  eventTitle = "",
  eventStartsAt = null,
}: GuestPassRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A member requested a guest pass — awaiting review.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Guest pass request</Text>
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>A guest pass is waiting for review</Heading>
          <Text style={paragraph}>
            {invitingMemberName || "A member"} requested a guest pass for {eventTitle || "an event"}
            {formatDate(eventStartsAt) ? ` on ${formatDate(eventStartsAt)}` : ""}.
          </Text>
          <Text style={row}>
            <strong>Inviting member:</strong> {invitingMemberName} ({invitingMemberEmail})
          </Text>
          <Text style={row}>
            <strong>Guest:</strong> {guestName} ({guestEmail})
          </Text>
          <Text style={muted}>
            The request is pending. Open the guest pass list in the chapter backend to approve or
            decline it.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    `Guest pass request — ${(data["guestName"] as string) || "new guest"}`,
  displayName: "Guest pass request",
  to: "office@coachingfederation.ch",
  previewData: {
    invitingMemberName: "Anna Muster",
    invitingMemberEmail: "anna.muster@example.com",
    guestName: "Luca Beispiel",
    guestEmail: "luca.beispiel@example.com",
    eventTitle: "Coaching in organisations",
    eventStartsAt: new Date().toISOString(),
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

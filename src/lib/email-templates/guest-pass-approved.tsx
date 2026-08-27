/**
 * React Email template telling the community leader and the inviting member
 * that a guest pass was approved and the guest holds a comped seat.
 * Exports: template. Registered in registry.ts.
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

export interface GuestPassApprovedProps {
  invitingMemberName?: string;
  guestName?: string;
  eventTitle?: string;
  eventStartsAt?: string | null;
  decisionNote?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-CH", { dateStyle: "full", timeStyle: "short" });
};

const Email = ({
  invitingMemberName = "",
  guestName = "",
  eventTitle = "",
  eventStartsAt = null,
  decisionNote = null,
}: GuestPassApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A guest pass was approved — a guest is joining your event.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Guest pass approved</Text>
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>A guest is joining {eventTitle || "the event"}</Heading>
          <Text style={paragraph}>
            {guestName || "A guest"} has a complimentary seat
            {formatDate(eventStartsAt) ? ` on ${formatDate(eventStartsAt)}` : ""}, invited by{" "}
            {invitingMemberName || "a member"}. The guest has received their ticket by email.
          </Text>
          <Text style={row}>
            <strong>Guest:</strong> {guestName}
          </Text>
          <Text style={row}>
            <strong>Invited by:</strong> {invitingMemberName}
          </Text>
          {decisionNote ? (
            <Text style={row}>
              <strong>Note:</strong> {decisionNote}
            </Text>
          ) : null}
          <Text style={muted}>Please give them a warm welcome at the door.</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    `Guest pass approved — ${(data["guestName"] as string) || "a guest"} is joining`,
  displayName: "Guest pass approved",
  previewData: {
    invitingMemberName: "Anna Muster",
    guestName: "Luca Beispiel",
    eventTitle: "Coaching in organisations",
    eventStartsAt: new Date().toISOString(),
    decisionNote: "",
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

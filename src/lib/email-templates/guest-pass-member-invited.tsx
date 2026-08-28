/**
 * React Email template keeping the inviting member informed about their guest
 * pass: first that the invitation went out, later that the guest completed
 * their details. Exports: template. Registered in registry.ts.
 *
 * Never carries the guest's claim link — a forwarded member mail must not let
 * somebody else complete the profile.
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

export interface GuestPassMemberInvitedProps {
  stage?: "invited" | "completed";
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
  stage = "invited",
  guestName = "",
  guestEmail = "",
  eventTitle = "",
  eventStartsAt = null,
}: GuestPassMemberInvitedProps) => {
  const completed = stage === "completed";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {completed
          ? "Your guest completed their details — Membership & Engagement will review."
          : "We have invited your guest to complete their details."}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>Guest pass</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>
              {completed
                ? "Your guest completed their details"
                : "We have invited your guest"}
            </Heading>
            <Text style={paragraph}>
              {completed
                ? `${guestName || "Your guest"} filled in their details for ${eventTitle || "the event"}. Membership & Engagement will review the Guest Pass and confirm by email.`
                : `We sent ${guestName || "your guest"} a personal link so they can complete their own details for ${eventTitle || "the event"}. Once they do, Membership & Engagement reviews the Guest Pass and confirms by email.`}
            </Text>
            <Text style={row}>
              <strong>Guest:</strong> {guestName} {guestEmail ? `(${guestEmail})` : ""}
            </Text>
            {formatDate(eventStartsAt) ? (
              <Text style={row}>
                <strong>When:</strong> {formatDate(eventStartsAt)}
              </Text>
            ) : null}
            <Text style={muted}>
              {completed
                ? "There is nothing else for you to do right now."
                : "Their link is personal, so please do not forward this email as an invitation. Questions? Write to office@coachingfederation.ch."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    data["stage"] === "completed"
      ? `Your guest completed their details — ${(data["guestName"] as string) || "guest pass"}`
      : `We invited your guest — ${(data["guestName"] as string) || "guest pass"}`,
  displayName: "Guest pass — member update",
  previewData: {
    stage: "invited",
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

const headingStyle = { fontSize: "20px", color: "#212251", lineHeight: "1.3", margin: "0 0 16px" };

const paragraph = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 16px" };

const row = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 8px" };

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "16px 0 0" };

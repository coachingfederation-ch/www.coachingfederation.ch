/**
 * React Email alert telling Super Admins that the nightly ICF member sync
 * failed every automatic attempt. Exports: template. Registered in registry.ts.
 *
 * Staff-facing and English-only, like the other internal notifications.
 */
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface MemberSyncFailedProps {
  attempts?: number;
  lastError?: string;
  failedAt?: string;
  integrationUrl?: string;
}

const Email = ({
  attempts = 4,
  lastError = "",
  failedAt = "",
  integrationUrl = "",
}: MemberSyncFailedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`The member sync failed ${attempts} times tonight`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Member sync · needs attention</Text>
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>Tonight&rsquo;s member sync did not go through</Heading>
          <Text style={paragraph}>
            The nightly import from ICF Global failed, and the {attempts - 1} automatic retries
            failed as well. Member records are unchanged — nothing was deleted or overwritten — but
            they are now a day out of date.
          </Text>
          <Text style={row}>
            <strong>Attempts:</strong> {attempts}
          </Text>
          {failedAt ? (
            <Text style={row}>
              <strong>Last attempt:</strong> {failedAt}
            </Text>
          ) : null}
          {lastError ? (
            <Text style={row}>
              <strong>Last message:</strong> {lastError}
            </Text>
          ) : null}
          {integrationUrl ? (
            <Section style={{ margin: "24px 0 0" }}>
              <Button href={integrationUrl} style={button}>
                Open the integration screen
              </Button>
            </Section>
          ) : null}
          <Text style={muted}>
            You receive this because your account holds Super Admin access. You can start a sync by
            hand from the integration screen at any time.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    `Member sync failed ${(data["attempts"] as number) || 4} times — please check`,
  displayName: "Member sync failed",
  previewData: {
    attempts: 4,
    lastError: "Timed out after 5 minutes — the sync was still running and was stopped.",
    failedAt: "2026-09-11T02:00:00.000Z",
    integrationUrl: "https://new.coachingfederation.ch/integration",
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

const button = {
  backgroundColor: "#2b379b",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "24px 0 0" };

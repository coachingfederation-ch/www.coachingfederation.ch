/**
 * React Email template for staff-authored member engagement emails.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Layout, branding and footer are fixed here; the subject and body come from
 * `member_engagement_campaigns.copy`, already rendered with the member's
 * placeholder values by the dispatcher. The body is plain text — blank lines
 * separate paragraphs — so staff can never break the email with markup.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface MemberEngagementProps {
  /** Rendered subject, reused as the heading when no explicit heading is set. */
  subject?: string;
  heading?: string;
  /** Rendered plain-text body; blank lines become paragraphs. */
  body?: string;
  baseUrl?: string;
}

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

const Email = ({ subject, heading, body, baseUrl }: MemberEngagementProps) => {
  const paragraphs = (body ?? "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const title = heading || subject || "";

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject ?? ""}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Img
              src={assetUrl(logoNegativeAsset.url, baseUrl)}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={logoStyle}
            />
          </Section>

          <Section style={content}>
            {title ? <Heading style={headingStyle}>{title}</Heading> : null}
            {paragraphs.map((paragraph, index) => (
              <Text key={index} style={paragraphStyle}>
                {paragraph.split("\n").map((line, lineIndex, lines) => (
                  <React.Fragment key={lineIndex}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </React.Fragment>
                ))}
              </Text>
            ))}
            <Hr style={hr} />
            <Text style={muted}>
              Questions? Write to us at office@coachingfederation.ch and we will help.
            </Text>
          </Section>

          <Section style={footer}>
            <Img
              src={assetUrl(logoWhiteAsset.url, baseUrl)}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={logoStyle}
            />
            <Text style={footerText}>
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
  subject: (data: EmailTemplateData) => (data["subject"] as string) || "The Switzerland Chapter of ICF",
  displayName: "Member engagement",
  previewData: {
    subject: "Welcome to The Switzerland Chapter of ICF",
    body: "Hi Anna,\n\nWelcome to The Switzerland Chapter of ICF. We are glad you are here.\n\nWarm regards,\nThe Switzerland Chapter of ICF",
    baseUrl: SITE_URL,
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#F8F0E4",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
  backgroundColor: "#F8F0E4",
  maxWidth: "600px",
  borderRadius: "4px",
  overflow: "hidden",
};

const banner = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  borderBottom: "4px solid #5778FA",
};

const logoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
};

const content = { padding: "40px 32px" };

const headingStyle = {
  fontSize: "26px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 20px",
  fontWeight: 700,
};

const paragraphStyle = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const hr = { borderColor: "#e2d9c9", margin: "28px 0" };

const muted = {
  fontSize: "13px",
  color: "#5b5f78",
  lineHeight: "1.6",
  margin: 0,
};

const footer = {
  backgroundColor: "#212251",
  padding: "24px 32px",
};

const footerText = {
  fontSize: "12px",
  color: "#b9c0e8",
  margin: "12px 0 0",
};

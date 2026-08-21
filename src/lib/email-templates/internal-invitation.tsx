/**
 * React Email template for inviting an internal (non-member) staff account.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Deliberately English-only: internal chapter administration runs in English,
 * and unlike the member claim invitation there is no stored language for a
 * brand-new staff account at send time.
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
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import type { TemplateEntry } from "./registry";

export interface InternalInvitationProps {
  inviteUrl?: string;
  baseUrl?: string;
  displayName?: string;
  roleLabel?: string;
  expiresInHours?: number;
  isResend?: boolean;
}

const DEFAULT_ASSET_BASE = SITE_URL;

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const root = (baseUrl || DEFAULT_ASSET_BASE).replace(/\/$/, "");
  return `${root}${path}`;
}

const Email = ({
  inviteUrl = "https://coachingfederation.ch/staff-invite",
  baseUrl,
  displayName,
  roleLabel = "internal access",
  expiresInHours = 24,
  isResend = false,
}: InternalInvitationProps) => {
  const logo = assetUrl(logoNegativeAsset.url, baseUrl);
  const logoWhite = assetUrl(logoWhiteAsset.url, baseUrl);

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Set your password to activate your internal account.</Preview>
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
              <span style={bannerTag}>Internal Invitation</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={headingStyle}>
              {displayName ? `Hello ${displayName}` : "Hello"} — your internal account is ready
            </Heading>

            <Text style={lede}>
              {isResend
                ? "Here is a new activation link for your internal account with The Switzerland Chapter of ICF. Any earlier link no longer works."
                : "You have been invited to an internal account with The Switzerland Chapter of ICF. This account is for chapter staff and volunteers working in our content and event systems — it is not an ICF membership."}
            </Text>

            <Text style={accountReady}>Your access: {roleLabel}</Text>

            <Section style={{ margin: "32px 0" }}>
              <Button style={button} href={inviteUrl}>
                Set my password →
              </Button>
            </Section>

            <Text style={muted}>
              This link works once and expires in {expiresInHours} hours.
            </Text>
            <Text style={muted}>If the button does not work, copy this address into your browser:</Text>
            <Text style={urlText}>
              <Link href={inviteUrl} style={{ color: "#2B379B" }}>
                {inviteUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={closing}>
              Questions? Write to office@coachingfederation.ch and we will help you get set up.
            </Text>
            <Text style={signoff}>{"Warm regards,\nThe Switzerland Chapter of ICF"}</Text>
            <Text style={ignore}>
              If you were not expecting this email, you can safely ignore it.
            </Text>
          </Section>

          <Section style={footer}>
            <Img
              src={logoWhite}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={footerLogoStyle}
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
  subject: (data: Record<string, any>) =>
    data["isResend"]
      ? "Your new internal account activation link"
      : "Activate your internal account",
  displayName: "Internal account invitation",
  previewData: {
    inviteUrl: "https://coachingfederation.ch/staff-invite?token_hash=exampletoken",
    baseUrl: DEFAULT_ASSET_BASE,
    displayName: "Anna Muster",
    roleLabel: "Editor",
    expiresInHours: 24,
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

const headingStyle = {
  fontSize: "28px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 8px",
  fontWeight: 700,
};

const lede = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "16px 0 24px",
};

const accountReady = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  fontWeight: 700,
  margin: "0 0 16px",
};

const button = {
  backgroundColor: "#5778FA",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "16px 32px",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-block",
};

const muted = {
  fontSize: "13px",
  color: "#5b5f7a",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const urlText = {
  fontSize: "13px",
  wordBreak: "break-all" as const,
  margin: "0 0 8px",
};

const hr = {
  borderColor: "#e2dccf",
  margin: "32px 0",
};

const closing = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const signoff = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  whiteSpace: "pre-line" as const,
  margin: "0 0 16px",
};

const ignore = {
  fontSize: "12px",
  color: "#5b5f7a",
  lineHeight: "1.5",
  margin: 0,
};

const footer = {
  backgroundColor: "#212251",
  padding: "24px 32px",
};

const footerLogoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  marginBottom: "12px",
};

const footerText = {
  fontSize: "12px",
  color: "#ffffff",
  margin: 0,
};

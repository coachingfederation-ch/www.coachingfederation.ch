/**
 * React Email template for certificates of completion and their withdrawal.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Shares the chrome of the registration confirmation on purpose: the two mails
 * are read together, and the attendee should recognise the sender at a glance.
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
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/i18n/config";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import { CERTIFICATE_EMAIL_COPY } from "./event-certificate-copy";
import { fill } from "./event-confirmation-copy";
import type { TemplateEntry } from "./registry";

export interface EventCertificateProps {
  locale?: Locale;
  baseUrl?: string;
  holderName?: string;
  eventTitle?: string;
  completedOn?: string;
  serial?: string;
  /** Pre-formatted hours line, or null for an attendance-only certificate. */
  hours?: string | null;
  certificateUrl?: string;
  organiserEmail?: string;
  /** Withdrawal notice instead of the issue notice. */
  revoked?: boolean;
}

const INK = "#212251";
const BONE = "#F8F0E4";
const MUTED = "#4b4d70";

const DEFAULT_ASSET_BASE = SITE_URL;

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const root = (baseUrl || DEFAULT_ASSET_BASE).replace(/\/$/, "");
  return `${root}${path}`;
}

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
const heading = {
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 16px",
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
  holderName = "",
  eventTitle = "",
  completedOn = "",
  serial = "",
  hours = null,
  certificateUrl = "",
  organiserEmail = "office@coachingfederation.ch",
  revoked = false,
}: EventCertificateProps) => {
  const copy = CERTIFICATE_EMAIL_COPY[locale] ?? CERTIFICATE_EMAIL_COPY.en;
  const [signoffLine, signoffName] = copy.signoff.split("\n");
  const logo = assetUrl(logoNegativeAsset.url, baseUrl);
  const logoWhite = assetUrl(logoWhiteAsset.url, baseUrl);
  const intro = revoked
    ? copy.revokedIntro
    : hours
      ? fill(copy.introHours, { hours })
      : copy.introAttendance;

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{revoked ? copy.revokedPreview : copy.preview}</Preview>
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
              <span style={bannerTag}>{copy.bannerTag}</span>
            </div>
          </Section>

          <Section style={content}>
            <Heading style={heading}>{revoked ? copy.revokedHeading : copy.heading}</Heading>
            <Text style={paragraph}>{fill(copy.greeting, { name: holderName })},</Text>
            <Text style={paragraph}>{intro}</Text>

            <Section style={panel}>
              <Row title={copy.eventLabel}>{eventTitle}</Row>
              <Row title={copy.dateLabel}>{completedOn}</Row>
              <Row title={copy.serialLabel}>{serial}</Row>
            </Section>

            {!revoked && certificateUrl ? (
              <>
                <Section style={{ margin: "28px 0 4px" }}>
                  <Button style={button} href={certificateUrl}>
                    {copy.button} →
                  </Button>
                </Section>
                <Text style={footer}>{copy.printNote}</Text>
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
    const copy = CERTIFICATE_EMAIL_COPY[locale] ?? CERTIFICATE_EMAIL_COPY.en;
    const title = String(data["eventTitle"] ?? "");
    return data["revoked"]
      ? fill(copy.revokedSubject, { title })
      : fill(copy.subject, { title });
  },
  displayName: "Event certificate",
  previewData: {
    locale: "en",
    baseUrl: DEFAULT_ASSET_BASE,
    holderName: "Anna Muster",
    eventTitle: "Coaching in organisations: an evening in Zürich",
    completedOn: "Thursday, 4 September 2026",
    serial: "ICFS-2026-00001",
    hours: "3.00 Core Competency hours, 1.00 Resource Development hours",
    certificateUrl: "https://new.coachingfederation.ch/verify/certificate/example-token-000000",
    organiserEmail: "office@coachingfederation.ch",
    revoked: false,
  },
} satisfies TemplateEntry;

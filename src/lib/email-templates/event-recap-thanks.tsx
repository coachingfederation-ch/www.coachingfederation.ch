/**
 * React Email template for the after-event thank-you note.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Same chrome as the reminder and the follow-up invitation, so an attendee
 * recognises the sender at a glance. It carries links only — the downloads on
 * the recap page keep their own entitlement check.
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
import { RECAP_THANKS_COPY } from "./event-recap-thanks-copy";
import { fill } from "./event-confirmation-copy";
import type { TemplateEntry } from "./registry";

export interface EventRecapThanksProps {
  locale?: Locale;
  baseUrl?: string;
  attendeeName?: string;
  eventTitle?: string;
  recapHeadline?: string | null;
  personalNote?: string | null;
  recapUrl?: string;
  linkedinUrl?: string | null;
  organiserEmail?: string;
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
  backgroundColor: "#ffffff",
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
const logoStyle = { display: "block", outline: "none", border: "none", textDecoration: "none" };
const content = { padding: "40px 32px" };
const heading = {
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 8px",
  color: INK,
  fontWeight: 700,
};
const paragraph = { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px", color: INK };
const recapTitle = {
  fontSize: "18px",
  lineHeight: "26px",
  margin: "0 0 14px",
  color: INK,
  fontWeight: 700,
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
const pageFooter = { backgroundColor: INK, padding: "24px 32px", textAlign: "center" as const };
const pageFooterText = { fontSize: "12px", color: "#ffffff", opacity: 0.6, margin: 0 };
const footerLogoStyle = {
  display: "block",
  margin: "0 auto 12px",
  outline: "none",
  border: "none",
};

const Email = ({
  locale = "en",
  baseUrl,
  attendeeName = "",
  eventTitle = "",
  recapHeadline = null,
  personalNote = null,
  recapUrl = "",
  linkedinUrl = null,
  organiserEmail = "office@coachingfederation.ch",
}: EventRecapThanksProps) => {
  const copy = RECAP_THANKS_COPY[locale] ?? RECAP_THANKS_COPY.en;
  const [signoffLine, signoffName] = copy.signoff.split("\n");
  const logo = assetUrl(logoNegativeAsset.url, baseUrl);
  const logoWhite = assetUrl(logoWhiteAsset.url, baseUrl);

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Img
              src={logo}
              alt="The Switzerland Chapter of ICF"
              width={210}
              height={79}
              style={logoStyle}
            />
          </Section>

          <Section style={content}>
            <Heading style={heading}>{copy.heading}</Heading>
            <div style={{ marginBottom: "24px" }}>
              <BrushUnderline />
            </div>
            <Text style={paragraph}>{fill(copy.greeting, { name: attendeeName })},</Text>
            <Text style={paragraph}>{fill(copy.intro, { title: eventTitle })}</Text>
            {personalNote ? <Text style={paragraph}>{personalNote}</Text> : null}
            {recapHeadline ? <Text style={recapTitle}>{recapHeadline}</Text> : null}
            <Text style={paragraph}>{copy.galleryIntro}</Text>

            <Section style={{ margin: "28px 0 4px" }}>
              <Button style={button} href={recapUrl}>
                {copy.cta} →
              </Button>
            </Section>
            <Text style={footer}>{fill(copy.fallback, { url: recapUrl })}</Text>

            {linkedinUrl ? (
              <>
                <Hr style={rule} />
                <Text style={paragraph}>{copy.linkedinIntro}</Text>
                <Text style={paragraph}>
                  <Link href={linkedinUrl} style={link}>
                    {copy.linkedinCta} ↗
                  </Link>
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
    const copy = RECAP_THANKS_COPY[locale] ?? RECAP_THANKS_COPY.en;
    return fill(copy.subject, { title: String(data["eventTitle"] ?? "") });
  },
  displayName: "Event recap thank-you",
  previewData: {
    locale: "en",
    baseUrl: DEFAULT_ASSET_BASE,
    attendeeName: "Anna Muster",
    eventTitle: "Coaching in organisations: an evening in Zürich",
    recapHeadline: "An evening of honest conversations",
    personalNote: null,
    recapUrl: "https://new.coachingfederation.ch/events/coaching-in-organisations#recap",
    linkedinUrl: null,
    organiserEmail: "office@coachingfederation.ch",
  },
} satisfies TemplateEntry;

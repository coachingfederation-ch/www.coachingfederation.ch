/**
 * Staff notification: a member submitted an advertising request for review.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * English-only and addressed to the chapter office, like the other internal
 * notifications — it is a work item, not member correspondence. Inline styles
 * mirror the other templates: email clients cannot read design tokens.
 */
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface AdRequestSubmittedProps {
  advertiserName?: string;
  offerLabel?: string;
  priceLabel?: string;
  eligibilityLabel?: string;
  reviewUrl?: string;
  baseUrl?: string;
}

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

const Email = ({
  advertiserName = "An advertiser",
  offerLabel = "Partner package",
  priceLabel = "CHF 0",
  eligibilityLabel = "Not determined",
  reviewUrl = `${SITE_URL}/manage/ad-requests`,
  baseUrl,
}: AdRequestSubmittedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${advertiserName} submitted an advertising request for review.`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img
            src={assetUrl(logoNegativeAsset.url, baseUrl)}
            alt="The Switzerland Chapter of ICF"
            width={210}
            height={79}
            style={logoStyle}
          />
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>New advertising request</Heading>
          <Text style={lede}>
            {advertiserName} submitted an advertising request. Review the content and the commercial
            terms before approving — nothing goes live until a contract is marked signed.
          </Text>
          <Text style={row}>
            <strong>Offer:</strong> {offerLabel}
          </Text>
          <Text style={row}>
            <strong>Computed price:</strong> {priceLabel}
          </Text>
          <Text style={row}>
            <strong>Claimed eligibility:</strong> {eligibilityLabel}
          </Text>
          <Section style={{ margin: "32px 0 0" }}>
            <Button style={button} href={reviewUrl}>
              Open the review queue →
            </Button>
          </Section>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: EmailTemplateData) =>
    `Advertising request: ${String(data["advertiserName"] ?? "new submission")}`,
  displayName: "Advertising request submitted (staff)",
  to: "office@coachingfederation.ch",
  previewData: {
    advertiserName: "Muster Coaching AG",
    offerLabel: "Partner package — Gold, 12 months",
    priceLabel: "CHF 5'000",
    eligibilityLabel: "Chapter member with PCC",
    reviewUrl: `${SITE_URL}/manage/ad-requests`,
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
const logoStyle = { display: "block", outline: "none", border: "none", textDecoration: "none" };
const content = { padding: "40px 32px" };
const headingStyle = {
  fontSize: "26px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 8px",
  fontWeight: 700,
};
const lede = { fontSize: "16px", color: "#212251", lineHeight: "1.6", margin: "16px 0 24px" };
const row = { fontSize: "15px", color: "#212251", lineHeight: "1.6", margin: "0 0 6px" };
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

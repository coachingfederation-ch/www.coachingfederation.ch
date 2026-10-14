/**
 * Member notification: their advertising request was approved (with the
 * contract to sign) or declined.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * One template for both outcomes so the decision always reads in the same
 * voice; the caller passes the outcome and the copy switches.
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
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface AdRequestDecisionProps {
  approved?: boolean;
  advertiserName?: string;
  offerLabel?: string;
  priceLabel?: string;
  periodLabel?: string;
  declineReason?: string;
  detailUrl?: string;
  baseUrl?: string;
}

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

const Email = ({
  approved = true,
  advertiserName = "",
  offerLabel = "",
  priceLabel = "",
  periodLabel = "",
  declineReason = "",
  detailUrl = `${SITE_URL}/member/advertise`,
  baseUrl,
}: AdRequestDecisionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {approved
        ? "Your advertising request is approved — the contract is ready to sign."
        : "An update on your advertising request."}
    </Preview>
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
          <Heading style={headingStyle}>
            {approved ? "Your advertising request is approved" : "Your advertising request"}
          </Heading>

          {approved ? (
            <>
              <Text style={lede}>
                Thank you{advertiserName ? `, ${advertiserName}` : ""}. We reviewed your request and
                are glad to move ahead. The next step is the contract — we send it to you, and your
                placement goes live once both sides have signed.
              </Text>
              {offerLabel ? (
                <Text style={row}>
                  <strong>Offer:</strong> {offerLabel}
                </Text>
              ) : null}
              {priceLabel ? (
                <Text style={row}>
                  <strong>Price:</strong> {priceLabel}
                </Text>
              ) : null}
              {periodLabel ? (
                <Text style={row}>
                  <strong>Period:</strong> {periodLabel}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={lede}>
                Thank you for your interest in advertising with us. We are not able to place this
                request.
              </Text>
              {declineReason ? <Text style={row}>{declineReason}</Text> : null}
              <Text style={row}>
                You are welcome to adjust the request and submit it again, or write to us and we
                will talk it through with you.
              </Text>
            </>
          )}

          <Section style={{ margin: "32px 0 0" }}>
            <Button style={button} href={detailUrl}>
              {approved ? "View my request →" : "Review my request →"}
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={closing}>
            Questions? Write to office@coachingfederation.ch and we will help.
          </Text>
          <Text style={signoff}>{"Warm regards,\nThe Switzerland Chapter of ICF"}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: EmailTemplateData) =>
    data["approved"]
      ? "Your advertising request is approved"
      : "An update on your advertising request",
  displayName: "Advertising request decision",
  previewData: {
    approved: true,
    advertiserName: "Muster Coaching AG",
    offerLabel: "Partner package — Silver, 12 months",
    priceLabel: "CHF 3'000",
    periodLabel: "January 1, 2027 – December 31, 2027",
    detailUrl: `${SITE_URL}/member/advertise`,
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
const hr = { borderColor: "#e2dccf", margin: "32px 0" };
const closing = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 12px" };
const signoff = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  whiteSpace: "pre-line" as const,
  margin: 0,
};

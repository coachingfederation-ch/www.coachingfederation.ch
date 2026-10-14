/**
 * Member notification: the advertising contract is ready to sign.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Sent when staff generate and send the contract. Signing happens off-platform
 * — we tell the advertiser what to expect and where their request lives.
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
import {
  main,
  container,
  banner,
  logoStyle,
  content,
  headingStyle,
  lede,
  row,
  button,
  hr,
  closing,
  signoff,
  assetUrl,
} from "./ad-email-styles";

export interface AdContractReadyProps {
  advertiserName?: string;
  offerLabel?: string;
  priceLabel?: string;
  periodLabel?: string;
  detailUrl?: string;
  baseUrl?: string;
}

const Email = ({
  advertiserName = "",
  offerLabel = "",
  priceLabel = "",
  periodLabel = "",
  detailUrl = `${SITE_URL}/member/advertise`,
  baseUrl,
}: AdContractReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your advertising contract is on its way.</Preview>
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
          <Heading style={headingStyle}>Your contract is ready</Heading>
          <Text style={lede}>
            Thank you{advertiserName ? `, ${advertiserName}` : ""}. We prepared the advertising
            agreement for your request. Please sign it and send it back — your placement goes live
            once both sides have signed.
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
          <Section style={{ margin: "32px 0 0" }}>
            <Button style={button} href={detailUrl}>
              View my request →
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
  subject: (_data: EmailTemplateData) => "Your advertising contract is ready to sign",
  displayName: "Advertising contract ready",
  previewData: {
    advertiserName: "Muster Coaching AG",
    offerLabel: "Partner package — Silver, 12 months",
    priceLabel: "CHF 2'000",
    periodLabel: "January 1, 2027 – December 31, 2027",
    detailUrl: `${SITE_URL}/member/advertise`,
  },
} satisfies TemplateEntry;

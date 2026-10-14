/**
 * Notification: an advertising placement ends in 30 days.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * Sent to the advertiser and to the office, so a renewal conversation starts
 * before the placement disappears from the site.
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

export interface AdPlacementExpiringProps {
  advertiserName?: string;
  endDate?: string;
  placementsLabel?: string;
  detailUrl?: string;
  baseUrl?: string;
}

const Email = ({
  advertiserName = "",
  endDate = "",
  placementsLabel = "",
  detailUrl = `${SITE_URL}/member/advertise`,
  baseUrl,
}: AdPlacementExpiringProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your placement ends in 30 days.</Preview>
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
          <Heading style={headingStyle}>Your placement ends in 30 days</Heading>
          <Text style={lede}>
            {advertiserName ? `${advertiserName}, ` : ""}your advertising with us runs until{" "}
            {endDate}. If you would like to continue, write to us and we will prepare the next
            period together.
          </Text>
          {placementsLabel ? (
            <Text style={row}>
              <strong>Where:</strong> {placementsLabel}
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
  subject: (_data: EmailTemplateData) => "Your advertising placement ends in 30 days",
  displayName: "Advertising placement expiring",
  previewData: {
    advertiserName: "Muster Coaching AG",
    endDate: "December 31, 2027",
    placementsLabel: "Homepage, newsletter",
    detailUrl: `${SITE_URL}/member/advertise`,
  },
} satisfies TemplateEntry;

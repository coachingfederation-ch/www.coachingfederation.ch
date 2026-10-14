/**
 * Member notification: the advertising placement is live.
 * Exports: template. Registered in lib/email-templates/registry.ts.
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

export interface AdPlacementLiveProps {
  advertiserName?: string;
  placementsLabel?: string;
  periodLabel?: string;
  detailUrl?: string;
  baseUrl?: string;
}

const Email = ({
  advertiserName = "",
  placementsLabel = "",
  periodLabel = "",
  detailUrl = `${SITE_URL}/member/advertise`,
  baseUrl,
}: AdPlacementLiveProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your placement is live.</Preview>
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
          <Heading style={headingStyle}>Your placement is live</Heading>
          <Text style={lede}>
            Thank you{advertiserName ? `, ${advertiserName}` : ""}. Your advertising is now visible
            to our community.
          </Text>
          {placementsLabel ? (
            <Text style={row}>
              <strong>Where:</strong> {placementsLabel}
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
  subject: (_data: EmailTemplateData) => "Your advertising placement is live",
  displayName: "Advertising placement live",
  previewData: {
    advertiserName: "Muster Coaching AG",
    placementsLabel: "Homepage, newsletter",
    periodLabel: "January 1, 2027 – December 31, 2027",
    detailUrl: `${SITE_URL}/member/advertise`,
  },
} satisfies TemplateEntry;

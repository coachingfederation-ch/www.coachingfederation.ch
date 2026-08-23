/**
 * React Email template for the weekly newsletter refresh notice.
 * Exports: template. Registered in lib/email-templates/registry.ts.
 *
 * English-only on purpose: this goes to editorial staff, whose CMS runs in
 * English. It is sent only when the Friday refresh actually changed something.
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

export interface NewsletterRefreshProps {
  recipientName?: string;
  changedBlocks?: number;
  editorUrl?: string;
  baseUrl?: string;
}

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

const Email = ({
  recipientName,
  changedBlocks = 0,
  editorUrl = `${SITE_URL}/manage/newsletters`,
  baseUrl,
}: NewsletterRefreshProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {`${changedBlocks} newsletter block${changedBlocks === 1 ? "" : "s"} were refreshed.`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img
            src={assetUrl(logoNegativeAsset.url, baseUrl)}
            alt="The Switzerland Chapter of ICF"
            width={210}
            height={79}
          />
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>
            {recipientName ? `Hello ${recipientName}` : "Hello"} — the newsletter was refreshed
          </Heading>
          <Text style={lede}>
            {`We regenerated ${changedBlocks} block${changedBlocks === 1 ? "" : "s"} of the current edition because the underlying content changed. Nothing is published yet — review the draft, adjust the wording, and submit it when it reads right.`}
          </Text>
          <Section style={{ margin: "32px 0" }}>
            <Button style={button} href={editorUrl}>
              Open the newsletter editor →
            </Button>
          </Section>
          <Text style={muted}>
            You receive this because you hold an editorial role in the chapter CMS.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main: React.CSSProperties = { backgroundColor: "#F8F0E4", fontFamily: "Arial, sans-serif" };
const container: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
};
const banner: React.CSSProperties = { backgroundColor: "#212251", padding: "24px 32px" };
const content: React.CSSProperties = { padding: "32px" };
const headingStyle: React.CSSProperties = {
  color: "#212251",
  fontSize: "22px",
  margin: "0 0 16px",
};
const lede: React.CSSProperties = { color: "#4b4d70", fontSize: "15px", lineHeight: "24px" };
const muted: React.CSSProperties = { color: "#6b6d8c", fontSize: "13px", lineHeight: "20px" };
const button: React.CSSProperties = {
  backgroundColor: "#2B379B",
  color: "#ffffff",
  borderRadius: "999px",
  padding: "12px 24px",
  fontSize: "15px",
  textDecoration: "none",
};

export const template: TemplateEntry = {
  component: Email,
  subject: (data: EmailTemplateData) =>
    `Newsletter draft refreshed — ${data["changedBlocks"] ?? 0} block(s) updated`,
  displayName: "Newsletter refresh notice",
  previewData: { recipientName: "Alex", changedBlocks: 3 },
};

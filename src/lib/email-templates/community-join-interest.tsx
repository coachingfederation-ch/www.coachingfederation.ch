/**
 * React Email template telling a community's leads that a member asked to
 * join. Exports: template. Registered in registry.ts.
 *
 * Localised in the member's interface language, because community leads and
 * their members share a language region.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Locale } from "@/i18n/config";
import { COMMUNITY_JOIN_COPY, fill } from "./community-join-interest-copy";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface CommunityJoinInterestProps {
  locale?: Locale;
  communityName?: string;
  memberName?: string;
  memberEmail?: string;
}

const copyFor = (locale?: Locale) => COMMUNITY_JOIN_COPY[locale ?? "en"] ?? COMMUNITY_JOIN_COPY.en;

const Email = ({
  locale = "en",
  communityName = "",
  memberName = "",
  memberEmail = "",
}: CommunityJoinInterestProps) => {
  const copy = copyFor(locale);
  const vars = { community: communityName, name: memberName };
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{fill(copy.preview, vars)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>{copy.banner}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{copy.heading}</Heading>
            <Text style={paragraph}>{fill(copy.intro, vars)}</Text>
            <Text style={row}>
              <strong>{copy.nameLabel}:</strong> {memberName}
            </Text>
            <Text style={row}>
              <strong>{copy.emailLabel}:</strong>{" "}
              <Link href={`mailto:${memberEmail}`} style={link}>
                {memberEmail}
              </Link>
            </Text>
            <Text style={row}>
              <strong>{copy.communityLabel}:</strong> {communityName}
            </Text>
            <Text style={muted}>{copy.closing}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    fill(copyFor(data["locale"] as Locale | undefined).subject, {
      community: (data["communityName"] as string) || "a community",
    }),
  displayName: "Community join interest",
  previewData: {
    locale: "en",
    communityName: "Community Zürich",
    memberName: "Anna Muster",
    memberEmail: "anna.muster@example.com",
  },
};

const main = { backgroundColor: "#f8f0e4", fontFamily: "Helvetica, Arial, sans-serif" };

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "16px",
  overflow: "hidden" as const,
};

const banner = { backgroundColor: "#212251", padding: "20px 32px" };

const bannerText = {
  color: "#efcb30",
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: 0,
};

const content = { padding: "28px 32px 32px" };

const headingStyle = { fontSize: "20px", color: "#212251", lineHeight: "1.3", margin: "0 0 16px" };

const paragraph = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 16px" };

const row = { fontSize: "14px", color: "#212251", lineHeight: "1.6", margin: "0 0 8px" };

const link = { color: "#2b379b", textDecoration: "underline" };

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "16px 0 0" };

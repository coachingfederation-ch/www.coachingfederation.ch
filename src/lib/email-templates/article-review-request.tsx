/**
 * React Email template nudging publishers that an article waits for review.
 * Exports: template. Registered in registry.ts.
 *
 * Staff-facing and English-only, like the other internal notifications.
 */
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface ArticleReviewRequestProps {
  articleTitle?: string;
  submitterName?: string;
  language?: string;
  categoryName?: string;
  articleUrl?: string;
}

const Email = ({
  articleTitle = "Untitled article",
  submitterName = "A colleague",
  language = "",
  categoryName = "",
  articleUrl = "",
}: ArticleReviewRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${submitterName} submitted "${articleTitle}" for review`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Text style={bannerText}>Insights · ready for review</Text>
        </Section>
        <Section style={content}>
          <Heading style={headingStyle}>An article is waiting for your review</Heading>
          <Text style={paragraph}>
            {submitterName} submitted an article for review. Because an article is always published
            by someone other than its author, it needs a publisher to read it and put it live.
          </Text>
          <Text style={row}>
            <strong>Title:</strong> {articleTitle}
          </Text>
          {language ? (
            <Text style={row}>
              <strong>Language:</strong> {language.toUpperCase()}
            </Text>
          ) : null}
          {categoryName ? (
            <Text style={row}>
              <strong>Category:</strong> {categoryName}
            </Text>
          ) : null}
          {articleUrl ? (
            <Section style={{ margin: "24px 0 0" }}>
              <Button href={articleUrl} style={button}>
                Open the article
              </Button>
            </Section>
          ) : null}
          <Text style={muted}>
            You receive this because your account may publish Insights articles.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    `Ready for review: ${(data["articleTitle"] as string) || "an Insights article"}`,
  displayName: "Article review request",
  previewData: {
    articleTitle: "What coaching brings to hybrid teams",
    submitterName: "Anna Muster",
    language: "en",
    categoryName: "Leadership",
    articleUrl: "https://new.coachingfederation.ch/articles/00000000-0000-0000-0000-000000000000",
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

const button = {
  backgroundColor: "#2b379b",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "24px 0 0" };

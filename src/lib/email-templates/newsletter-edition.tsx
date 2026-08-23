/**
 * React Email template for one newsletter edition.
 * Exports: NewsletterEditionEmail, template. Registered in registry.ts.
 *
 * Shared by the staff preview (rendered to HTML by newsletters.server.ts) and,
 * later, by the actual send. Only enabled blocks are rendered, in position
 * order, so the preview equals what a recipient would receive.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import { blockImagePreset } from "@/lib/block-image";
import type { TemplateEntry } from "./registry";

export interface NewsletterEmailBlock {
  id: string;
  title: string;
  content: string;
  featuredImageUrl?: string | null;
  imageAlt?: string | null;
  imageSource?: string | null;
  imageCreditName?: string | null;
  imageCreditUrl?: string | null;
  imageAspect?: string | null;
  sources?: { label: string; url?: string | null }[];
}


export interface NewsletterEditionEmailProps {
  title?: string;
  issueLabel?: string;
  blocks?: NewsletterEmailBlock[];
  baseUrl?: string;
}

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${(baseUrl || SITE_URL).replace(/\/$/, "")}${path}`;
}

export const NewsletterEditionEmail = ({
  title = "Chapter newsletter",
  issueLabel = "",
  blocks = [],
  baseUrl,
}: NewsletterEditionEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${title}${issueLabel ? ` — ${issueLabel}` : ""}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Img
            src={assetUrl(logoNegativeAsset.url, baseUrl)}
            alt="The Switzerland Chapter of ICF"
            width={210}
            height={79}
          />
          {issueLabel ? <Text style={issue}>{issueLabel}</Text> : null}
          <Heading style={masthead}>{title}</Heading>
        </Section>

        <Section style={content}>
          {blocks.length === 0 ? (
            <Text style={lede}>
              This edition has no enabled blocks yet. Enable a block in the editor to see it here.
            </Text>
          ) : null}

          {blocks.map((block, index) => (
            <Section key={block.id} style={index === 0 ? firstBlock : blockSection}>
              {index > 0 ? <Hr style={rule} /> : null}
              <Heading as="h2" style={blockHeading}>
                {block.title}
              </Heading>
              {block.featuredImageUrl ? (
                <>
                  {(() => {
                    // Explicit pixel dimensions: email clients cannot crop, so
                    // the picture is already baked to the preset's ratio.
                    const preset = blockImagePreset(block.imageAspect);
                    const width = Math.min(536, preset.width);
                    const height = Math.round((width / preset.width) * preset.height);
                    return (
                      <Img
                        src={block.featuredImageUrl}
                        alt={block.imageAlt ?? ""}
                        width={width}
                        height={height}
                        style={{ borderRadius: "16px", margin: "0 0 8px" }}
                      />
                    );
                  })()}

                  {block.imageSource === "ai" ? (
                    <Text style={credit}>AI generated image</Text>
                  ) : block.imageCreditName ? (
                    <Text style={credit}>
                      {"Photo by "}
                      {block.imageCreditUrl ? (
                        <Link href={block.imageCreditUrl} style={sourceLink}>
                          {block.imageCreditName}
                        </Link>
                      ) : (
                        block.imageCreditName
                      )}
                      {" on Unsplash"}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {block.content?.trim() ? (
                <Markdown markdownCustomStyles={markdownStyles}>{block.content}</Markdown>
              ) : (
                <Text style={muted}>No content yet.</Text>
              )}
              {block.sources?.length ? (
                <Text style={muted}>
                  {"Sources: "}
                  {block.sources.map((source, i) => (
                    <React.Fragment key={`${block.id}-src-${i}`}>
                      {i > 0 ? " · " : null}
                      {source.url ? (
                        <Link href={source.url} style={sourceLink}>
                          {source.label}
                        </Link>
                      ) : (
                        source.label
                      )}
                    </React.Fragment>
                  ))}
                </Text>
              ) : null}

            </Section>
          ))}
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            The Switzerland Chapter of ICF · Inspire. Transform. Thrive.
          </Text>
          <Link href={(baseUrl || SITE_URL).replace(/\/$/, "")} style={footerLink}>
            coachingfederation.ch
          </Link>
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
const issue: React.CSSProperties = {
  color: "#EFCB30",
  fontSize: "12px",
  letterSpacing: "1px",
  textTransform: "uppercase",
  margin: "16px 0 4px",
};
const masthead: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "26px",
  lineHeight: "32px",
  margin: "0",
};
const content: React.CSSProperties = { padding: "8px 32px 24px" };
const firstBlock: React.CSSProperties = { padding: "24px 0 0" };
const blockSection: React.CSSProperties = { padding: "0" };
const rule: React.CSSProperties = { borderColor: "#e7e2d8", margin: "28px 0" };
const blockHeading: React.CSSProperties = {
  color: "#212251",
  fontSize: "20px",
  lineHeight: "26px",
  margin: "0 0 12px",
};
const lede: React.CSSProperties = { color: "#4b4d70", fontSize: "15px", lineHeight: "24px" };
const muted: React.CSSProperties = { color: "#6b6d8c", fontSize: "13px", lineHeight: "20px" };
// Derived from `muted` so the caption never introduces a second grey value.
const credit: React.CSSProperties = { ...muted, fontSize: "12px", margin: "0 0 16px" };
const sourceLink: React.CSSProperties = { color: "#2B379B", textDecoration: "underline" };
const footer: React.CSSProperties = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  textAlign: "center",
};
const footerText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "13px",
  margin: "0 0 4px",
};
const footerLink: React.CSSProperties = {
  color: "#EFCB30",
  fontSize: "13px",
  textDecoration: "none",
};

const markdownStyles = {
  h1: { color: "#212251", fontSize: "20px", lineHeight: "26px" },
  h2: { color: "#212251", fontSize: "18px", lineHeight: "24px" },
  h3: { color: "#212251", fontSize: "16px", lineHeight: "22px" },
  p: { color: "#4b4d70", fontSize: "15px", lineHeight: "24px" },
  li: { color: "#4b4d70", fontSize: "15px", lineHeight: "24px" },
  link: { color: "#2B379B" },
  bold: { color: "#212251" },
  blockQuote: { color: "#4b4d70", borderLeft: "3px solid #EFCB30", paddingLeft: "12px" },
};

export const template: TemplateEntry = {
  component: NewsletterEditionEmail,
  subject: (data: Record<string, any>) =>
    `${data["title"] ?? "Chapter newsletter"}${data["issueLabel"] ? ` — ${data["issueLabel"]}` : ""}`,
  displayName: "Newsletter edition",
  previewData: {
    title: "Chapter newsletter — March 2026",
    issueLabel: "March 2026",
    blocks: [
      {
        id: "demo-1",
        title: "President's message",
        content:
          "Dear members,\n\nThis month we welcomed **42 new coaches** to the chapter and opened registration for the spring peer-coaching circles.",
        sources: [],
      },
      {
        id: "demo-2",
        title: "Upcoming events",
        content: "- Peer coaching circle, Zürich — 12 March\n- Romandie meetup, Lausanne — 26 March",
        sources: [{ label: "Chapter events", url: "https://new.coachingfederation.ch/events" }],
      },
    ],
  },
};

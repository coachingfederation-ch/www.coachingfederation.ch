/**
 * React Email template asking a website visitor to confirm the message they
 * prepared with the contact assistant. Exports: template. Registered in
 * registry.ts. Nothing reaches the office before this link is clicked.
 */
import * as React from "react";
import {
  Body,
  Button,
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
import { CONTACT_EMAIL_COPY, fill } from "./contact-enquiry-copy";
import type { EmailTemplateData, TemplateEntry } from "./registry";
import {
  banner,
  bannerText,
  button,
  container,
  content,
  headingStyle,
  link,
  main,
  muted,
  paragraph,
  quote,
  quoteText,
  row,
} from "./contact-enquiry-styles";

export interface ContactVerifyProps {
  locale?: Locale;
  name?: string;
  subject?: string;
  body?: string;
  confirmUrl?: string;
}

const copyFor = (locale?: Locale) => CONTACT_EMAIL_COPY[locale ?? "en"] ?? CONTACT_EMAIL_COPY.en;

const Email = ({
  locale = "en",
  name = "",
  subject = "",
  body = "",
  confirmUrl = "",
}: ContactVerifyProps) => {
  const copy = copyFor(locale);
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{copy.verifyPreview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>{copy.verifyBanner}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{copy.verifyHeading}</Heading>
            <Text style={paragraph}>{fill(copy.verifyIntro, { name })}</Text>
            <Text style={row}>
              <strong>{copy.subjectLabel}:</strong> {subject}
            </Text>
            <Section style={quote}>
              <Text style={quoteText}>{body}</Text>
            </Section>
            <Section style={{ margin: "0 0 16px" }}>
              <Button href={confirmUrl} style={button}>
                {copy.verifyButton}
              </Button>
            </Section>
            <Text style={muted}>
              {copy.verifyFallback}{" "}
              <Link href={confirmUrl} style={link}>
                {confirmUrl}
              </Link>
            </Text>
            <Text style={muted}>{copy.verifyIgnore}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    copyFor(data["locale"] as Locale | undefined).verifySubject,
  displayName: "Contact enquiry — confirm",
  previewData: {
    locale: "en",
    name: "Anna Muster",
    subject: "Finding a credentialed coach in Zürich",
    body: "I am looking for a credentialed coach in Zürich who works in German and English.",
    confirmUrl: "https://new.coachingfederation.ch/contact/confirm/example-token",
  },
};

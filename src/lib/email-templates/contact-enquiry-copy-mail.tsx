/**
 * React Email template giving the visitor a copy of the message that just went
 * to the chapter office. Exports: template. Registered in registry.ts as
 * "contact-enquiry-copy".
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
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
  container,
  content,
  headingStyle,
  main,
  muted,
  paragraph,
  quote,
  quoteText,
  row,
} from "./contact-enquiry-styles";

export interface ContactCopyProps {
  locale?: Locale;
  name?: string;
  subject?: string;
  body?: string;
}

const copyFor = (locale?: Locale) => CONTACT_EMAIL_COPY[locale ?? "en"] ?? CONTACT_EMAIL_COPY.en;

const Email = ({ locale = "en", name = "", subject = "", body = "" }: ContactCopyProps) => {
  const copy = copyFor(locale);
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{copy.copyPreview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>{copy.copyBanner}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{copy.copyHeading}</Heading>
            <Text style={paragraph}>{fill(copy.copyIntro, { name })}</Text>
            <Text style={row}>
              <strong>{copy.subjectLabel}:</strong> {subject}
            </Text>
            <Section style={quote}>
              <Text style={quoteText}>{body}</Text>
            </Section>
            <Text style={muted}>{copy.copyClosing}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) => copyFor(data["locale"] as Locale | undefined).copySubject,
  displayName: "Contact enquiry — visitor copy",
  previewData: {
    locale: "en",
    name: "Anna Muster",
    subject: "Finding a credentialed coach in Zürich",
    body: "I am looking for a credentialed coach in Zürich who works in German and English.",
  },
};

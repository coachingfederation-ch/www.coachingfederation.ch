/**
 * React Email template delivering a confirmed website enquiry to the chapter
 * office. Exports: template. Registered in registry.ts.
 *
 * The recipient is passed by the caller (the office address lives in
 * contact-agent.server.ts), and reply-to is the visitor, so a reply in the
 * office inbox goes straight back to them.
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
import { CONTACT_EMAIL_COPY, fill } from "./contact-enquiry-copy";
import type { EmailTemplateData, TemplateEntry } from "./registry";
import {
  banner,
  bannerText,
  container,
  content,
  headingStyle,
  link,
  main,
  paragraph,
  quote,
  quoteText,
  row,
} from "./contact-enquiry-styles";

export interface ContactEnquiryProps {
  locale?: Locale;
  name?: string;
  email?: string;
  subject?: string;
  body?: string;
}

const copyFor = (locale?: Locale) => CONTACT_EMAIL_COPY[locale ?? "en"] ?? CONTACT_EMAIL_COPY.en;

const Email = ({
  locale = "en",
  name = "",
  email = "",
  subject = "",
  body = "",
}: ContactEnquiryProps) => {
  const copy = copyFor(locale);
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{fill(copy.officePreview, { name })}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>{copy.officeBanner}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{copy.officeHeading}</Heading>
            <Text style={paragraph}>{copy.officeIntro}</Text>
            <Text style={row}>
              <strong>{copy.nameLabel}:</strong> {name}
            </Text>
            <Text style={row}>
              <strong>{copy.emailLabel}:</strong>{" "}
              <Link href={`mailto:${email}`} style={link}>
                {email}
              </Link>
            </Text>
            <Text style={row}>
              <strong>{copy.subjectLabel}:</strong> {subject}
            </Text>
            <Section style={quote}>
              <Text style={quoteText}>{body}</Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) =>
    fill(copyFor(data["locale"] as Locale | undefined).officeSubject, {
      subject: (data["subject"] as string) || "Website enquiry",
    }),
  displayName: "Contact enquiry — office",
  previewData: {
    locale: "en",
    name: "Anna Muster",
    email: "anna.muster@example.com",
    subject: "Finding a credentialed coach in Zürich",
    body: "I am looking for a credentialed coach in Zürich who works in German and English.",
  },
};

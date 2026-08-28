/**
 * React Email template inviting a guest to complete their own Guest Pass.
 * Exports: template. Registered in registry.ts.
 *
 * Guest-facing, so it is written in the event's language. The claim link is
 * the credential: it goes to the guest's address only, never to the member.
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
import type { Locale } from "@/i18n/config";
import type { EmailTemplateData, TemplateEntry } from "./registry";

export interface GuestPassInviteProps {
  locale?: Locale;
  guestName?: string;
  invitingMemberName?: string;
  eventTitle?: string;
  eventStartsAt?: string | null;
  claimUrl?: string;
}

type Copy = {
  banner: string;
  subject: string;
  heading: string;
  intro: (member: string, event: string) => string;
  when: string;
  body: string;
  cta: string;
  closing: string;
};

const LOCALES: Record<Locale, Copy> = {
  en: {
    banner: "Guest pass",
    subject: "You are invited as a guest",
    heading: "You are invited to join us",
    intro: (member, event) => `${member} would like to bring you to ${event} as their guest.`,
    when: "When",
    body: "Please take a minute to complete your details. Membership & Engagement reviews every Guest Pass and confirms by email.",
    cta: "Complete my details",
    closing:
      "This link is personal and can be used once. Questions? Write to office@coachingfederation.ch.",
  },
  de: {
    banner: "Gastkarte",
    subject: "Sie sind als Gast eingeladen",
    heading: "Sie sind eingeladen",
    intro: (member, event) => `${member} möchte Sie als Gast zu ${event} mitbringen.`,
    when: "Wann",
    body: "Bitte nehmen Sie sich eine Minute Zeit und ergänzen Sie Ihre Angaben. Membership & Engagement prüft jede Gastkarte und bestätigt per E-Mail.",
    cta: "Angaben ergänzen",
    closing:
      "Dieser Link ist persönlich und einmalig nutzbar. Fragen? Schreiben Sie an office@coachingfederation.ch.",
  },
  fr: {
    banner: "Pass invité",
    subject: "Vous êtes invité comme hôte",
    heading: "Vous êtes invité à nous rejoindre",
    intro: (member, event) => `${member} souhaite vous emmener à ${event} en tant qu'invité.`,
    when: "Quand",
    body: "Merci de prendre une minute pour compléter vos informations. Membership & Engagement examine chaque pass invité et confirme par e-mail.",
    cta: "Compléter mes informations",
    closing:
      "Ce lien est personnel et utilisable une seule fois. Des questions ? Écrivez à office@coachingfederation.ch.",
  },
  it: {
    banner: "Pass ospite",
    subject: "Sei invitato come ospite",
    heading: "Sei invitato a unirti a noi",
    intro: (member, event) => `${member} desidera portarti a ${event} come suo ospite.`,
    when: "Quando",
    body: "Ti chiediamo un minuto per completare i tuoi dati. Membership & Engagement esamina ogni pass ospite e conferma via e-mail.",
    cta: "Completa i miei dati",
    closing:
      "Questo link è personale e utilizzabile una sola volta. Domande? Scrivi a office@coachingfederation.ch.",
  },
};

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

const formatDate = (value: string | null | undefined, locale: Locale) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(LOCALE_TAGS[locale], { dateStyle: "full", timeStyle: "short" });
};

const Email = ({
  locale = "en",
  guestName = "",
  invitingMemberName = "",
  eventTitle = "",
  eventStartsAt = null,
  claimUrl = "",
}: GuestPassInviteProps) => {
  const copy = LOCALES[locale] ?? LOCALES.en;
  const when = formatDate(eventStartsAt, locale);
  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{copy.subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Text style={bannerText}>{copy.banner}</Text>
          </Section>
          <Section style={content}>
            <Heading style={headingStyle}>{copy.heading}</Heading>
            <Text style={paragraph}>
              {guestName ? `${guestName}, ` : ""}
              {copy.intro(invitingMemberName || "A member", eventTitle || "an event")}
            </Text>
            {when ? (
              <Text style={row}>
                <strong>{copy.when}:</strong> {when}
              </Text>
            ) : null}
            <Text style={paragraph}>{copy.body}</Text>
            {claimUrl ? (
              <Button href={claimUrl} style={button}>
                {copy.cta}
              </Button>
            ) : null}
            <Text style={muted}>{copy.closing}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template: TemplateEntry = {
  component: Email as unknown as TemplateEntry["component"],
  subject: (data: EmailTemplateData) => {
    const locale = (data["locale"] as Locale) ?? "en";
    return (LOCALES[locale] ?? LOCALES.en).subject;
  },
  displayName: "Guest pass invitation",
  previewData: {
    locale: "en",
    guestName: "Luca Beispiel",
    invitingMemberName: "Anna Muster",
    eventTitle: "Coaching in organisations",
    eventStartsAt: new Date().toISOString(),
    claimUrl: "https://new.coachingfederation.ch/guest-pass/example-token",
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
  backgroundColor: "#2B379B",
  borderRadius: "999px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 700,
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};

const muted = { fontSize: "13px", color: "#5b5f7a", lineHeight: "1.5", margin: "20px 0 0" };

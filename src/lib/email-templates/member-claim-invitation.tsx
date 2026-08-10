/**
 * React Email template for inviting members to claim their account.
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
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import logoNegativeAsset from "@/assets/icf-horizontal-negative.png.asset.json";
import { SITE_URL } from "@/i18n/config";
import logoWhiteAsset from "@/assets/icf-horizontal-white.png.asset.json";
import type { TemplateEntry } from "./registry";

/**
 * Member claim invitation — the only email that carries a claim link.
 *
 * Copy is localised in-file (the four chapter languages) because members have
 * no reliable UI locale at send time; the caller passes the locale it knows
 * about and anything unknown falls back to English rather than failing.
 */
export type ClaimLocale = "en" | "de" | "fr" | "it";

export interface MemberClaimInvitationProps {
  claimUrl?: string;
  baseUrl?: string;
  firstName?: string;
  expiresInDays?: number;
  isResend?: boolean;
  locale?: ClaimLocale;
}

const COPY: Record<ClaimLocale, Record<string, string>> = {
  en: {
    subject: "Activate your Member Area account",
    subjectResend: "Your new Member Area activation link",
    preview: "Set your password and activate your Member Area account.",
    heading: "Welcome, {firstName} — your membership is active",
    headingNoName: "Welcome — your membership is active",
    greeting: "Hello",
    greetingPlain: "Hello",
    intro:
      "Congratulations, and a warm welcome to the Switzerland Chapter of ICF. You are now part of a community of coaches across Switzerland committed to professional excellence in coaching.",
    resendIntro:
      "Here is a new activation link for your Member Area account. Any earlier link no longer works.",
    accountReady: "Your Member Area account is ready. Set your password to:",
    benefitProfile: "Complete your member profile",
    benefitDirectory: "Publish your listing in our public coach directory, so clients can find you",
    benefitEngage:
      "Find your way to our community platform ICF Engage and discover ways to volunteer with the chapter",
    cta: "Set my password",
    expiry: "This link works once and expires in {days} days.",
    fallback: "If the button does not work, copy this address into your browser:",
    help: "Trouble signing up? Write to us at office@coachingfederation.ch and we will help you get set up.",
    closing: "We look forward to seeing you at our events and in the community.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
    ignore: "If you were not expecting this email, you can safely ignore it.",
  },
  de: {
    subject: "Aktivieren Sie Ihr Mitgliederbereich-Konto",
    subjectResend: "Ihr neuer Aktivierungslink für den Mitgliederbereich",
    preview: "Passwort setzen und Ihr Mitgliederbereich-Konto aktivieren.",
    heading: "Willkommen, {firstName} — Ihre Mitgliedschaft ist aktiv",
    headingNoName: "Willkommen — Ihre Mitgliedschaft ist aktiv",
    greeting: "Hallo",
    greetingPlain: "Hallo",
    intro:
      "Herzlichen Glückwunsch und ein herzliches Willkommen bei der Switzerland Chapter of ICF. Sie sind jetzt Teil einer Gemeinschaft von Coaches in der Schweiz, die sich der professionellen Exzellenz im Coaching verpflichtet haben.",
    resendIntro:
      "Hier ist ein neuer Aktivierungslink für Ihr Mitgliederbereich-Konto. Frühere Links sind nicht mehr gültig.",
    accountReady: "Ihr Konto im Mitgliederbereich ist bereit. Setzen Sie Ihr Passwort, um:",
    benefitProfile: "Ihr Mitgliederprofil zu vervollständigen",
    benefitDirectory:
      "Ihre Eintragung in unserem öffentlichen Coach-Verzeichnis zu veröffentlichen, damit Klient:innen Sie finden",
    benefitEngage:
      "Sich auf unserer Community-Plattform ICF Engage zurechtzufinden und Engagement-Möglichkeiten im Chapter zu entdecken",
    cta: "Passwort setzen",
    expiry: "Dieser Link funktioniert einmal und läuft in {days} Tagen ab.",
    fallback: "Falls die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:",
    help: "Probleme bei der Anmeldung? Schreiben Sie uns an office@coachingfederation.ch – wir helfen Ihnen gerne.",
    closing: "Wir freuen uns darauf, Sie bei unseren Veranstaltungen und in der Community zu sehen.",
    signoff: "Mit freundlichen Grüßen,\nThe Switzerland Chapter of ICF",
    ignore: "Wenn Sie diese E-Mail nicht erwartet haben, können Sie sie ignorieren.",
  },
  fr: {
    subject: "Activez votre compte de l’espace membre",
    subjectResend: "Votre nouveau lien d’activation de l’espace membre",
    preview: "Définissez votre mot de passe et activez votre compte membre.",
    heading: "Bienvenue, {firstName} — votre adhésion est active",
    headingNoName: "Bienvenue — votre adhésion est active",
    greeting: "Bonjour",
    greetingPlain: "Bonjour",
    intro:
      "Félicitations et bienvenue chaleureuse à la Switzerland Chapter of ICF. Vous faites désormais partie d’une communauté de coaches en Suisse engagés pour l’excellence professionnelle en coaching.",
    resendIntro:
      "Voici un nouveau lien d’activation pour votre compte membre. Les liens précédents ne fonctionnent plus.",
    accountReady: "Votre compte de l’espace membre est prêt. Définissez votre mot de passe pour :",
    benefitProfile: "Compléter votre profil membre",
    benefitDirectory:
      "Publier votre fiche dans notre annuaire public de coaches, afin que les clients puissent vous trouver",
    benefitEngage:
      "Trouver votre chemin sur notre plateforme communautaire ICF Engage et découvrir les façons de vous engager auprès du chapter",
    cta: "Définir mon mot de passe",
    expiry: "Ce lien est à usage unique et expire dans {days} jours.",
    fallback: "Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :",
    help: "Des difficultés pour vous inscrire ? Écrivez-nous à office@coachingfederation.ch et nous vous aiderons.",
    closing: "Nous avons hâte de vous voir lors de nos événements et au sein de la communauté.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
    ignore: "Si vous n’attendiez pas cet e-mail, vous pouvez l’ignorer.",
  },
  it: {
    subject: "Attiva il tuo account dell’area soci",
    subjectResend: "Il tuo nuovo link di attivazione dell’area soci",
    preview: "Imposta la password e attiva il tuo account dell’area soci.",
    heading: "Benvenuto/a, {firstName} — la tua membership è attiva",
    headingNoName: "Benvenuto/a — la tua membership è attiva",
    greeting: "Ciao",
    greetingPlain: "Ciao",
    intro:
      "Congratulazioni e un caloroso benvenuto alla Switzerland Chapter of ICF. Ora fai parte di una comunità di coach in Svizzera impegnata per l’eccellenza professionale nel coaching.",
    resendIntro:
      "Ecco un nuovo link di attivazione per il tuo account. I link precedenti non sono più validi.",
    accountReady: "Il tuo account dell’area soci è pronto. Imposta la password per:",
    benefitProfile: "Completare il tuo profilo membro",
    benefitDirectory:
      "Pubblicare la tua scheda nella nostra directory pubblica di coach, così i clienti possono trovarti",
    benefitEngage:
      "Orientarti nella nostra piattaforma community ICF Engage e scoprire come offrire il tuo volontariato al chapter",
    cta: "Imposta la password",
    expiry: "Questo link è monouso e scade tra {days} giorni.",
    fallback: "Se il pulsante non funziona, copia questo indirizzo nel browser:",
    help: "Problemi con l’iscrizione? Scrivici a office@coachingfederation.ch e ti aiuteremo a configurare tutto.",
    closing: "Non vediamo l’ora di incontrarti ai nostri eventi e nella community.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
    ignore: "Se non ti aspettavi questa e-mail, puoi ignorarla.",
  },
};

function copyFor(locale?: string) {
  return COPY[(locale as ClaimLocale) in COPY ? (locale as ClaimLocale) : "en"];
}

/**
 * Build a fully-qualified asset URL. Email clients and the dashboard preview
 * cannot resolve root-relative paths, so we always fall back to the public
 * site origin when the caller does not pass one.
 */
const DEFAULT_ASSET_BASE = SITE_URL;

function assetUrl(path: string, baseUrl?: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const root = (baseUrl || DEFAULT_ASSET_BASE).replace(/\/$/, "");
  return `${root}${path}`;
}

const BrushUnderline = () => (
  <svg
    width="100%"
    height="12"
    viewBox="0 0 400 12"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path
      d="M0,8 Q100,2 200,8 T400,6 L400,12 L0,12 Z"
      fill="#5778FA"
      fillOpacity="0.35"
    />
  </svg>
);

const Email = ({
  claimUrl = "https://coachingfederation.ch/claim",
  baseUrl,
  firstName,
  expiresInDays = 7,
  isResend = false,
  locale = "en",
}: MemberClaimInvitationProps) => {
  const c = copyFor(locale);
  const heading = firstName
    ? (c["heading"] as string).replace("{firstName}", firstName)
    : (c["headingNoName"] as string);
  const logo = assetUrl(logoNegativeAsset.url, baseUrl);
  const logoWhite = assetUrl(logoWhiteAsset.url, baseUrl);

  return (
    <Html lang={locale} dir="ltr">
      <Head />
      <Preview>{c["preview"] as string}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Banner with logo */}
          <Section style={banner}>
            <div style={bannerInner}>
              <Img
                src={logo}
                alt="The Switzerland Chapter of ICF"
                width={210}
                height={79}
                style={logoStyle}
              />
              <span style={bannerTag}>Member Invitation</span>
            </div>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading style={headingStyle}>{heading}</Heading>
            <div style={{ marginBottom: "24px" }}>
              <BrushUnderline />
            </div>

            <Text style={lede}>
              {isResend ? c["resendIntro"] : c["intro"]}
            </Text>
            <Text style={accountReady}>{c["accountReady"]}</Text>

            <div style={benefits}>
              <div style={benefitRow}>
                <span style={benefitDot} />
                <Text style={benefitText}>{c["benefitProfile"]}</Text>
              </div>
              <div style={benefitRow}>
                <span style={benefitDot} />
                <Text style={benefitText}>{c["benefitDirectory"]}</Text>
              </div>
              <div style={benefitRow}>
                <span style={benefitDot} />
                <Text style={benefitText}>{c["benefitEngage"]}</Text>
              </div>
            </div>

            <Section style={{ margin: "32px 0" }}>
              <Button style={button} href={claimUrl}>
                {c["cta"]} →
              </Button>
            </Section>

            <Text style={muted}>
              {(c["expiry"] as string).replace("{days}", String(expiresInDays))}
            </Text>
            <Text style={muted}>{c["fallback"]}</Text>
            <Text style={urlText}>
              <Link href={claimUrl} style={{ color: "#2B379B" }}>
                {claimUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            <Text style={closing}>{c["help"]}</Text>
            <Text style={closing}>{c["closing"]}</Text>
            <Text style={signoff}>{c["signoff"]}</Text>
            <Text style={ignore}>{c["ignore"]}</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Img
              src={logoWhite}
              alt="The Switzerland Chapter of ICF"
              width={150}
              height={56}
              style={footerLogoStyle}
            />
            <Text style={footerText}>
              © {new Date().getFullYear()} The Switzerland Chapter of ICF
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const c = copyFor(data["locale"]);
    return (data["isResend"] ? c["subjectResend"] : c["subject"]) as string;
  },
  displayName: "Member claim invitation",
  previewData: {
    claimUrl: "https://coachingfederation.ch/claim/exampletoken",
    baseUrl: DEFAULT_ASSET_BASE,
    firstName: "Anna",
    expiresInDays: 7,
    locale: "en",
  },
} satisfies TemplateEntry;

const main = {
  backgroundColor: "#F8F0E4",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
  backgroundColor: "#F8F0E4",
  maxWidth: "600px",
  borderRadius: "4px",
  overflow: "hidden",
};

const banner = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  borderBottom: "4px solid #5778FA",
};

const bannerInner = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoStyle = {
  display: "block",
  outline: "none",
  border: "none",
  textDecoration: "none",
};

const bannerTag = {
  color: "#5778FA",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const content = {
  padding: "40px 32px",
};

const headingStyle = {
  fontSize: "28px",
  color: "#212251",
  lineHeight: "1.2",
  margin: "0 0 8px",
  fontWeight: 700,
};

const lede = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const accountReady = {
  fontSize: "16px",
  color: "#212251",
  lineHeight: "1.6",
  fontWeight: 700,
  margin: "0 0 16px",
};

const benefits = {
  marginBottom: "32px",
};

const benefitRow = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "12px",
};

const benefitDot = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#2B379B",
  marginTop: "8px",
  marginRight: "12px",
  flexShrink: 0,
} as const;

const benefitText = {
  fontSize: "15px",
  color: "#212251",
  lineHeight: "1.5",
  margin: 0,
};

const button = {
  backgroundColor: "#5778FA",
  color: "#ffffff",
  borderRadius: "4px",
  padding: "16px 32px",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
};

const muted = {
  fontSize: "13px",
  color: "#5b5f78",
  lineHeight: "1.6",
  margin: "0 0 8px",
};

const urlText = {
  fontSize: "13px",
  margin: "0 0 8px",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e6e3dc",
  margin: "28px 0 16px",
};

const closing = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const signoff = {
  fontSize: "14px",
  color: "#212251",
  lineHeight: "1.6",
  margin: "0 0 24px",
  whiteSpace: "pre-line" as const,
};

const ignore = {
  fontSize: "12px",
  color: "#5b5f78",
  lineHeight: "1.5",
  margin: 0,
};

const footer = {
  backgroundColor: "#212251",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#ffffff",
  opacity: 0.6,
  margin: 0,
};

const footerLogoStyle = {
  display: "block",
  margin: "0 auto 12px",
  outline: "none",
  border: "none",
};

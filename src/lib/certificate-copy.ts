/**
 * Copy for the public certificate verification page (/verify/certificate/$token).
 *
 * The page sits outside the localized route tree — people arrive from a
 * printed QR code or an email link, not from the site navigation — so the
 * strings live here rather than in the locale-routed catalogs. All four
 * chapter languages ship; the page never falls back to English chrome.
 */
import { LOCALES, isLocale, type Locale } from "@/i18n/config";

export type CertificateCopy = {
  eyebrow: string;
  validBadge: string;
  title: string;
  intro: string;
  holderLabel: string;
  eventLabel: string;
  dateLabel: string;
  serialLabel: string;
  hoursLabel: string;
  ccHours: string;
  rdHours: string;
  attendanceOnly: string;
  issuerLabel: string;
  issuer: string;
  verifyNote: string;
  print: string;
  revokedTitle: string;
  revokedBody: string;
  unknownTitle: string;
  unknownBody: string;
  languageLabel: string;
};

const COPY: Record<Locale, CertificateCopy> = {
  en: {
    eyebrow: "Certificate of completion",
    validBadge: "Valid certificate",
    title: "Certificate of completion",
    intro: "This certifies attendance at the event named below.",
    holderLabel: "Awarded to",
    eventLabel: "Event",
    dateLabel: "Completed on",
    serialLabel: "Certificate number",
    hoursLabel: "Continuing Coach Education",
    ccHours: "{hours} Core Competency hours",
    rdHours: "{hours} Resource Development hours",
    attendanceOnly: "Attendance",
    issuerLabel: "Issued by",
    issuer: "The Switzerland Chapter of ICF",
    verifyNote: "Scan the code to verify this certificate.",
    print: "Print this certificate",
    revokedTitle: "This certificate is not valid",
    revokedBody:
      "It has been withdrawn. Write to office@coachingfederation.ch if you believe this is a mistake.",
    unknownTitle: "This certificate could not be found",
    unknownBody:
      "The link may be incomplete. Write to office@coachingfederation.ch and we will help.",
    languageLabel: "Language",
  },
  de: {
    eyebrow: "Teilnahmebestätigung",
    validBadge: "Gültige Bestätigung",
    title: "Teilnahmebestätigung",
    intro: "Hiermit wird die Teilnahme an der unten genannten Veranstaltung bestätigt.",
    holderLabel: "Ausgestellt für",
    eventLabel: "Veranstaltung",
    dateLabel: "Abgeschlossen am",
    serialLabel: "Bestätigungsnummer",
    hoursLabel: "Continuing Coach Education",
    ccHours: "{hours} Stunden Core Competency",
    rdHours: "{hours} Stunden Resource Development",
    attendanceOnly: "Teilnahme",
    issuerLabel: "Ausgestellt von",
    issuer: "The Switzerland Chapter of ICF",
    verifyNote: "Scannen Sie den Code, um diese Bestätigung zu prüfen.",
    print: "Bestätigung drucken",
    revokedTitle: "Diese Bestätigung ist nicht gültig",
    revokedBody:
      "Sie wurde zurückgezogen. Schreiben Sie an office@coachingfederation.ch, falls das ein Irrtum ist.",
    unknownTitle: "Diese Bestätigung wurde nicht gefunden",
    unknownBody:
      "Der Link ist möglicherweise unvollständig. Schreiben Sie an office@coachingfederation.ch, wir helfen weiter.",
    languageLabel: "Sprache",
  },
  fr: {
    eyebrow: "Attestation de participation",
    validBadge: "Attestation valable",
    title: "Attestation de participation",
    intro: "Ce document atteste la participation à l'événement indiqué ci-dessous.",
    holderLabel: "Délivrée à",
    eventLabel: "Événement",
    dateLabel: "Terminé le",
    serialLabel: "Numéro d'attestation",
    hoursLabel: "Continuing Coach Education",
    ccHours: "{hours} heures Core Competency",
    rdHours: "{hours} heures Resource Development",
    attendanceOnly: "Participation",
    issuerLabel: "Délivrée par",
    issuer: "The Switzerland Chapter of ICF",
    verifyNote: "Scannez le code pour vérifier cette attestation.",
    print: "Imprimer l'attestation",
    revokedTitle: "Cette attestation n'est pas valable",
    revokedBody:
      "Elle a été retirée. Écrivez à office@coachingfederation.ch si vous pensez qu'il s'agit d'une erreur.",
    unknownTitle: "Cette attestation est introuvable",
    unknownBody:
      "Le lien est peut-être incomplet. Écrivez à office@coachingfederation.ch et nous vous aiderons.",
    languageLabel: "Langue",
  },
  it: {
    eyebrow: "Attestato di partecipazione",
    validBadge: "Attestato valido",
    title: "Attestato di partecipazione",
    intro: "Il presente documento attesta la partecipazione all'evento indicato di seguito.",
    holderLabel: "Rilasciato a",
    eventLabel: "Evento",
    dateLabel: "Completato il",
    serialLabel: "Numero attestato",
    hoursLabel: "Continuing Coach Education",
    ccHours: "{hours} ore Core Competency",
    rdHours: "{hours} ore Resource Development",
    attendanceOnly: "Partecipazione",
    issuerLabel: "Rilasciato da",
    issuer: "The Switzerland Chapter of ICF",
    verifyNote: "Scansiona il codice per verificare questo attestato.",
    print: "Stampa l'attestato",
    revokedTitle: "Questo attestato non è valido",
    revokedBody:
      "È stato ritirato. Scrivi a office@coachingfederation.ch se ritieni si tratti di un errore.",
    unknownTitle: "Attestato non trovato",
    unknownBody:
      "Il link potrebbe essere incompleto. Scrivi a office@coachingfederation.ch e ti aiuteremo.",
    languageLabel: "Lingua",
  },
};

export const CERTIFICATE_LOCALES = LOCALES;

export function certificateCopy(locale: string | null | undefined): CertificateCopy {
  return isLocale(locale) ? COPY[locale] : COPY.en;
}

export function fillCopy(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

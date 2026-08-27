/**
 * Copy for the certificate email, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles for the same reason as the
 * confirmation copy: the mail is rendered server-side from the locale stored
 * on the certificate, with no UI language context to read.
 */
import type { Locale } from "@/i18n/config";

export type CertificateEmailCopy = {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  introAttendance: string;
  introHours: string;
  serialLabel: string;
  eventLabel: string;
  dateLabel: string;
  button: string;
  printNote: string;
  questions: string;
  signoff: string;
  bannerTag: string;
  revokedSubject: string;
  revokedPreview: string;
  revokedHeading: string;
  revokedIntro: string;
};

export const CERTIFICATE_EMAIL_COPY: Record<Locale, CertificateEmailCopy> = {
  en: {
    subject: "Your certificate: {title}",
    preview: "Your certificate of completion is ready.",
    heading: "Your certificate is ready",
    greeting: "Hello {name}",
    introAttendance: "We have recorded your attendance at this event.",
    introHours: "We have recorded your attendance at this event: {hours}.",
    serialLabel: "Certificate number",
    eventLabel: "Event",
    dateLabel: "Completed on",
    button: "View and print your certificate",
    printNote: "The page prints on one A4 sheet, and the link stays valid.",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
    bannerTag: "Certificate",
    revokedSubject: "Your certificate has been withdrawn: {title}",
    revokedPreview: "This certificate is no longer valid.",
    revokedHeading: "Your certificate has been withdrawn",
    revokedIntro: "This certificate is no longer valid. Write to us if you have any questions.",
  },
  de: {
    subject: "Ihre Teilnahmebestätigung: {title}",
    preview: "Ihre Teilnahmebestätigung ist bereit.",
    heading: "Ihre Bestätigung ist bereit",
    greeting: "Hallo {name}",
    introAttendance: "Wir haben Ihre Teilnahme an dieser Veranstaltung erfasst.",
    introHours: "Wir haben Ihre Teilnahme an dieser Veranstaltung erfasst: {hours}.",
    serialLabel: "Bestätigungsnummer",
    eventLabel: "Veranstaltung",
    dateLabel: "Abgeschlossen am",
    button: "Bestätigung ansehen und drucken",
    printNote: "Die Seite passt auf ein A4-Blatt, und der Link bleibt gültig.",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Herzliche Grüsse,\nThe Switzerland Chapter of ICF",
    bannerTag: "Bestätigung",
    revokedSubject: "Ihre Bestätigung wurde zurückgezogen: {title}",
    revokedPreview: "Diese Bestätigung ist nicht mehr gültig.",
    revokedHeading: "Ihre Bestätigung wurde zurückgezogen",
    revokedIntro:
      "Diese Bestätigung ist nicht mehr gültig. Schreiben Sie uns bei Fragen jederzeit.",
  },
  fr: {
    subject: "Votre attestation : {title}",
    preview: "Votre attestation de participation est prête.",
    heading: "Votre attestation est prête",
    greeting: "Bonjour {name}",
    introAttendance: "Nous avons enregistré votre participation à cet événement.",
    introHours: "Nous avons enregistré votre participation à cet événement : {hours}.",
    serialLabel: "Numéro d'attestation",
    eventLabel: "Événement",
    dateLabel: "Terminé le",
    button: "Voir et imprimer votre attestation",
    printNote: "La page tient sur une feuille A4, et le lien reste valable.",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
    bannerTag: "Attestation",
    revokedSubject: "Votre attestation a été retirée : {title}",
    revokedPreview: "Cette attestation n'est plus valable.",
    revokedHeading: "Votre attestation a été retirée",
    revokedIntro:
      "Cette attestation n'est plus valable. Écrivez-nous si vous avez des questions.",
  },
  it: {
    subject: "Il tuo attestato: {title}",
    preview: "Il tuo attestato di partecipazione è pronto.",
    heading: "Il tuo attestato è pronto",
    greeting: "Ciao {name}",
    introAttendance: "Abbiamo registrato la tua partecipazione a questo evento.",
    introHours: "Abbiamo registrato la tua partecipazione a questo evento: {hours}.",
    serialLabel: "Numero attestato",
    eventLabel: "Evento",
    dateLabel: "Completato il",
    button: "Visualizza e stampa il tuo attestato",
    printNote: "La pagina si stampa su un foglio A4 e il link resta valido.",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
    bannerTag: "Attestato",
    revokedSubject: "Il tuo attestato è stato ritirato: {title}",
    revokedPreview: "Questo attestato non è più valido.",
    revokedHeading: "Il tuo attestato è stato ritirato",
    revokedIntro: "Questo attestato non è più valido. Scrivici per qualsiasi domanda.",
  },
};

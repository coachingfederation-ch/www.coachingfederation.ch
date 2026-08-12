/**
 * Copy for the post-event follow-up invitation, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles because the email is
 * rendered server-side from the locale stored on the registration — there is
 * no UI language context at send time.
 */
import type { Locale } from "@/i18n/config";

export type FollowUpCopy = {
  subject: string;
  subjectReminder: string;
  preview: string;
  heading: string;
  headingReminder: string;
  greeting: string;
  introDefault: string;
  effort: string;
  cta: string;
  fallback: string;
  signoff: string;
};

export const FOLLOW_UP_COPY: Record<Locale, FollowUpCopy> = {
  en: {
    subject: "How was {title}?",
    subjectReminder: "A reminder: how was {title}?",
    preview: "A few short questions about the event you attended.",
    heading: "Tell us how it went",
    headingReminder: "Still a moment for us?",
    greeting: "Hello {name}",
    introDefault:
      "Thank you for joining us. A few short questions would help us make the next event better.",
    effort: "It takes about two minutes and your answers stay with the chapter.",
    cta: "Answer the questions",
    fallback: "If the button does not work, open this link: {url}",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
  },
  de: {
    subject: "Wie war {title}?",
    subjectReminder: "Erinnerung: Wie war {title}?",
    preview: "Ein paar kurze Fragen zum Anlass, an dem Sie teilgenommen haben.",
    heading: "Erzählen Sie uns, wie es war",
    headingReminder: "Haben Sie noch einen Moment?",
    greeting: "Hallo {name}",
    introDefault:
      "Danke, dass Sie dabei waren. Ein paar kurze Fragen helfen uns, den nächsten Anlass besser zu machen.",
    effort: "Es dauert rund zwei Minuten, und Ihre Antworten bleiben beim Chapter.",
    cta: "Fragen beantworten",
    fallback: "Falls die Schaltfläche nicht funktioniert, öffnen Sie diesen Link: {url}",
    signoff: "Herzliche Grüsse\nThe Switzerland Chapter of ICF",
  },
  fr: {
    subject: "Comment avez-vous vécu {title} ?",
    subjectReminder: "Rappel : comment avez-vous vécu {title} ?",
    preview: "Quelques questions brèves sur l'événement auquel vous avez participé.",
    heading: "Dites-nous comment cela s'est passé",
    headingReminder: "Avez-vous encore un instant ?",
    greeting: "Bonjour {name}",
    introDefault:
      "Merci d'avoir participé. Quelques questions brèves nous aideront à améliorer le prochain événement.",
    effort: "Cela prend environ deux minutes et vos réponses restent au sein du chapitre.",
    cta: "Répondre aux questions",
    fallback: "Si le bouton ne fonctionne pas, ouvrez ce lien : {url}",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
  },
  it: {
    subject: "Com'è andata {title}?",
    subjectReminder: "Promemoria: com'è andata {title}?",
    preview: "Alcune brevi domande sull'evento a cui hai partecipato.",
    heading: "Raccontaci com'è andata",
    headingReminder: "Hai ancora un momento?",
    greeting: "Ciao {name}",
    introDefault:
      "Grazie per aver partecipato. Alcune brevi domande ci aiutano a migliorare il prossimo evento.",
    effort: "Bastano circa due minuti e le tue risposte restano al chapter.",
    cta: "Rispondi alle domande",
    fallback: "Se il pulsante non funziona, apri questo link: {url}",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
  },
};
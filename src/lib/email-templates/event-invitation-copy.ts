/**
 * Copy for the personal event invitation, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles because the email is
 * rendered server-side from the locale stored on the invitation — there is no
 * UI language context at send time.
 */
import type { Locale } from "@/i18n/config";

export type InvitationCopy = {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  personal: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  cta: string;
  fallback: string;
  questions: string;
  signoff: string;
};

export const INVITATION_COPY: Record<Locale, InvitationCopy> = {
  en: {
    subject: "You are invited: {title}",
    preview: "A personal invitation from The Switzerland Chapter of ICF.",
    heading: "You are invited",
    greeting: "Hello {name}",
    intro:
      "We would be glad to welcome you to this event, and have kept a place on the guest list for you.",
    personal:
      "This invitation is personal: the link below is yours alone and works once. Please do not pass it on.",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    cta: "Register for this event",
    fallback: "If the button does not work, open this link: {url}",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
  },
  de: {
    subject: "Ihre Einladung: {title}",
    preview: "Eine persönliche Einladung des Switzerland Chapter of ICF.",
    heading: "Sie sind eingeladen",
    greeting: "Hallo {name}",
    intro:
      "Wir würden uns freuen, Sie an diesem Anlass zu begrüssen, und haben einen Platz auf der Gästeliste für Sie reserviert.",
    personal:
      "Diese Einladung ist persönlich: Der Link unten gehört Ihnen allein und funktioniert einmal. Bitte geben Sie ihn nicht weiter.",
    detailsTitle: "Angaben zum Anlass",
    whenLabel: "Wann",
    locationLabel: "Wo",
    cta: "Für diesen Anlass anmelden",
    fallback: "Falls die Schaltfläche nicht funktioniert, öffnen Sie diesen Link: {url}",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Herzliche Grüsse,\nThe Switzerland Chapter of ICF",
  },
  fr: {
    subject: "Votre invitation : {title}",
    preview: "Une invitation personnelle du Switzerland Chapter of ICF.",
    heading: "Vous êtes invité·e",
    greeting: "Bonjour {name}",
    intro:
      "Nous serions heureux de vous accueillir à cet événement et vous avons réservé une place sur la liste des invités.",
    personal:
      "Cette invitation est personnelle : le lien ci-dessous n'appartient qu'à vous et fonctionne une seule fois. Merci de ne pas le transmettre.",
    detailsTitle: "Détails de l'événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    cta: "M'inscrire à cet événement",
    fallback: "Si le bouton ne fonctionne pas, ouvrez ce lien : {url}",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
  },
  it: {
    subject: "Il suo invito: {title}",
    preview: "Un invito personale dallo Switzerland Chapter of ICF.",
    heading: "Lei è invitato",
    greeting: "Buongiorno {name}",
    intro:
      "Saremmo lieti di accoglierla a questo evento e abbiamo riservato un posto per lei nella lista degli invitati.",
    personal:
      "Questo invito è personale: il link qui sotto è solo suo e funziona una volta sola. La preghiamo di non inoltrarlo.",
    detailsTitle: "Dettagli dell'evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    cta: "Iscrivermi a questo evento",
    fallback: "Se il pulsante non funziona, apra questo link: {url}",
    questions: "Domande? Ci scriva a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
  },
};

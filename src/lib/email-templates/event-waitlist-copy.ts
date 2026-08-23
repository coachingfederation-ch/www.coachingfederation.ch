/**
 * Copy for the waitlist invitation email, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles because the email is
 * rendered server-side from the locale stored on the waitlist entry — there is
 * no UI language context at send time.
 */
import type { Locale } from "@/i18n/config";

export type WaitlistCopy = {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  deadline: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  ticketLabel: string;
  cta: string;
  fallback: string;
  questions: string;
  signoff: string;
};

export const WAITLIST_COPY: Record<Locale, WaitlistCopy> = {
  en: {
    subject: "A place has opened up: {title}",
    preview: "A place has opened up. Your invitation is held until {deadline}.",
    heading: "A place has opened up",
    greeting: "Hello {name}",
    intro: "You asked to be told when a place became free at this event. One is now yours to take.",
    deadline:
      "This invitation is held for you until {deadline}. After that the place goes to the next person on the list.",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    ticketLabel: "Ticket",
    cta: "Take my place",
    fallback: "If the button does not work, open this link: {url}",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
  },
  de: {
    subject: "Ein Platz ist frei geworden: {title}",
    preview: "Ein Platz ist frei geworden. Ihre Einladung gilt bis {deadline}.",
    heading: "Ein Platz ist frei geworden",
    greeting: "Hallo {name}",
    intro:
      "Sie wollten erfahren, wenn bei diesem Anlass ein Platz frei wird. Jetzt ist einer für Sie da.",
    deadline:
      "Diese Einladung ist bis {deadline} für Sie reserviert. Danach geht der Platz an die nächste Person auf der Liste.",
    detailsTitle: "Angaben zum Anlass",
    whenLabel: "Wann",
    locationLabel: "Wo",
    ticketLabel: "Ticket",
    cta: "Platz übernehmen",
    fallback: "Falls die Schaltfläche nicht funktioniert, öffnen Sie diesen Link: {url}",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Herzliche Grüsse\nThe Switzerland Chapter of ICF",
  },
  fr: {
    subject: "Une place s'est libérée : {title}",
    preview: "Une place s'est libérée. Votre invitation est valable jusqu'au {deadline}.",
    heading: "Une place s'est libérée",
    greeting: "Bonjour {name}",
    intro:
      "Vous souhaitiez être averti·e dès qu'une place se libérerait pour cet événement. Elle est à vous.",
    deadline:
      "Cette invitation vous est réservée jusqu'au {deadline}. Ensuite, la place passe à la personne suivante sur la liste.",
    detailsTitle: "Détails de l'événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    ticketLabel: "Billet",
    cta: "Prendre ma place",
    fallback: "Si le bouton ne fonctionne pas, ouvrez ce lien : {url}",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
  },
  it: {
    subject: "Si è liberato un posto: {title}",
    preview: "Si è liberato un posto. Il tuo invito è valido fino al {deadline}.",
    heading: "Si è liberato un posto",
    greeting: "Ciao {name}",
    intro:
      "Avevi chiesto di essere avvisato quando si fosse liberato un posto per questo evento. Ora è tuo.",
    deadline:
      "Questo invito è riservato a te fino al {deadline}. Poi il posto passa alla persona successiva in lista.",
    detailsTitle: "Dettagli dell'evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    ticketLabel: "Biglietto",
    cta: "Prendi il posto",
    fallback: "Se il pulsante non funziona, apri questo link: {url}",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
  },
};

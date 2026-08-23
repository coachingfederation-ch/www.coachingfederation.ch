/**
 * Copy for the attendee reminder email, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles for the same reason as the
 * confirmation copy: the email is rendered server-side from the locale stored
 * on the registration, with no UI language context to read.
 */
import type { Locale } from "@/i18n/config";

export type ReminderCopy = {
  subjectWeek: string;
  subjectDay: string;
  previewWeek: string;
  previewDay: string;
  headingWeek: string;
  headingDay: string;
  greeting: string;
  introWeek: string;
  introDay: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  onlineLabel: string;
  ticketLabel: string;
  notesTitle: string;
  ticketTitle: string;
  ticketIntro: string;
  openTicket: string;
  cannotCome: string;
  viewEvent: string;
  questions: string;
  signoff: string;
};

export const REMINDER_COPY: Record<Locale, ReminderCopy> = {
  en: {
    subjectWeek: "One week to go: {title}",
    subjectDay: "Tomorrow: {title}",
    previewWeek: "Your event is one week away. Here are the details.",
    previewDay: "Your event is tomorrow. Here is everything you need.",
    headingWeek: "One week to go",
    headingDay: "See you tomorrow",
    greeting: "Hello {name}",
    introWeek: "Your place is confirmed. Here is a reminder of the details.",
    introDay: "Your event is tomorrow. Here is everything you need to join us.",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    onlineLabel: "Online link",
    ticketLabel: "Ticket",
    notesTitle: "Good to know",
    ticketTitle: "Your ticket",
    ticketIntro: "Show this code at the door. You can also open your ticket page.",
    openTicket: "Open my ticket",
    cannotCome:
      "If you can no longer come, please let us know at {email} so we can offer your place to someone else.",
    viewEvent: "View the event page",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
  },
  de: {
    subjectWeek: "Noch eine Woche: {title}",
    subjectDay: "Morgen: {title}",
    previewWeek: "Ihr Anlass findet in einer Woche statt. Hier sind die Details.",
    previewDay: "Ihr Anlass findet morgen statt. Hier finden Sie alles Wichtige.",
    headingWeek: "Noch eine Woche",
    headingDay: "Bis morgen",
    greeting: "Guten Tag {name}",
    introWeek: "Ihr Platz ist bestätigt. Hier eine Erinnerung an die Details.",
    introDay: "Ihr Anlass findet morgen statt. Hier finden Sie alles Wichtige.",
    detailsTitle: "Angaben zum Anlass",
    whenLabel: "Wann",
    locationLabel: "Wo",
    onlineLabel: "Online-Link",
    ticketLabel: "Ticket",
    notesTitle: "Gut zu wissen",
    ticketTitle: "Ihr Ticket",
    ticketIntro: "Zeigen Sie diesen Code am Eingang. Sie können auch Ihre Ticketseite öffnen.",
    openTicket: "Mein Ticket öffnen",
    cannotCome:
      "Falls Sie nicht mehr teilnehmen können, schreiben Sie uns bitte an {email}, damit wir Ihren Platz weitergeben können.",
    viewEvent: "Zur Anlassseite",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Herzliche Grüsse,\nThe Switzerland Chapter of ICF",
  },
  fr: {
    subjectWeek: "Dans une semaine : {title}",
    subjectDay: "Demain : {title}",
    previewWeek: "Votre événement a lieu dans une semaine. Voici les détails.",
    previewDay: "Votre événement a lieu demain. Voici l'essentiel.",
    headingWeek: "Dans une semaine",
    headingDay: "À demain",
    greeting: "Bonjour {name}",
    introWeek: "Votre place est confirmée. Voici un rappel des détails.",
    introDay: "Votre événement a lieu demain. Voici tout ce qu'il vous faut.",
    detailsTitle: "Détails de l'événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    onlineLabel: "Lien en ligne",
    ticketLabel: "Billet",
    notesTitle: "Bon à savoir",
    ticketTitle: "Votre billet",
    ticketIntro: "Présentez ce code à l'entrée. Vous pouvez aussi ouvrir la page de votre billet.",
    openTicket: "Ouvrir mon billet",
    cannotCome:
      "Si vous ne pouvez plus venir, écrivez-nous à {email} afin que nous puissions proposer votre place à quelqu'un d'autre.",
    viewEvent: "Voir la page de l'événement",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Avec nos cordiales salutations,\nThe Switzerland Chapter of ICF",
  },
  it: {
    subjectWeek: "Manca una settimana: {title}",
    subjectDay: "Domani: {title}",
    previewWeek: "Il tuo evento è tra una settimana. Ecco i dettagli.",
    previewDay: "Il tuo evento è domani. Ecco tutto l'essenziale.",
    headingWeek: "Manca una settimana",
    headingDay: "A domani",
    greeting: "Buongiorno {name}",
    introWeek: "Il tuo posto è confermato. Ecco un promemoria dei dettagli.",
    introDay: "Il tuo evento è domani. Ecco tutto ciò che ti serve.",
    detailsTitle: "Dettagli dell'evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    onlineLabel: "Link online",
    ticketLabel: "Biglietto",
    notesTitle: "Buono a sapersi",
    ticketTitle: "Il tuo biglietto",
    ticketIntro:
      "Mostra questo codice all'ingresso. Puoi anche aprire la pagina del tuo biglietto.",
    openTicket: "Apri il mio biglietto",
    cannotCome:
      "Se non puoi più partecipare, scrivici a {email} così possiamo offrire il tuo posto a qualcun altro.",
    viewEvent: "Vai alla pagina dell'evento",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
  },
};

/** Same tiny placeholder filler the confirmation copy uses. */
export function fillReminder(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

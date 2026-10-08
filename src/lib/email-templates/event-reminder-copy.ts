/**
 * Copy for the attendee reminder emails, in the four chapter languages.
 *
 * Three stages: the day before (full details), two hours before and 15 minutes
 * before (short, practical). Held here rather than in the app's i18n bundles
 * because the email is rendered server-side from the locale stored on the
 * registration, with no UI language context to read.
 */
import type { Locale } from "@/i18n/config";

export type ReminderStage = "day" | "hours2" | "minutes15";

type StageCopy = { subject: string; preview: string; heading: string; intro: string };

export type ReminderCopy = {
  stages: Record<ReminderStage, StageCopy>;
  greeting: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  onlineLabel: string;
  joinOnline: string;
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
    stages: {
      day: {
        subject: "Tomorrow: {title}",
        preview: "Your event is tomorrow. Here is everything you need.",
        heading: "See you tomorrow",
        intro: "Your event is tomorrow. Here is everything you need to join us.",
      },
      hours2: {
        subject: "In two hours: {title}",
        preview: "Your event starts in two hours.",
        heading: "Starting in two hours",
        intro: "Your event starts in two hours. Here is where to find us.",
      },
      minutes15: {
        subject: "Starting in 15 minutes: {title}",
        preview: "Your event starts in 15 minutes.",
        heading: "Starting in 15 minutes",
        intro: "We are about to begin. See you in a moment.",
      },
    },
    greeting: "Hello {name}",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    onlineLabel: "Online link",
    joinOnline: "Join online",
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
    stages: {
      day: {
        subject: "Morgen: {title}",
        preview: "Ihr Anlass findet morgen statt. Hier finden Sie alles Wichtige.",
        heading: "Bis morgen",
        intro: "Ihr Anlass findet morgen statt. Hier finden Sie alles Wichtige.",
      },
      hours2: {
        subject: "In zwei Stunden: {title}",
        preview: "Ihr Anlass beginnt in zwei Stunden.",
        heading: "In zwei Stunden geht es los",
        intro: "Ihr Anlass beginnt in zwei Stunden. Hier finden Sie uns.",
      },
      minutes15: {
        subject: "In 15 Minuten: {title}",
        preview: "Ihr Anlass beginnt in 15 Minuten.",
        heading: "In 15 Minuten geht es los",
        intro: "Gleich geht es los. Bis gleich.",
      },
    },
    greeting: "Guten Tag {name}",
    detailsTitle: "Angaben zum Anlass",
    whenLabel: "Wann",
    locationLabel: "Wo",
    onlineLabel: "Online-Link",
    joinOnline: "Online teilnehmen",
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
    stages: {
      day: {
        subject: "Demain : {title}",
        preview: "Votre événement a lieu demain. Voici l'essentiel.",
        heading: "À demain",
        intro: "Votre événement a lieu demain. Voici tout ce qu'il vous faut.",
      },
      hours2: {
        subject: "Dans deux heures : {title}",
        preview: "Votre événement commence dans deux heures.",
        heading: "Début dans deux heures",
        intro: "Votre événement commence dans deux heures. Voici où nous trouver.",
      },
      minutes15: {
        subject: "Dans 15 minutes : {title}",
        preview: "Votre événement commence dans 15 minutes.",
        heading: "Début dans 15 minutes",
        intro: "Nous allons commencer. À tout de suite.",
      },
    },
    greeting: "Bonjour {name}",
    detailsTitle: "Détails de l'événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    onlineLabel: "Lien en ligne",
    joinOnline: "Rejoindre en ligne",
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
    stages: {
      day: {
        subject: "Domani: {title}",
        preview: "Il tuo evento è domani. Ecco tutto l'essenziale.",
        heading: "A domani",
        intro: "Il tuo evento è domani. Ecco tutto ciò che ti serve.",
      },
      hours2: {
        subject: "Tra due ore: {title}",
        preview: "Il tuo evento inizia tra due ore.",
        heading: "Si inizia tra due ore",
        intro: "Il tuo evento inizia tra due ore. Ecco dove trovarci.",
      },
      minutes15: {
        subject: "Tra 15 minuti: {title}",
        preview: "Il tuo evento inizia tra 15 minuti.",
        heading: "Si inizia tra 15 minuti",
        intro: "Stiamo per iniziare. A tra poco.",
      },
    },
    greeting: "Buongiorno {name}",
    detailsTitle: "Dettagli dell'evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    onlineLabel: "Link online",
    joinOnline: "Partecipa online",
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

export function normaliseStage(value: unknown): ReminderStage {
  return value === "hours2" || value === "minutes15" ? value : "day";
}

/** Same tiny placeholder filler the confirmation copy uses. */
export function fillReminder(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

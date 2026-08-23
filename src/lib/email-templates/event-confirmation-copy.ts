/**
 * Copy for the attendee confirmation email, in the four chapter languages.
 *
 * Held here rather than in the app's i18n bundles because the email is
 * rendered server-side at send time, from a locale stored on the registration
 * — there is no UI language context to read. Nothing is translated at send
 * time; every string exists for every locale.
 */
import type { Locale } from "@/i18n/config";

export type ConfirmationCopy = {
  subjectFree: string;
  subjectPaid: string;
  previewFree: string;
  previewPaid: string;
  headingFree: string;
  headingPaid: string;
  greeting: string;
  introFree: string;
  introPaid: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  onlineLabel: string;
  ticketLabel: string;
  amountLabel: string;
  referenceLabel: string;
  paymentConfirmed: string;
  memberPriceNote: string;
  nonMemberPriceNote: string;
  answersTitle: string;
  calendarTitle: string;
  calendarIntro: string;
  addToCalendar: string;
  addToGoogle: string;
  addToOutlook: string;
  viewEvent: string;
  questions: string;
  signoff: string;
  locationOnline: string;
  locationHybrid: string;
  locationHybridSuffix: string;
  locationTba: string;
  yes: string;
  no: string;
};

export const CONFIRMATION_COPY: Record<Locale, ConfirmationCopy> = {
  en: {
    subjectFree: "You are registered: {title}",
    subjectPaid: "Your ticket is confirmed: {title}",
    previewFree: "Your registration is confirmed. Here are the details.",
    previewPaid: "Payment received. Your ticket is confirmed.",
    headingFree: "You are registered",
    headingPaid: "Your ticket is confirmed",
    greeting: "Hello {name}",
    introFree: "Your registration is confirmed. We look forward to seeing you.",
    introPaid:
      "We have received your payment and your place is confirmed. This email is also your receipt.",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    onlineLabel: "Online link",
    ticketLabel: "Ticket",
    amountLabel: "Amount paid",
    referenceLabel: "Payment reference",
    paymentConfirmed: "Payment received",
    memberPriceNote: "Member price applied.",
    nonMemberPriceNote: "Non-member price applied.",
    answersTitle: "Your answers",
    calendarTitle: "Add it to your calendar",
    calendarIntro: "The times below are shown in the event's timezone.",
    addToCalendar: "Add to calendar (.ics)",
    addToGoogle: "Add to Google Calendar",
    addToOutlook: "Add to Outlook",
    viewEvent: "View the event page",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
    locationOnline: "Online",
    locationHybrid: "On site and online",
    locationHybridSuffix: "(on site and online)",
    locationTba: "Location to be confirmed",
    yes: "Yes",
    no: "No",
  },
  de: {
    subjectFree: "Ihre Anmeldung ist bestätigt: {title}",
    subjectPaid: "Ihr Ticket ist bestätigt: {title}",
    previewFree: "Ihre Anmeldung ist bestätigt. Hier sind die Details.",
    previewPaid: "Zahlung erhalten. Ihr Ticket ist bestätigt.",
    headingFree: "Ihre Anmeldung ist bestätigt",
    headingPaid: "Ihr Ticket ist bestätigt",
    greeting: "Hallo {name}",
    introFree: "Ihre Anmeldung ist bestätigt. Wir freuen uns auf Sie.",
    introPaid:
      "Wir haben Ihre Zahlung erhalten und Ihr Platz ist bestätigt. Diese E-Mail dient zugleich als Beleg.",
    detailsTitle: "Veranstaltungsdetails",
    whenLabel: "Wann",
    locationLabel: "Wo",
    onlineLabel: "Online-Link",
    ticketLabel: "Ticket",
    amountLabel: "Bezahlter Betrag",
    referenceLabel: "Zahlungsreferenz",
    paymentConfirmed: "Zahlung erhalten",
    memberPriceNote: "Mitgliederpreis angewendet.",
    nonMemberPriceNote: "Preis für Nichtmitglieder angewendet.",
    answersTitle: "Ihre Angaben",
    calendarTitle: "In den Kalender eintragen",
    calendarIntro: "Die Zeiten unten gelten in der Zeitzone der Veranstaltung.",
    addToCalendar: "Zum Kalender hinzufügen (.ics)",
    addToGoogle: "Zu Google Kalender hinzufügen",
    addToOutlook: "Zu Outlook hinzufügen",
    viewEvent: "Zur Veranstaltungsseite",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Mit freundlichen Grüssen,\nThe Switzerland Chapter of ICF",
    locationOnline: "Online",
    locationHybrid: "Vor Ort und online",
    locationHybridSuffix: "(vor Ort und online)",
    locationTba: "Ort wird noch bekannt gegeben",
    yes: "Ja",
    no: "Nein",
  },
  fr: {
    subjectFree: "Votre inscription est confirmée : {title}",
    subjectPaid: "Votre billet est confirmé : {title}",
    previewFree: "Votre inscription est confirmée. Voici les détails.",
    previewPaid: "Paiement reçu. Votre billet est confirmé.",
    headingFree: "Votre inscription est confirmée",
    headingPaid: "Votre billet est confirmé",
    greeting: "Bonjour {name}",
    introFree: "Votre inscription est confirmée. Nous nous réjouissons de vous accueillir.",
    introPaid:
      "Nous avons reçu votre paiement et votre place est confirmée. Cet e-mail tient lieu de reçu.",
    detailsTitle: "Détails de l’événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    onlineLabel: "Lien en ligne",
    ticketLabel: "Billet",
    amountLabel: "Montant payé",
    referenceLabel: "Référence de paiement",
    paymentConfirmed: "Paiement reçu",
    memberPriceNote: "Tarif membre appliqué.",
    nonMemberPriceNote: "Tarif non-membre appliqué.",
    answersTitle: "Vos réponses",
    calendarTitle: "Ajouter à votre agenda",
    calendarIntro: "Les horaires ci-dessous sont indiqués dans le fuseau horaire de l’événement.",
    addToCalendar: "Ajouter à l’agenda (.ics)",
    addToGoogle: "Ajouter à Google Agenda",
    addToOutlook: "Ajouter à Outlook",
    viewEvent: "Voir la page de l’événement",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
    locationOnline: "En ligne",
    locationHybrid: "Sur place et en ligne",
    locationHybridSuffix: "(sur place et en ligne)",
    locationTba: "Lieu à confirmer",
    yes: "Oui",
    no: "Non",
  },
  it: {
    subjectFree: "La tua iscrizione è confermata: {title}",
    subjectPaid: "Il tuo biglietto è confermato: {title}",
    previewFree: "La tua iscrizione è confermata. Ecco i dettagli.",
    previewPaid: "Pagamento ricevuto. Il tuo biglietto è confermato.",
    headingFree: "La tua iscrizione è confermata",
    headingPaid: "Il tuo biglietto è confermato",
    greeting: "Ciao {name}",
    introFree: "La tua iscrizione è confermata. Non vediamo l’ora di incontrarti.",
    introPaid:
      "Abbiamo ricevuto il tuo pagamento e il tuo posto è confermato. Questa e-mail vale anche come ricevuta.",
    detailsTitle: "Dettagli dell’evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    onlineLabel: "Link online",
    ticketLabel: "Biglietto",
    amountLabel: "Importo pagato",
    referenceLabel: "Riferimento di pagamento",
    paymentConfirmed: "Pagamento ricevuto",
    memberPriceNote: "Applicata la tariffa per i membri.",
    nonMemberPriceNote: "Applicata la tariffa per non membri.",
    answersTitle: "Le tue risposte",
    calendarTitle: "Aggiungi al calendario",
    calendarIntro: "Gli orari indicati sono nel fuso orario dell’evento.",
    addToCalendar: "Aggiungi al calendario (.ics)",
    addToGoogle: "Aggiungi a Google Calendar",
    addToOutlook: "Aggiungi a Outlook",
    viewEvent: "Vai alla pagina dell’evento",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
    locationOnline: "Online",
    locationHybrid: "In presenza e online",
    locationHybridSuffix: "(in presenza e online)",
    locationTba: "Luogo da confermare",
    yes: "Sì",
    no: "No",
  },
};

export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

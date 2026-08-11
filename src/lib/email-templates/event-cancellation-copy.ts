/**
 * Copy for the attendee cancellation email, in the four chapter languages.
 *
 * Held here, not in the app's i18n bundles, for the same reason as the
 * confirmation copy: the email is rendered server-side from a locale stored on
 * the registration, with no UI language context to read.
 */
import type { Locale } from "@/i18n/config";

export type CancellationCopy = {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  detailsTitle: string;
  whenLabel: string;
  locationLabel: string;
  ticketLabel: string;
  refundTitle: string;
  refundIssued: string;
  refundIssuedNote: string;
  refundPending: string;
  refundNone: string;
  amountLabel: string;
  referenceLabel: string;
  calendarNote: string;
  browseEvents: string;
  questions: string;
  signoff: string;
  copyNotice: string;
};

export const CANCELLATION_COPY: Record<Locale, CancellationCopy> = {
  en: {
    subject: "Your registration was cancelled: {title}",
    preview: "Your place has been cancelled.",
    heading: "Your registration was cancelled",
    greeting: "Hello {name}",
    intro: "Your place at this event has been cancelled and your seat released.",
    detailsTitle: "Event details",
    whenLabel: "When",
    locationLabel: "Where",
    ticketLabel: "Ticket",
    refundTitle: "Your payment",
    refundIssued: "A full refund of {amount} has been issued.",
    refundIssuedNote:
      "Depending on your bank, it can take a few working days to appear on your statement.",
    refundPending: "We are arranging the refund of {amount} and will be in touch shortly.",
    refundNone:
      "This cancellation falls inside the 48 hours before the event, so no refund is issued. Write to us if you believe this is a mistake.",
    amountLabel: "Amount paid",
    referenceLabel: "Payment reference",
    calendarNote: "You can remove the event from your calendar.",
    browseEvents: "See other events",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
    copyNotice: "Chapter copy of an attendee cancellation.",
  },
  de: {
    subject: "Ihre Anmeldung wurde storniert: {title}",
    preview: "Ihr Platz wurde storniert.",
    heading: "Ihre Anmeldung wurde storniert",
    greeting: "Hallo {name}",
    intro: "Ihr Platz an dieser Veranstaltung wurde storniert und wieder freigegeben.",
    detailsTitle: "Veranstaltungsdetails",
    whenLabel: "Wann",
    locationLabel: "Wo",
    ticketLabel: "Ticket",
    refundTitle: "Ihre Zahlung",
    refundIssued: "Eine vollständige Rückerstattung von {amount} wurde veranlasst.",
    refundIssuedNote:
      "Je nach Bank kann es einige Werktage dauern, bis der Betrag auf Ihrer Abrechnung erscheint.",
    refundPending:
      "Wir veranlassen die Rückerstattung von {amount} und melden uns in Kürze bei Ihnen.",
    refundNone:
      "Diese Stornierung erfolgt innerhalb von 48 Stunden vor der Veranstaltung, deshalb erfolgt keine Rückerstattung. Schreiben Sie uns, wenn dies ein Irrtum ist.",
    amountLabel: "Bezahlter Betrag",
    referenceLabel: "Zahlungsreferenz",
    calendarNote: "Sie können den Termin aus Ihrem Kalender entfernen.",
    browseEvents: "Weitere Veranstaltungen ansehen",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Mit freundlichen Grüssen,\nThe Switzerland Chapter of ICF",
    copyNotice: "Kopie einer Teilnehmerstornierung für die Geschäftsstelle.",
  },
  fr: {
    subject: "Votre inscription a été annulée : {title}",
    preview: "Votre place a été annulée.",
    heading: "Votre inscription a été annulée",
    greeting: "Bonjour {name}",
    intro: "Votre place à cet événement a été annulée et libérée.",
    detailsTitle: "Détails de l’événement",
    whenLabel: "Quand",
    locationLabel: "Où",
    ticketLabel: "Billet",
    refundTitle: "Votre paiement",
    refundIssued: "Un remboursement intégral de {amount} a été effectué.",
    refundIssuedNote:
      "Selon votre banque, quelques jours ouvrables peuvent être nécessaires avant qu’il apparaisse sur votre relevé.",
    refundPending: "Nous préparons le remboursement de {amount} et reviendrons vers vous sous peu.",
    refundNone:
      "Cette annulation intervient dans les 48 heures précédant l’événement ; aucun remboursement n’est donc effectué. Écrivez-nous si vous pensez qu’il s’agit d’une erreur.",
    amountLabel: "Montant payé",
    referenceLabel: "Référence de paiement",
    calendarNote: "Vous pouvez retirer l’événement de votre agenda.",
    browseEvents: "Voir d’autres événements",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
    copyNotice: "Copie d’une annulation de participant pour le secrétariat.",
  },
  it: {
    subject: "La tua iscrizione è stata annullata: {title}",
    preview: "Il tuo posto è stato annullato.",
    heading: "La tua iscrizione è stata annullata",
    greeting: "Ciao {name}",
    intro: "Il tuo posto a questo evento è stato annullato e reso nuovamente disponibile.",
    detailsTitle: "Dettagli dell’evento",
    whenLabel: "Quando",
    locationLabel: "Dove",
    ticketLabel: "Biglietto",
    refundTitle: "Il tuo pagamento",
    refundIssued: "È stato emesso un rimborso completo di {amount}.",
    refundIssuedNote:
      "A seconda della banca, possono servire alcuni giorni lavorativi prima che compaia sull’estratto conto.",
    refundPending: "Stiamo predisponendo il rimborso di {amount} e ti contatteremo a breve.",
    refundNone:
      "Questo annullamento avviene nelle 48 ore precedenti l’evento, quindi non è previsto alcun rimborso. Scrivici se ritieni che si tratti di un errore.",
    amountLabel: "Importo pagato",
    referenceLabel: "Riferimento di pagamento",
    calendarNote: "Puoi rimuovere l’evento dal tuo calendario.",
    browseEvents: "Scopri altri eventi",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
    copyNotice: "Copia di un annullamento di un partecipante per la segreteria.",
  },
};

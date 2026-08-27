/**
 * Copy for the public attendance-confirmation page (/attend/$token).
 *
 * The page sits outside the localized route tree — attendees arrive from a QR
 * on a screen or a link in their ticket, not from the site navigation — so the
 * strings live here rather than in the locale-routed catalogs. All four
 * chapter languages are shipped; the page never falls back to English chrome.
 */
import { LOCALES, isLocale, type Locale } from "@/i18n/config";

export type AttendanceCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  ticketLabel: string;
  ticketPlaceholder: string;
  submit: string;
  submitting: string;
  scan: string;
  stopScan: string;
  cameraDenied: string;
  closedTitle: string;
  closedBody: string;
  unknownTitle: string;
  unknownBody: string;
  successTitle: string;
  successBody: string;
  alreadyTitle: string;
  alreadyBody: string;
  wrongEventTitle: string;
  wrongEventBody: string;
  ineligibleTitle: string;
  ineligibleBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  rateLimitedTitle: string;
  rateLimitedBody: string;
  languageLabel: string;
};

const COPY: Record<Locale, AttendanceCopy> = {
  en: {
    eyebrow: "Attendance",
    title: "Confirm you were here",
    intro: "Scan or paste the ticket QR from your confirmation email.",
    ticketLabel: "Ticket link or code",
    ticketPlaceholder: "Paste your ticket link or code",
    submit: "Confirm attendance",
    submitting: "Confirming…",
    scan: "Scan my ticket",
    stopScan: "Stop scanning",
    cameraDenied: "The camera is not available. Paste your ticket link instead.",
    closedTitle: "This attendance window has closed",
    closedBody:
      "The organizer has closed this window. Write to office@coachingfederation.ch if you attended and need it recorded.",
    unknownTitle: "This link is not valid",
    unknownBody:
      "The code may have expired. Write to office@coachingfederation.ch and we will help.",
    successTitle: "You are marked present",
    successBody: "You can close this page.",
    alreadyTitle: "You are already marked present",
    alreadyBody: "Nothing more to do — you can close this page.",
    wrongEventTitle: "This ticket is for another event",
    wrongEventBody: "Please use the ticket for the event you are attending now.",
    ineligibleTitle: "We cannot count this ticket",
    ineligibleBody:
      "The registration is cancelled, refunded, or not paid. Write to office@coachingfederation.ch and we will help.",
    notFoundTitle: "We do not recognise this ticket",
    notFoundBody: "Check the link from your confirmation email and try again.",
    rateLimitedTitle: "Too many attempts",
    rateLimitedBody: "Please wait a few minutes and try again.",
    languageLabel: "Language",
  },
  de: {
    eyebrow: "Teilnahme",
    title: "Bestätigen Sie Ihre Teilnahme",
    intro: "Scannen Sie den Ticket-QR-Code aus Ihrer Bestätigungsmail oder fügen Sie ihn ein.",
    ticketLabel: "Ticket-Link oder Code",
    ticketPlaceholder: "Ticket-Link oder Code einfügen",
    submit: "Teilnahme bestätigen",
    submitting: "Wird bestätigt…",
    scan: "Ticket scannen",
    stopScan: "Scannen beenden",
    cameraDenied: "Die Kamera ist nicht verfügbar. Bitte fügen Sie Ihren Ticket-Link ein.",
    closedTitle: "Dieses Teilnahmefenster ist geschlossen",
    closedBody:
      "Die Organisation hat das Fenster geschlossen. Schreiben Sie an office@coachingfederation.ch, wenn Ihre Teilnahme noch erfasst werden soll.",
    unknownTitle: "Dieser Link ist ungültig",
    unknownBody:
      "Der Code ist möglicherweise abgelaufen. Schreiben Sie an office@coachingfederation.ch, wir helfen gerne.",
    successTitle: "Ihre Teilnahme ist erfasst",
    successBody: "Sie können diese Seite schliessen.",
    alreadyTitle: "Ihre Teilnahme war bereits erfasst",
    alreadyBody: "Es ist nichts weiter zu tun — Sie können diese Seite schliessen.",
    wrongEventTitle: "Dieses Ticket gehört zu einem anderen Event",
    wrongEventBody: "Bitte verwenden Sie das Ticket für den Event, an dem Sie gerade teilnehmen.",
    ineligibleTitle: "Dieses Ticket können wir nicht zählen",
    ineligibleBody:
      "Die Anmeldung ist storniert, erstattet oder nicht bezahlt. Schreiben Sie an office@coachingfederation.ch, wir helfen gerne.",
    notFoundTitle: "Dieses Ticket kennen wir nicht",
    notFoundBody: "Prüfen Sie den Link aus Ihrer Bestätigungsmail und versuchen Sie es erneut.",
    rateLimitedTitle: "Zu viele Versuche",
    rateLimitedBody: "Bitte warten Sie einige Minuten und versuchen Sie es erneut.",
    languageLabel: "Sprache",
  },
  fr: {
    eyebrow: "Participation",
    title: "Confirmez votre présence",
    intro: "Scannez ou collez le QR code du billet reçu dans votre e-mail de confirmation.",
    ticketLabel: "Lien ou code du billet",
    ticketPlaceholder: "Collez le lien ou le code de votre billet",
    submit: "Confirmer ma présence",
    submitting: "Confirmation…",
    scan: "Scanner mon billet",
    stopScan: "Arrêter le scan",
    cameraDenied: "La caméra n'est pas disponible. Collez plutôt le lien de votre billet.",
    closedTitle: "Cette fenêtre de présence est fermée",
    closedBody:
      "L'organisation a fermé la fenêtre. Écrivez à office@coachingfederation.ch si votre présence doit encore être enregistrée.",
    unknownTitle: "Ce lien n'est pas valide",
    unknownBody:
      "Le code a peut-être expiré. Écrivez à office@coachingfederation.ch et nous vous aiderons.",
    successTitle: "Votre présence est enregistrée",
    successBody: "Vous pouvez fermer cette page.",
    alreadyTitle: "Votre présence était déjà enregistrée",
    alreadyBody: "Rien d'autre à faire — vous pouvez fermer cette page.",
    wrongEventTitle: "Ce billet concerne un autre événement",
    wrongEventBody: "Utilisez le billet de l'événement auquel vous participez maintenant.",
    ineligibleTitle: "Nous ne pouvons pas compter ce billet",
    ineligibleBody:
      "L'inscription est annulée, remboursée ou impayée. Écrivez à office@coachingfederation.ch et nous vous aiderons.",
    notFoundTitle: "Nous ne reconnaissons pas ce billet",
    notFoundBody: "Vérifiez le lien de votre e-mail de confirmation et réessayez.",
    rateLimitedTitle: "Trop de tentatives",
    rateLimitedBody: "Patientez quelques minutes, puis réessayez.",
    languageLabel: "Langue",
  },
  it: {
    eyebrow: "Partecipazione",
    title: "Conferma la tua presenza",
    intro: "Scansiona o incolla il QR del biglietto ricevuto nell'e-mail di conferma.",
    ticketLabel: "Link o codice del biglietto",
    ticketPlaceholder: "Incolla il link o il codice del biglietto",
    submit: "Conferma la presenza",
    submitting: "Conferma in corso…",
    scan: "Scansiona il biglietto",
    stopScan: "Interrompi la scansione",
    cameraDenied: "La fotocamera non è disponibile. Incolla il link del biglietto.",
    closedTitle: "Questa finestra di presenza è chiusa",
    closedBody:
      "L'organizzazione ha chiuso la finestra. Scrivi a office@coachingfederation.ch se la tua presenza deve ancora essere registrata.",
    unknownTitle: "Questo link non è valido",
    unknownBody:
      "Il codice può essere scaduto. Scrivi a office@coachingfederation.ch e ti aiutiamo.",
    successTitle: "La tua presenza è registrata",
    successBody: "Puoi chiudere questa pagina.",
    alreadyTitle: "La tua presenza era già registrata",
    alreadyBody: "Non serve altro — puoi chiudere questa pagina.",
    wrongEventTitle: "Questo biglietto è di un altro evento",
    wrongEventBody: "Usa il biglietto dell'evento a cui stai partecipando ora.",
    ineligibleTitle: "Non possiamo contare questo biglietto",
    ineligibleBody:
      "L'iscrizione è annullata, rimborsata o non pagata. Scrivi a office@coachingfederation.ch e ti aiutiamo.",
    notFoundTitle: "Non riconosciamo questo biglietto",
    notFoundBody: "Controlla il link nell'e-mail di conferma e riprova.",
    rateLimitedTitle: "Troppi tentativi",
    rateLimitedBody: "Attendi qualche minuto e riprova.",
    languageLabel: "Lingua",
  },
};

export const ATTENDANCE_LOCALES = LOCALES;

export function attendanceCopy(locale: string | undefined): AttendanceCopy {
  return isLocale(locale) ? COPY[locale] : COPY.en;
}

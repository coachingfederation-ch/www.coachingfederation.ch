/**
 * Copy for the three contact-conversation emails, in the four chapter
 * languages. Held here rather than in the app's i18n bundles because these
 * mails are rendered server-side, where there is no UI language context.
 */
import type { Locale } from "@/i18n/config";

export type ContactEmailCopy = {
  verifySubject: string;
  verifyBanner: string;
  verifyPreview: string;
  verifyHeading: string;
  verifyIntro: string;
  verifyButton: string;
  verifyFallback: string;
  verifyIgnore: string;
  copySubject: string;
  copyBanner: string;
  copyPreview: string;
  copyHeading: string;
  copyIntro: string;
  copyClosing: string;
  officeSubject: string;
  officeBanner: string;
  officePreview: string;
  officeHeading: string;
  officeIntro: string;
  subjectLabel: string;
  messageLabel: string;
  nameLabel: string;
  emailLabel: string;
};

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => vars[key] ?? "");
}

export const CONTACT_EMAIL_COPY: Record<Locale, ContactEmailCopy> = {
  en: {
    verifySubject: "Confirm your message to The Switzerland Chapter of ICF",
    verifyBanner: "One more step",
    verifyPreview: "Confirm your email address to send your message.",
    verifyHeading: "Confirm your message",
    verifyIntro:
      "Thank you, {name}. We only forward your message to our office once we know the email address is yours. Please confirm below — your message is not on its way yet.",
    verifyButton: "Confirm and send my message",
    verifyFallback: "If the button does not work, open this link:",
    verifyIgnore:
      "If you did not write to us, simply ignore this email. We delete unconfirmed messages after seven days.",
    copySubject: "Your message to The Switzerland Chapter of ICF",
    copyBanner: "Copy for your records",
    copyPreview: "We received your message and will come back to you.",
    copyHeading: "Your message is on its way",
    copyIntro:
      "Thank you, {name}. Our office has your message and will reply to this address. Here is what we received.",
    copyClosing: "You can reply to this email if you would like to add anything.",
    officeSubject: "Website enquiry: {subject}",
    officeBanner: "Website enquiry",
    officePreview: "{name} sent a message through the website.",
    officeHeading: "New enquiry from the website",
    officeIntro:
      "A visitor prepared this message with the website assistant, reviewed it, and confirmed their email address. Reply to this email to answer them directly.",
    subjectLabel: "Subject",
    messageLabel: "Message",
    nameLabel: "Name",
    emailLabel: "Email",
  },
  de: {
    verifySubject: "Bestätige deine Nachricht an das Schweizer Chapter der ICF",
    verifyBanner: "Ein Schritt fehlt noch",
    verifyPreview: "Bestätige deine E-Mail-Adresse, um deine Nachricht zu senden.",
    verifyHeading: "Bestätige deine Nachricht",
    verifyIntro:
      "Danke, {name}. Wir leiten deine Nachricht erst an unser Büro weiter, wenn wir wissen, dass die E-Mail-Adresse dir gehört. Bitte bestätige unten — deine Nachricht ist noch nicht unterwegs.",
    verifyButton: "Bestätigen und Nachricht senden",
    verifyFallback: "Falls der Button nicht funktioniert, öffne diesen Link:",
    verifyIgnore:
      "Wenn du uns nicht geschrieben hast, ignoriere diese E-Mail einfach. Unbestätigte Nachrichten löschen wir nach sieben Tagen.",
    copySubject: "Deine Nachricht an das Schweizer Chapter der ICF",
    copyBanner: "Kopie für dich",
    copyPreview: "Wir haben deine Nachricht erhalten und melden uns.",
    copyHeading: "Deine Nachricht ist unterwegs",
    copyIntro:
      "Danke, {name}. Unser Büro hat deine Nachricht und antwortet an diese Adresse. Das haben wir erhalten.",
    copyClosing: "Du kannst auf diese E-Mail antworten, wenn du etwas ergänzen möchtest.",
    officeSubject: "Anfrage über die Website: {subject}",
    officeBanner: "Anfrage über die Website",
    officePreview: "{name} hat über die Website geschrieben.",
    officeHeading: "Neue Anfrage über die Website",
    officeIntro:
      "Eine Besucherin oder ein Besucher hat diese Nachricht mit dem Website-Assistenten vorbereitet, überprüft und die E-Mail-Adresse bestätigt. Antworte direkt auf diese E-Mail.",
    subjectLabel: "Betreff",
    messageLabel: "Nachricht",
    nameLabel: "Name",
    emailLabel: "E-Mail",
  },
  fr: {
    verifySubject: "Confirmez votre message au Chapitre suisse de l'ICF",
    verifyBanner: "Encore une étape",
    verifyPreview: "Confirmez votre adresse e-mail pour envoyer votre message.",
    verifyHeading: "Confirmez votre message",
    verifyIntro:
      "Merci, {name}. Nous transmettons votre message à notre bureau uniquement lorsque nous savons que cette adresse e-mail est la vôtre. Confirmez ci-dessous — votre message n'est pas encore parti.",
    verifyButton: "Confirmer et envoyer mon message",
    verifyFallback: "Si le bouton ne fonctionne pas, ouvrez ce lien :",
    verifyIgnore:
      "Si vous ne nous avez pas écrit, ignorez simplement cet e-mail. Nous supprimons les messages non confirmés après sept jours.",
    copySubject: "Votre message au Chapitre suisse de l'ICF",
    copyBanner: "Copie pour vous",
    copyPreview: "Nous avons bien reçu votre message et reviendrons vers vous.",
    copyHeading: "Votre message est parti",
    copyIntro:
      "Merci, {name}. Notre bureau a votre message et répondra à cette adresse. Voici ce que nous avons reçu.",
    copyClosing: "Vous pouvez répondre à cet e-mail si vous souhaitez ajouter quelque chose.",
    officeSubject: "Demande via le site : {subject}",
    officeBanner: "Demande via le site",
    officePreview: "{name} a écrit via le site.",
    officeHeading: "Nouvelle demande via le site",
    officeIntro:
      "Une visiteuse ou un visiteur a préparé ce message avec l'assistant du site, l'a relu et a confirmé son adresse e-mail. Répondez directement à cet e-mail.",
    subjectLabel: "Objet",
    messageLabel: "Message",
    nameLabel: "Nom",
    emailLabel: "E-mail",
  },
  it: {
    verifySubject: "Conferma il tuo messaggio al Capitolo svizzero di ICF",
    verifyBanner: "Manca un passo",
    verifyPreview: "Conferma il tuo indirizzo e-mail per inviare il messaggio.",
    verifyHeading: "Conferma il tuo messaggio",
    verifyIntro:
      "Grazie, {name}. Inoltriamo il messaggio al nostro ufficio solo quando sappiamo che l'indirizzo e-mail è tuo. Conferma qui sotto — il messaggio non è ancora partito.",
    verifyButton: "Conferma e invia il messaggio",
    verifyFallback: "Se il pulsante non funziona, apri questo link:",
    verifyIgnore:
      "Se non ci hai scritto, ignora questa e-mail. I messaggi non confermati vengono eliminati dopo sette giorni.",
    copySubject: "Il tuo messaggio al Capitolo svizzero di ICF",
    copyBanner: "Copia per te",
    copyPreview: "Abbiamo ricevuto il tuo messaggio e ti risponderemo.",
    copyHeading: "Il tuo messaggio è partito",
    copyIntro:
      "Grazie, {name}. Il nostro ufficio ha il tuo messaggio e risponderà a questo indirizzo. Ecco cosa abbiamo ricevuto.",
    copyClosing: "Puoi rispondere a questa e-mail se vuoi aggiungere qualcosa.",
    officeSubject: "Richiesta dal sito: {subject}",
    officeBanner: "Richiesta dal sito",
    officePreview: "{name} ha scritto tramite il sito.",
    officeHeading: "Nuova richiesta dal sito",
    officeIntro:
      "Una visitatrice o un visitatore ha preparato questo messaggio con l'assistente del sito, lo ha riletto e ha confermato il proprio indirizzo e-mail. Rispondi direttamente a questa e-mail.",
    subjectLabel: "Oggetto",
    messageLabel: "Messaggio",
    nameLabel: "Nome",
    emailLabel: "E-mail",
  },
};

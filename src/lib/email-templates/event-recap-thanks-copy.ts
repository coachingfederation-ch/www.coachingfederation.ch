/**
 * Copy for the after-event thank-you email, in the four chapter languages.
 *
 * Kept next to the other event email copy rather than in the app's i18n
 * bundles: the mail is rendered server-side from the locale stored on the
 * registration, with no UI language context to read.
 */
import type { Locale } from "@/i18n/config";

export type RecapThanksCopy = {
  subject: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  galleryIntro: string;
  cta: string;
  fallback: string;
  linkedinIntro: string;
  linkedinCta: string;
  questions: string;
  signoff: string;
};

export const RECAP_THANKS_COPY: Record<Locale, RecapThanksCopy> = {
  en: {
    subject: "Thank you for joining {title}",
    preview: "The photos and the story of the event you attended.",
    heading: "Thank you for being there",
    greeting: "Hello {name}",
    intro: "Thank you for joining us at {title}. It was good to have you with us.",
    galleryIntro: "We have put the story and the photos of the day on our website.",
    cta: "See the photos and the story",
    fallback: "If the button does not work, open this link: {url}",
    linkedinIntro: "We also shared the highlights on LinkedIn — feel free to like and share.",
    linkedinCta: "See the LinkedIn post",
    questions: "Questions? Write to us at {email}.",
    signoff: "Warm regards,\nThe Switzerland Chapter of ICF",
  },
  de: {
    subject: "Danke für Ihre Teilnahme an {title}",
    preview: "Die Bilder und der Rückblick zum Anlass, an dem Sie dabei waren.",
    heading: "Danke, dass Sie dabei waren",
    greeting: "Hallo {name}",
    intro: "Danke, dass Sie bei {title} dabei waren. Es war schön, Sie bei uns zu haben.",
    galleryIntro: "Den Rückblick und die Bilder des Tages finden Sie auf unserer Website.",
    cta: "Bilder und Rückblick ansehen",
    fallback: "Falls die Schaltfläche nicht funktioniert, öffnen Sie diesen Link: {url}",
    linkedinIntro:
      "Die Highlights haben wir auch auf LinkedIn geteilt — gerne liken und weitergeben.",
    linkedinCta: "Zum LinkedIn-Beitrag",
    questions: "Fragen? Schreiben Sie uns an {email}.",
    signoff: "Herzliche Grüsse\nThe Switzerland Chapter of ICF",
  },
  fr: {
    subject: "Merci pour votre participation à {title}",
    preview: "Les photos et le récit de l'événement auquel vous avez participé.",
    heading: "Merci d'avoir été là",
    greeting: "Bonjour {name}",
    intro: "Merci d'avoir participé à {title}. Nous étions heureux de vous compter parmi nous.",
    galleryIntro: "Le récit et les photos de la journée sont en ligne sur notre site.",
    cta: "Voir les photos et le récit",
    fallback: "Si le bouton ne fonctionne pas, ouvrez ce lien : {url}",
    linkedinIntro:
      "Nous avons aussi partagé les temps forts sur LinkedIn — n'hésitez pas à les relayer.",
    linkedinCta: "Voir la publication LinkedIn",
    questions: "Des questions ? Écrivez-nous à {email}.",
    signoff: "Cordialement,\nThe Switzerland Chapter of ICF",
  },
  it: {
    subject: "Grazie per aver partecipato a {title}",
    preview: "Le foto e il racconto dell'evento a cui hai partecipato.",
    heading: "Grazie di esserci stato",
    greeting: "Ciao {name}",
    intro: "Grazie per aver partecipato a {title}. È stato bello averti con noi.",
    galleryIntro: "Il racconto e le foto della giornata sono sul nostro sito.",
    cta: "Guarda le foto e il racconto",
    fallback: "Se il pulsante non funziona, apri questo link: {url}",
    linkedinIntro: "Abbiamo condiviso i momenti salienti anche su LinkedIn — sentiti libero di
 condividerli.",
    linkedinCta: "Vai al post su LinkedIn",
    questions: "Domande? Scrivici a {email}.",
    signoff: "Cordiali saluti,\nThe Switzerland Chapter of ICF",
  },
};

/**
 * Copy for the four member engagement campaign emails, in the four chapter
 * languages. Exports: campaignCopy, type CampaignCopyVars.
 *
 * Wording used to live in `member_engagement_campaigns.copy` and was edited in
 * the staff panel. It now lives here with every other email text, so Cloud →
 * Emails is the single place where all chapter messages can be seen. The
 * member's `correspondence_locale` picks the language; English is the fallback.
 *
 * Body text is plain — blank lines become paragraphs in the shared email shell
 * (`member-engagement.tsx`) — so no markup can break a send.
 */
import type { EngagementCampaignKey } from "@/lib/member-engagement";
import { graceNoticeCopyWithDate, renewSteps } from "./member-grace-copy";

export type CampaignLocale = "en" | "de" | "fr" | "it";

/** Values the copy may interpolate. Missing values collapse to a safe phrase. */
export type CampaignCopyVars = {
  first_name?: string;
  events_link?: string;
  leader_link?: string;
  credential_from?: string;
  credential_to?: string;
  specialisation?: string;
  grace_end_date?: string;
};

export type CampaignCopy = { subject: string; body: string };

const SIGNOFF: Record<CampaignLocale, string> = {
  en: "Warm regards,\nThe Switzerland Chapter of ICF",
  de: "Herzliche Grüsse,\nThe Switzerland Chapter of ICF",
  fr: "Avec nos salutations chaleureuses,\nThe Switzerland Chapter of ICF",
  it: "Un caro saluto,\nThe Switzerland Chapter of ICF",
};

const FALLBACK_NAME: Record<CampaignLocale, string> = {
  en: "there",
  de: "zusammen",
  fr: "à vous",
  it: "a te",
};

/** Used only if a warning is somehow queued without its date. */
const FALLBACK_DATE: Record<CampaignLocale, string> = {
  en: "the date shown in your Member Area",
  de: "dem in Deinem Mitgliederbereich genannten Datum",
  fr: "la date indiquée dans votre espace membre",
  it: "la data indicata nella tua area membri",
};

type Builder = (v: CampaignCopyVars, locale: CampaignLocale) => CampaignCopy;

const name = (v: CampaignCopyVars, locale: CampaignLocale) =>
  v.first_name?.trim() || FALLBACK_NAME[locale];

/** One warning stage in all four languages, delegating to the grace wording. */
function warningBuilders(stage: "notice" | "final"): Record<CampaignLocale, Builder> {
  const build: Builder = (v, l) =>
    graceNoticeCopyWithDate(stage, l, name(v, l), v.grace_end_date ?? FALLBACK_DATE[l]);
  return { en: build, de: build, fr: build, it: build };
}

const BUILDERS: Record<EngagementCampaignKey, Record<CampaignLocale, Builder>> = {
  welcome_new_member: {
    en: (v, l) => ({
      subject: "Welcome to The Switzerland Chapter of ICF",
      body: `Hi ${name(v, l)},

Welcome to The Switzerland Chapter of ICF. We are glad you are here.

As a member you can join our chapter events, meet coaches in your region, and take part in our communities across Switzerland.

A good first step is to look at what is coming up and pick one event to attend: ${v.events_link ?? ""}

${SIGNOFF.en}`,
    }),
    de: (v, l) => ({
      subject: "Willkommen bei The Switzerland Chapter of ICF",
      body: `Hallo ${name(v, l)},

Willkommen bei The Switzerland Chapter of ICF. Schön, dass Sie dabei sind.

Als Mitglied nehmen Sie an unseren Chapter-Veranstaltungen teil, lernen Coaches in Ihrer Region kennen und engagieren sich in unseren Communities in der ganzen Schweiz.

Ein guter erster Schritt: Schauen Sie sich die kommenden Anlässe an und wählen Sie einen aus: ${v.events_link ?? ""}

${SIGNOFF.de}`,
    }),
    fr: (v, l) => ({
      subject: "Bienvenue à The Switzerland Chapter of ICF",
      body: `Bonjour ${name(v, l)},

Bienvenue à The Switzerland Chapter of ICF. Nous sommes heureux de vous compter parmi nous.

En tant que membre, vous participez à nos événements, rencontrez des coachs de votre région et rejoignez nos communautés dans toute la Suisse.

Un bon premier pas : découvrez les prochains rendez-vous et choisissez-en un : ${v.events_link ?? ""}

${SIGNOFF.fr}`,
    }),
    it: (v, l) => ({
      subject: "Benvenuta e benvenuto in The Switzerland Chapter of ICF",
      body: `Ciao ${name(v, l)},

Benvenuta e benvenuto in The Switzerland Chapter of ICF. Siamo felici di averti con noi.

Come membro puoi partecipare ai nostri eventi, incontrare coach della tua regione e prendere parte alle nostre community in tutta la Svizzera.

Un buon primo passo: guarda i prossimi appuntamenti e scegline uno: ${v.events_link ?? ""}

${SIGNOFF.it}`,
    }),
  },

  credential_upgrade: {
    en: (v, l) => ({
      subject: `Congratulations on your ${v.credential_to ?? "new"} credential`,
      body: `Hi ${name(v, l)},

Congratulations on moving from ${v.credential_from ?? "your previous credential"} to ${v.credential_to ?? "your new credential"}. That is a real milestone, and we are glad to have you in the chapter.

If you would like to share what you learned along the way, our communities and events are always looking for member voices.

${SIGNOFF.en}`,
    }),
    de: (v, l) => ({
      subject: `Herzlichen Glückwunsch zu Ihrem ${v.credential_to ?? "neuen"} Credential`,
      body: `Hallo ${name(v, l)},

Herzlichen Glückwunsch zum Schritt von ${v.credential_from ?? "Ihrem bisherigen Credential"} zu ${v.credential_to ?? "Ihrem neuen Credential"}. Das ist ein echter Meilenstein, und wir freuen uns, Sie im Chapter zu haben.

Wenn Sie teilen möchten, was Sie auf diesem Weg gelernt haben: Unsere Communities und Veranstaltungen freuen sich immer über Stimmen aus der Mitgliedschaft.

${SIGNOFF.de}`,
    }),
    fr: (v, l) => ({
      subject: `Félicitations pour votre accréditation ${v.credential_to ?? ""}`.trim(),
      body: `Bonjour ${name(v, l)},

Félicitations pour votre passage de ${v.credential_from ?? "votre accréditation précédente"} à ${v.credential_to ?? "votre nouvelle accréditation"}. C'est une véritable étape, et nous sommes heureux de vous compter dans le chapitre.

Si vous souhaitez partager ce que vous avez appris en chemin, nos communautés et nos événements accueillent volontiers les voix de nos membres.

${SIGNOFF.fr}`,
    }),
    it: (v, l) => ({
      subject: `Congratulazioni per la tua credenziale ${v.credential_to ?? ""}`.trim(),
      body: `Ciao ${name(v, l)},

Congratulazioni per il passaggio da ${v.credential_from ?? "la tua credenziale precedente"} a ${v.credential_to ?? "la tua nuova credenziale"}. È un traguardo importante e siamo felici di averti nel chapter.

Se vuoi condividere ciò che hai imparato lungo il percorso, le nostre community e i nostri eventi accolgono sempre le voci dei membri.

${SIGNOFF.it}`,
    }),
  },

  credential_specialisation: {
    en: (v, l) => ({
      subject: `Congratulations on your ${v.specialisation ?? "new"} specialisation`,
      body: `Hi ${name(v, l)},

Congratulations on earning your ${v.specialisation ?? "new"} specialisation. Thank you for deepening the practice of coaching in Switzerland.

${SIGNOFF.en}`,
    }),
    de: (v, l) => ({
      subject: `Herzlichen Glückwunsch zu Ihrer Spezialisierung ${v.specialisation ?? ""}`.trim(),
      body: `Hallo ${name(v, l)},

Herzlichen Glückwunsch zu Ihrer Spezialisierung ${v.specialisation ?? ""}. Danke, dass Sie die Coaching-Praxis in der Schweiz weiter vertiefen.

${SIGNOFF.de}`,
    }),
    fr: (v, l) => ({
      subject: `Félicitations pour votre spécialisation ${v.specialisation ?? ""}`.trim(),
      body: `Bonjour ${name(v, l)},

Félicitations pour l'obtention de votre spécialisation ${v.specialisation ?? ""}. Merci d'approfondir ainsi la pratique du coaching en Suisse.

${SIGNOFF.fr}`,
    }),
    it: (v, l) => ({
      subject: `Congratulazioni per la tua specializzazione ${v.specialisation ?? ""}`.trim(),
      body: `Ciao ${name(v, l)},

Congratulazioni per aver ottenuto la specializzazione ${v.specialisation ?? ""}. Grazie per contribuire ad approfondire la pratica del coaching in Svizzera.

${SIGNOFF.it}`,
    }),
  },

  grace_reengagement: {
    en: (v, l) => ({
      subject: "Renew your ICF membership in a few minutes",
      body: `Hi ${name(v, l)},

Your ICF membership has expired. Your access to The Switzerland Chapter of ICF stays open until ${v.grace_end_date ?? FALLBACK_DATE.en}, so there is still time to renew.

${renewSteps("en")}

If you would like to talk it through first, one of our chapter leaders is happy to have a conversation with you: ${v.leader_link ?? ""}

${SIGNOFF.en}`,
    }),
    de: (v, l) => ({
      subject: "Erneuere Deine ICF Mitgliedschaft in wenigen Minuten",
      body: `Hallo ${name(v, l)},

Deine ICF Mitgliedschaft ist abgelaufen. Dein Zugang zum Switzerland Chapter of ICF bleibt bis am ${v.grace_end_date ?? "dem in Deinem Mitgliederbereich genannten Datum"} offen, Du hast also noch Zeit zu erneuern.

${renewSteps("de")}

Wenn Du vorher darüber sprechen möchtest, nimmt sich eine unserer Chapter-Verantwortlichen gerne Zeit für ein Gespräch: ${v.leader_link ?? ""}

${SIGNOFF.de}`,
    }),
    fr: (v, l) => ({
      subject: "Renouvelez votre adhésion ICF en quelques minutes",
      body: `Bonjour ${name(v, l)},

Votre adhésion ICF est arrivée à échéance. Votre accès à The Switzerland Chapter of ICF reste ouvert jusqu'au ${v.grace_end_date ?? FALLBACK_DATE.fr} : vous avez encore le temps de renouveler.

${renewSteps("fr")}

Si vous souhaitez d'abord en parler, l'un de nos responsables se fera un plaisir d'échanger avec vous : ${v.leader_link ?? ""}

${SIGNOFF.fr}`,
    }),
    it: (v, l) => ({
      subject: "Rinnova la tua iscrizione ICF in pochi minuti",
      body: `Ciao ${name(v, l)},

La tua iscrizione a ICF è scaduta. Il tuo accesso a The Switzerland Chapter of ICF resta aperto fino al ${v.grace_end_date ?? FALLBACK_DATE.it}, quindi hai ancora tempo per rinnovare.

${renewSteps("it")}

Se preferisci parlarne prima, una delle persone che guidano il chapter sarà lieta di ascoltarti: ${v.leader_link ?? ""}

${SIGNOFF.it}`,
    }),
  },

  // The two lapse warnings reuse the wording already written for them in
  // member-grace-copy.ts, so Cloud → Emails keeps one text per message.
  grace_first_warning: warningBuilders("notice"),
  grace_final_warning: warningBuilders("final"),
};

const LOCALES: readonly CampaignLocale[] = ["en", "de", "fr", "it"];

/** Builds the copy for one campaign in the member's language, English as fallback. */
export function campaignCopy(
  key: EngagementCampaignKey,
  locale: string | null | undefined,
  vars: CampaignCopyVars,
): CampaignCopy {
  const candidate = (locale ?? "").slice(0, 2).toLowerCase() as CampaignLocale;
  const resolved: CampaignLocale = LOCALES.includes(candidate) ? candidate : "en";
  return BUILDERS[key][resolved](vars, resolved);
}

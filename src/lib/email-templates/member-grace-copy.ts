/**
 * Copy for the two grace-period warning emails, in the four chapter languages.
 * Exports: graceNoticeCopy.
 *
 * The member's `correspondence_locale` picks the language; English is the
 * fallback when none was chosen. Body text is plain — blank lines become
 * paragraphs in the shared email shell — so no markup can break the send.
 */
export type GraceLocale = "en" | "de" | "fr" | "it";
export type GraceStage = "notice" | "final";

const OFFICE = "office@coachingfederation.ch";

type Copy = { subject: string; body: string };

function formatDate(iso: string, locale: GraceLocale): string {
  const map: Record<GraceLocale, string> = {
    en: "en-CH",
    de: "de-CH",
    fr: "fr-CH",
    it: "it-CH",
  };
  return new Date(iso).toLocaleDateString(map[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Where members renew and switch on auto-renewal. */
export const ICF_RENEW_URL = "https://coachingfederation.org/";

/**
 * The numbered "how to renew" block shared by all three grace-period emails.
 * Kept generic on purpose: the exact menu labels on coachingfederation.org
 * are not confirmed yet.
 */
export function renewSteps(locale: GraceLocale): string {
  const steps: Record<GraceLocale, string> = {
    en: `How to renew:
1. Sign in at ${ICF_RENEW_URL} with your ICF account.
2. Open your membership and renew it.
3. Switch on auto-renewal in your profile, so your membership renews by itself from next year.

Once ICF Global confirms your renewal, your chapter record updates on its own. You don't need to do anything else.`,
    de: `So erneuerst Du:
1. Melde Dich auf ${ICF_RENEW_URL} mit Deinem ICF Konto an.
2. Öffne Deine Mitgliedschaft und erneuere sie.
3. Aktiviere die automatische Verlängerung (Auto-Renewal) in Deinem Profil, damit sich Deine Mitgliedschaft ab nächstem Jahr von selbst verlängert.

Sobald ICF Global Deine Erneuerung bestätigt, wird Dein Chapter-Eintrag automatisch aktualisiert. Du musst sonst nichts tun.`,
    fr: `Comment renouveler :
1. Connectez-vous sur ${ICF_RENEW_URL} avec votre compte ICF.
2. Ouvrez votre adhésion et renouvelez-la.
3. Activez le renouvellement automatique (auto-renewal) dans votre profil, pour que votre adhésion se renouvelle d'elle-même dès l'an prochain.

Dès qu'ICF Global confirme votre renouvellement, votre fiche auprès du chapitre se met à jour d'elle-même. Vous n'avez rien d'autre à faire.`,
    it: `Come rinnovare:
1. Accedi a ${ICF_RENEW_URL} con il tuo account ICF.
2. Apri la tua iscrizione e rinnovala.
3. Attiva il rinnovo automatico (auto-renewal) nel tuo profilo, così la tua iscrizione si rinnoverà da sola dal prossimo anno.

Appena ICF Global conferma il rinnovo, la tua scheda presso il chapter si aggiorna da sola. Non devi fare altro.`,
  };
  return steps[locale];
}

const BUILDERS: Record<GraceLocale, Record<GraceStage, (name: string, date: string) => Copy>> = {
  en: {
    notice: (name, date) => ({
      subject: "Your ICF membership has expired — renew before " + date,
      body: `Hi ${name},

Your ICF membership has expired. If it is not renewed, your record with The Switzerland Chapter of ICF will be removed on ${date}, together with your member profile and your directory entry.

${renewSteps("en")}

If you think this is a mistake, write to us at ${OFFICE} and we will look into it with you.

Warm regards,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Last reminder: renew your ICF membership before " + date,
      body: `Hi ${name},

A last, friendly reminder: your chapter record will be removed on ${date} unless your ICF membership is renewed.

${renewSteps("en")}

If something looks wrong, write to us at ${OFFICE} before that date and we will hold your record while we check.

Warm regards,
The Switzerland Chapter of ICF`,
    }),
  },
  de: {
    notice: (name, date) => ({
      subject: "Deine ICF Mitgliedschaft ist abgelaufen — erneuere sie vor dem " + date,
      body: `Hallo ${name},

Deine ICF Mitgliedschaft ist abgelaufen. Wird sie nicht erneuert, löschen wir Deinen Eintrag beim Switzerland Chapter of ICF am ${date}, zusammen mit Deinem Mitgliederprofil und Deinem Eintrag im Coach-Verzeichnis.

${renewSteps("de")}

Wenn Du glaubst, dass hier ein Fehler vorliegt, schreib uns an ${OFFICE}, wir schauen es gemeinsam an.

Herzliche Grüsse
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Letzte Erinnerung: Erneuere Deine ICF Mitgliedschaft vor dem " + date,
      body: `Hallo ${name},

Eine letzte, freundliche Erinnerung: Dein Chapter-Eintrag wird am ${date} gelöscht, falls Deine ICF Mitgliedschaft nicht erneuert wird.

${renewSteps("de")}

Wenn etwas nicht stimmt, schreib uns vor diesem Datum an ${OFFICE}; wir halten den Eintrag zurück, solange wir prüfen.

Herzliche Grüsse
The Switzerland Chapter of ICF`,
    }),
  },
  fr: {
    notice: (name, date) => ({
      subject: "Votre adhésion ICF a expiré — renouvelez-la avant le " + date,
      body: `Bonjour ${name},

Votre adhésion ICF est arrivée à échéance. Sans renouvellement, votre fiche auprès de The Switzerland Chapter of ICF sera supprimée le ${date}, avec votre profil de membre et votre fiche dans l'annuaire.

${renewSteps("fr")}

Si vous pensez qu'il s'agit d'une erreur, écrivez-nous à ${OFFICE} et nous regarderons cela avec vous.

Cordialement,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Dernier rappel : renouvelez votre adhésion ICF avant le " + date,
      body: `Bonjour ${name},

Un dernier rappel amical : votre fiche auprès du chapitre sera supprimée le ${date} si votre adhésion ICF n'est pas renouvelée.

${renewSteps("fr")}

Si quelque chose ne va pas, écrivez-nous à ${OFFICE} avant cette date et nous suspendrons la suppression le temps de vérifier.

Cordialement,
The Switzerland Chapter of ICF`,
    }),
  },
  it: {
    notice: (name, date) => ({
      subject: "La tua iscrizione ICF è scaduta — rinnovala prima del " + date,
      body: `Ciao ${name},

La tua iscrizione a ICF è scaduta. Senza rinnovo, la tua scheda presso The Switzerland Chapter of ICF sarà cancellata il ${date}, insieme al tuo profilo di socio e alla tua scheda nell'elenco dei coach.

${renewSteps("it")}

Se pensi che si tratti di un errore, scrivici a ${OFFICE} e lo verificheremo insieme.

Un caro saluto,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Ultimo promemoria: rinnova la tua iscrizione ICF prima del " + date,
      body: `Ciao ${name},

Un ultimo promemoria: la tua scheda presso il chapter sarà cancellata il ${date} se la tua iscrizione ICF non viene rinnovata.

${renewSteps("it")}

Se qualcosa non torna, scrivici a ${OFFICE} prima di quella data e sospenderemo la cancellazione mentre verifichiamo.

Un caro saluto,
The Switzerland Chapter of ICF`,
    }),
  },
};

function resolveLocale(locale: string | null | undefined): GraceLocale {
  const candidate = (locale ?? "").slice(0, 2).toLowerCase() as GraceLocale;
  return (["en", "de", "fr", "it"] as const).includes(candidate) ? candidate : "en";
}

/** Localised subject and body for one warning, from an ISO date. */
export function graceNoticeCopy(
  stage: GraceStage,
  locale: string | null,
  firstName: string,
  deletionAtIso: string,
): { subject: string; body: string } {
  const key = resolveLocale(locale);
  return BUILDERS[key][stage](firstName, formatDate(deletionAtIso, key));
}

/**
 * Same copy, but from a date the caller already formatted. Used by the
 * engagement dispatcher, which formats every campaign date in one place.
 */
export function graceNoticeCopyWithDate(
  stage: GraceStage,
  locale: string | null | undefined,
  firstName: string,
  dateLabel: string,
): { subject: string; body: string } {
  return BUILDERS[resolveLocale(locale)][stage](firstName, dateLabel);
}

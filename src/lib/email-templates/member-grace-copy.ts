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

const BUILDERS: Record<GraceLocale, Record<GraceStage, (name: string, date: string) => Copy>> = {
  en: {
    notice: (name, date) => ({
      subject: "Your chapter record will be removed on " + date,
      body: `Hi ${name},

Your ICF membership no longer appears in the register we receive from ICF Global, so your record with The Switzerland Chapter of ICF is in its closing period.

If nothing changes, we will remove your personal details on ${date}. Your member profile and anything you wrote for the directory go with it.

If you have renewed, or if you plan to, nothing more is needed from your side — the record comes back on its own with the next update from ICF Global. If you think this is a mistake, write to us at ${OFFICE} and we will look into it with you.

We would be glad to keep you with us.

Warm regards,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Last reminder: your chapter record closes on " + date,
      body: `Hi ${name},

This is a last, friendly reminder. Your record with The Switzerland Chapter of ICF is due to be removed on ${date}, because your ICF membership no longer appears in the register we receive from ICF Global.

Renewing with ICF Global is all it takes — your record returns with the next update. If something looks wrong, write to us at ${OFFICE} before the date and we will hold it while we check.

Warm regards,
The Switzerland Chapter of ICF`,
    }),
  },
  de: {
    notice: (name, date) => ({
      subject: "Dein Eintrag beim Chapter wird am " + date + " gelöscht",
      body: `Hallo ${name},

Deine ICF Mitgliedschaft erscheint nicht mehr im Register, das wir von ICF Global erhalten. Dein Eintrag beim Switzerland Chapter of ICF befindet sich deshalb in der Auslaufphase.

Wenn sich nichts ändert, löschen wir Deine persönlichen Daten am ${date}. Dein Mitgliederprofil und Deine Angaben im Coach-Verzeichnis werden dabei mit entfernt.

Hast Du bereits erneuert oder planst Du es, musst Du nichts weiter tun — der Eintrag kommt mit der nächsten Aktualisierung von ICF Global von selbst zurück. Wenn Du glaubst, dass hier ein Fehler vorliegt, schreib uns an ${OFFICE}, wir schauen es gemeinsam an.

Wir behalten Dich gerne bei uns.

Herzliche Grüsse
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Letzte Erinnerung: Dein Eintrag endet am " + date,
      body: `Hallo ${name},

Eine letzte, freundliche Erinnerung. Dein Eintrag beim Switzerland Chapter of ICF wird am ${date} gelöscht, weil Deine ICF Mitgliedschaft nicht mehr im Register von ICF Global erscheint.

Eine Erneuerung bei ICF Global genügt — mit der nächsten Aktualisierung ist Dein Eintrag wieder da. Wenn etwas nicht stimmt, schreib uns vor diesem Datum an ${OFFICE}; wir halten den Eintrag zurück, solange wir prüfen.

Herzliche Grüsse
The Switzerland Chapter of ICF`,
    }),
  },
  fr: {
    notice: (name, date) => ({
      subject: "Votre fiche auprès du chapitre sera supprimée le " + date,
      body: `Bonjour ${name},

Votre adhésion ICF n'apparaît plus dans le registre que nous recevons d'ICF Global. Votre fiche auprès de The Switzerland Chapter of ICF entre donc dans sa période de clôture.

Si rien ne change, nous supprimerons vos données personnelles le ${date}. Votre profil de membre et ce que vous avez rédigé pour l'annuaire seront supprimés avec elles.

Si vous avez renouvelé, ou si vous comptez le faire, vous n'avez rien à faire : la fiche revient d'elle-même à la prochaine mise à jour d'ICF Global. Si vous pensez qu'il s'agit d'une erreur, écrivez-nous à ${OFFICE} et nous regarderons cela avec vous.

Nous serions heureux de vous garder parmi nous.

Cordialement,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Dernier rappel : votre fiche se clôture le " + date,
      body: `Bonjour ${name},

Un dernier rappel amical. Votre fiche auprès de The Switzerland Chapter of ICF sera supprimée le ${date}, car votre adhésion ICF n'apparaît plus dans le registre d'ICF Global.

Un renouvellement auprès d'ICF Global suffit : votre fiche revient à la prochaine mise à jour. Si quelque chose ne va pas, écrivez-nous à ${OFFICE} avant cette date et nous suspendrons la suppression le temps de vérifier.

Cordialement,
The Switzerland Chapter of ICF`,
    }),
  },
  it: {
    notice: (name, date) => ({
      subject: "La tua scheda presso il chapter sarà cancellata il " + date,
      body: `Ciao ${name},

La tua adesione ICF non compare più nel registro che riceviamo da ICF Global, quindi la tua scheda presso The Switzerland Chapter of ICF è nel periodo di chiusura.

Se nulla cambia, cancelleremo i tuoi dati personali il ${date}. Il tuo profilo di socio e quanto hai scritto per l'elenco dei coach verranno rimossi con essi.

Se hai già rinnovato, o intendi farlo, non devi fare altro: la scheda torna da sola con il prossimo aggiornamento di ICF Global. Se pensi che si tratti di un errore, scrivici a ${OFFICE} e lo verificheremo insieme.

Ci farebbe piacere continuare con te.

Un caro saluto,
The Switzerland Chapter of ICF`,
    }),
    final: (name, date) => ({
      subject: "Ultimo promemoria: la tua scheda si chiude il " + date,
      body: `Ciao ${name},

Un ultimo promemoria. La tua scheda presso The Switzerland Chapter of ICF sarà cancellata il ${date}, perché la tua adesione ICF non compare più nel registro di ICF Global.

Basta rinnovare con ICF Global: la scheda torna con il prossimo aggiornamento. Se qualcosa non torna, scrivici a ${OFFICE} prima di quella data e sospenderemo la cancellazione mentre verifichiamo.

Un caro saluto,
The Switzerland Chapter of ICF`,
    }),
  },
};

/** Localised subject and body for one warning. */
export function graceNoticeCopy(
  stage: GraceStage,
  locale: string | null,
  firstName: string,
  deletionAtIso: string,
): { subject: string; body: string } {
  const key = (["en", "de", "fr", "it"] as const).includes(locale as GraceLocale)
    ? (locale as GraceLocale)
    : "en";
  return BUILDERS[key][stage](firstName, formatDate(deletionAtIso, key));
}

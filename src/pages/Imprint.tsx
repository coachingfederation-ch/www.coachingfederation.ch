/**
 * Imprint/Legal notice page providing chapter provider info and liability statements.
 * Exports: ImprintPage (default). Rendered by src/routes/imprint.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/imprint.tsx.
 *
 * English is the master text; DE / FR / IT translations live in IMPRINT_COPY
 * and are picked by the current URL locale. Change English first, then mirror.
 */
import { useLocale } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { LegalPageShell } from "./LegalPageShell";

type ImprintCopy = {
  provider: string;
  legalForm: string;
  address: string;
  country: string;
  contact: string;
  email: string;
  website: string;
  responsible: string;
  responsibleBody: string;
  contentLiability: string;
  contentLiabilityBody: string;
  linkLiability: string;
  linkLiabilityBody: string;
  copyright: string;
  copyrightBody: string;
  law: string;
  lawBody: string;
};

const IMPRINT_COPY: Record<Locale, ImprintCopy> = {
  en: {
    provider: "Provider",
    legalForm: "Legal form: Association (Verein) under Swiss law",
    address: "Address",
    country: "Switzerland",
    contact: "Contact",
    email: "Email",
    website: "Website",
    responsible: "Responsible for content",
    responsibleBody:
      "The Board of International Coach Federation (ICF) Switzerland is responsible for the content of this website in accordance with Swiss law.",
    contentLiability: "Liability for content",
    contentLiabilityBody:
      "The content of this website has been prepared with the greatest possible care. However, The Switzerland Chapter of ICF does not guarantee the accuracy, completeness, or timeliness of the information provided. Liability claims against The Switzerland Chapter of ICF arising from material or immaterial damage caused by the use or non-use of the information provided or by the use of incorrect or incomplete information are excluded, to the extent permitted by Swiss law.",
    linkLiability: "Liability for links",
    linkLiabilityBody:
      "This website may contain links to external third-party websites over whose content ICF Switzerland has no influence. The Switzerland Chapter of ICF therefore accepts no liability for the content of external sites. The respective provider or operator of the linked sites is always responsible for their content.",
    copyright: "Copyright",
    copyrightBody:
      "The content and works published on this website — including text, images, graphics, and design elements — are subject to Swiss copyright law. Reproduction, processing, distribution, and any form of commercial use of the content beyond the scope of copyright law require the written consent of The Switzerland Chapter of ICF or the respective copyright holder, where applicable.",
    law: "Applicable law",
    lawBody:
      "This imprint and all legal relations arising from the use of this website are subject to Swiss law.",
  },
  de: {
    provider: "Anbieter",
    legalForm: "Rechtsform: Verein nach Schweizer Recht",
    address: "Adresse",
    country: "Schweiz",
    contact: "Kontakt",
    email: "E-Mail",
    website: "Website",
    responsible: "Verantwortlich für den Inhalt",
    responsibleBody:
      "Für den Inhalt dieser Website ist der Vorstand von International Coach Federation (ICF) Switzerland nach Schweizer Recht verantwortlich.",
    contentLiability: "Haftung für Inhalte",
    contentLiabilityBody:
      "Die Inhalte dieser Website wurden mit grösstmöglicher Sorgfalt erstellt. The Switzerland Chapter of ICF übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Informationen. Haftungsansprüche gegen The Switzerland Chapter of ICF wegen Schäden materieller oder immaterieller Art, die aus der Nutzung oder Nichtnutzung der angebotenen Informationen oder durch die Nutzung fehlerhafter oder unvollständiger Informationen entstehen, sind ausgeschlossen, soweit dies nach Schweizer Recht zulässig ist.",
    linkLiability: "Haftung für Links",
    linkLiabilityBody:
      "Diese Website kann Links zu externen Websites Dritter enthalten, auf deren Inhalte ICF Switzerland keinen Einfluss hat. The Switzerland Chapter of ICF übernimmt daher keine Haftung für die Inhalte externer Seiten. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.",
    copyright: "Urheberrecht",
    copyrightBody:
      "Die auf dieser Website veröffentlichten Inhalte und Werke (einschliesslich Texte, Bilder, Grafiken und Gestaltungselemente) unterliegen dem Schweizer Urheberrecht. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der kommerziellen Verwertung ausserhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung von The Switzerland Chapter of ICF bzw. der jeweiligen Rechteinhaber.",
    law: "Anwendbares Recht",
    lawBody:
      "Dieses Impressum und alle Rechtsbeziehungen aus der Nutzung dieser Website unterstehen Schweizer Recht.",
  },
  fr: {
    provider: "Éditeur",
    legalForm: "Forme juridique : association (Verein) de droit suisse",
    address: "Adresse",
    country: "Suisse",
    contact: "Contact",
    email: "E-mail",
    website: "Site web",
    responsible: "Responsable du contenu",
    responsibleBody:
      "Le comité d'International Coach Federation (ICF) Switzerland est responsable du contenu de ce site web conformément au droit suisse.",
    contentLiability: "Responsabilité quant au contenu",
    contentLiabilityBody:
      "Le contenu de ce site web a été élaboré avec le plus grand soin. The Switzerland Chapter of ICF ne garantit toutefois pas l'exactitude, l'exhaustivité ni l'actualité des informations fournies. Toute prétention en responsabilité contre The Switzerland Chapter of ICF pour des dommages matériels ou immatériels résultant de l'utilisation ou de la non-utilisation des informations fournies, ou de l'utilisation d'informations erronées ou incomplètes, est exclue dans la mesure permise par le droit suisse.",
    linkLiability: "Responsabilité quant aux liens",
    linkLiabilityBody:
      "Ce site web peut contenir des liens vers des sites externes de tiers sur le contenu desquels ICF Switzerland n'a aucune influence. The Switzerland Chapter of ICF décline donc toute responsabilité pour le contenu des sites externes. Le fournisseur ou l'exploitant du site lié est toujours responsable de son contenu.",
    copyright: "Droits d'auteur",
    copyrightBody:
      "Les contenus et œuvres publiés sur ce site web (y compris textes, images, graphiques et éléments de conception) sont soumis au droit d'auteur suisse. Toute reproduction, modification, diffusion et toute forme d'exploitation commerciale au-delà des limites du droit d'auteur requièrent l'accord écrit de The Switzerland Chapter of ICF ou, le cas échéant, du titulaire des droits.",
    law: "Droit applicable",
    lawBody:
      "Les présentes mentions légales et tous les rapports juridiques découlant de l'utilisation de ce site web sont soumis au droit suisse.",
  },
  it: {
    provider: "Fornitore",
    legalForm: "Forma giuridica: associazione (Verein) di diritto svizzero",
    address: "Indirizzo",
    country: "Svizzera",
    contact: "Contatto",
    email: "E-mail",
    website: "Sito web",
    responsible: "Responsabile dei contenuti",
    responsibleBody:
      "Il comitato di International Coach Federation (ICF) Switzerland è responsabile dei contenuti di questo sito web ai sensi del diritto svizzero.",
    contentLiability: "Responsabilità per i contenuti",
    contentLiabilityBody:
      "I contenuti di questo sito web sono stati redatti con la massima cura possibile. The Switzerland Chapter of ICF non garantisce tuttavia l'esattezza, la completezza né l'attualità delle informazioni fornite. Sono escluse, nella misura consentita dal diritto svizzero, le pretese di responsabilità nei confronti di The Switzerland Chapter of ICF per danni materiali o immateriali derivanti dall'uso o dal mancato uso delle informazioni fornite oppure dall'uso di informazioni errate o incomplete.",
    linkLiability: "Responsabilità per i link",
    linkLiabilityBody:
      "Questo sito web può contenere link a siti esterni di terzi sui cui contenuti ICF Switzerland non ha alcuna influenza. The Switzerland Chapter of ICF declina pertanto ogni responsabilità per i contenuti dei siti esterni. Del contenuto dei siti collegati è sempre responsabile il rispettivo fornitore o gestore.",
    copyright: "Diritto d'autore",
    copyrightBody:
      "I contenuti e le opere pubblicati su questo sito web (inclusi testi, immagini, grafiche ed elementi di design) sono soggetti al diritto d'autore svizzero. La riproduzione, l'elaborazione, la diffusione e qualsiasi forma di utilizzo commerciale al di fuori dei limiti del diritto d'autore richiedono il consenso scritto di The Switzerland Chapter of ICF o, se del caso, del rispettivo titolare dei diritti.",
    law: "Diritto applicabile",
    lawBody:
      "Le presenti note legali e tutti i rapporti giuridici derivanti dall'uso di questo sito web sono soggetti al diritto svizzero.",
  },
};

const LINK = "text-primary underline underline-offset-4 hover:text-primary/80";

export default function ImprintPage() {
  const c = IMPRINT_COPY[useLocale()] ?? IMPRINT_COPY.en;
  return (
    <LegalPageShell pageKey="imprint">
      <section className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.provider}</h2>
          <div className="space-y-2 text-foreground/80">
            <p className="font-semibold text-foreground">
              International Coach Federation (ICF) Switzerland
            </p>
            <p>Switzerland Chapter of ICF</p>
            <p>{c.legalForm}</p>
            <p>UID: CHE-205.048.647</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.address}</h2>
          <address className="not-italic text-foreground/80">
            Weitegasse 6
            <br />
            9320 Arbon
            <br />
            {c.country}
          </address>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.contact}</h2>
          <div className="space-y-2 text-foreground/80">
            <p>
              {c.email}:{" "}
              <a href="mailto:office@coachingfederation.ch" target="_top" className={LINK}>
                office@coachingfederation.ch
              </a>
            </p>
            <p>
              {c.website}:{" "}
              <a href="https://www.coachingfederation.ch" className={LINK}>
                www.coachingfederation.ch
              </a>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.responsible}</h2>
          <p className="text-foreground/80">{c.responsibleBody}</p>
          <p className="text-foreground/80">
            {c.contact}:{" "}
            <a href="mailto:office@coachingfederation.ch" target="_top" className={LINK}>
              office@coachingfederation.ch
            </a>
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.contentLiability}</h2>
          <p className="text-foreground/80">{c.contentLiabilityBody}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.linkLiability}</h2>
          <p className="text-foreground/80">{c.linkLiabilityBody}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.copyright}</h2>
          <p className="text-foreground/80">{c.copyrightBody}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">{c.law}</h2>
          <p className="text-foreground/80">{c.lawBody}</p>
        </div>
      </section>
    </LegalPageShell>
  );
}

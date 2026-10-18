import { ExternalLink, MailLink } from "../shared";

export function ImprintSection() {
  return (
    <>
      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Note legali</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Fornitore</h3>
          <div className="space-y-2 text-foreground/80">
            <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
            <p>Forma giuridica: associazione (Verein) di diritto svizzero</p>
            <p>IDI: CHE-205.048.647</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Indirizzo</h3>
          <address className="not-italic text-foreground/80">
            Weitegasse 6
            <br />
            9320 Arbon
            <br />
            Svizzera
          </address>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Contatti</h3>
          <div className="space-y-2 text-foreground/80">
            <p>
              E-mail: <MailLink address="office@coachingfederation.ch" />
            </p>
            <p>
              Sito web:{" "}
              <ExternalLink href="https://www.coachingfederation.ch">
                www.coachingfederation.ch
              </ExternalLink>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Responsabilità per i contenuti</h3>
          <p className="text-foreground/80">
            Il Comitato di The Switzerland Chapter of ICF è responsabile dei contenuti di questo sito web conformemente al diritto svizzero.
          </p>
          <p className="text-foreground/80">
            Contatto: <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Responsabilità per i contenuti</h3>
          <p className="text-foreground/80">
            I contenuti di questo sito web sono stati redatti con la massima cura possibile. Tuttavia, The Switzerland Chapter of ICF non garantisce l’esattezza, la completezza o l’attualità delle informazioni fornite. Nei limiti consentiti dal diritto svizzero, sono escluse pretese di responsabilità nei confronti di The Switzerland Chapter of ICF per danni materiali o immateriali derivanti dall’utilizzo o dal mancato utilizzo delle informazioni fornite, oppure dall’utilizzo di informazioni inesatte o incomplete.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Responsabilità per i collegamenti</h3>
          <p className="text-foreground/80">
            Questo sito web può contenere collegamenti a siti web esterni di terzi sui cui contenuti The Switzerland Chapter of ICF non esercita alcuna influenza. The Switzerland Chapter of ICF declina pertanto ogni responsabilità per i contenuti dei siti esterni. La responsabilità per i contenuti dei siti collegati incombe sempre ai rispettivi fornitori o gestori.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Diritto d’autore</h3>
          <p className="text-foreground/80">
            I contenuti e le opere pubblicati su questo sito web, inclusi testi, immagini, elementi grafici e di design, sono soggetti al diritto svizzero d’autore. La riproduzione, l’elaborazione, la diffusione e qualsiasi forma di utilizzo commerciale dei contenuti che ecceda i limiti previsti dal diritto d’autore richiedono il consenso scritto di The Switzerland Chapter of ICF o, se del caso, del rispettivo titolare dei diritti d’autore.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Diritto applicabile</h3>
          <p className="text-foreground/80">
            Le presenti note legali e tutti i rapporti giuridici derivanti dall’utilizzo di questo sito web sono soggetti al diritto svizzero.
          </p>
        </div>
      </section>
    </>
  );
}

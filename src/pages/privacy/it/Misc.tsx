import { MailLink } from "../shared";

export function MiscSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">12. Dati dei minori</h3>
        <p className="text-foreground/80">
          Il nostro sito web non è rivolto ai minori di 16 anni. Non raccogliamo consapevolmente dati personali di minori di 16 anni. Se Lei ritiene che abbiamo raccolto dati personali di un minore, La invitiamo a contattarci; adotteremo le misure necessarie per eliminarli.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">13. Modifiche alla presente informativa sulla privacy</h3>
        <p className="text-foreground/80">
          Possiamo aggiornare periodicamente la presente informativa sulla privacy per riflettere modifiche delle nostre prassi di trattamento dei dati, dei requisiti legali o dei servizi offerti. La versione vigente sarà sempre disponibile su questa pagina. Le raccomandiamo di consultare periodicamente questa pagina.
        </p>
        <p className="text-foreground/80">
          La data dell’ultimo aggiornamento è indicata in fondo a questa pagina.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">14. Contatti</h3>
        <p className="text-foreground/80">
          Per qualsiasi domanda sulla presente informativa sulla privacy o sulle nostre prassi di trattamento dei dati, La invitiamo a contattare:
        </p>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p className="mt-2">Weitegasse 6</p>
          <p>9320 Arbon</p>
          <p>Svizzera</p>
          <p className="mt-2">
            E-mail: <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Ultimo aggiornamento: 20 ottobre 2026</p>
    </>
  );
}

import { ExternalLink, MailLink } from "../shared";

export function ControllerSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">1. Chi è il titolare del trattamento?</h3>
        <p className="text-foreground/80">
          Il titolare del trattamento dei dati personali su questo sito web è:
        </p>
        <div className="space-y-2 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p>Associazione (Verein) di diritto svizzero</p>
          <p>IDI: CHE-205.048.647</p>
        </div>
        <address className="not-italic text-foreground/80">
          Weitegasse 6
          <br />
          9320 Arbon
          <br />
          Svizzera
        </address>
        <p className="text-foreground/80">
          E-mail: <MailLink address="office@coachingfederation.ch" />
        </p>
        <p className="text-foreground/80">
          Per qualsiasi domanda relativa alla protezione dei dati, Lei può contattarci all’indirizzo e-mail sopra indicato.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          2. Qual è l’oggetto della presente informativa sulla privacy?
        </h3>
        <p className="text-foreground/80">
          La presente informativa sulla privacy descrive come The Switzerland Chapter of ICF (&quot;noi&quot;, &quot;l’associazione&quot;) tratta i dati personali sul sito web e in relazione al sito web{" "}
          <ExternalLink href="https://www.coachingfederation.ch">
            www.coachingfederation.ch
          </ExternalLink>
          . Si applica a:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Sito web pubblico</strong> : pagina iniziale, elenco degli eventi, blog (&quot;Insights&quot;), pagine di presentazione, elenco dei coach
          </li>
          <li>
            <strong>Elenco dei coach</strong> (&quot;Find a Coach&quot;): profili pubblici dei membri ICF
          </li>
          <li>
            <strong>Area membri</strong> : area in cui i membri gestiscono il proprio profilo nell’elenco e il proprio account
          </li>
          <li>
            <strong>Strumenti per il personale</strong> : CMS, amministrazione dei membri e controlli dell’integrazione ICF
          </li>
          <li>
            <strong>Newsletter e comunicazioni</strong> : iscrizioni tramite e-mail attraverso il sito web
          </li>
          <li>
            <strong>Moduli di contatto e di iscrizione agli eventi</strong> : moduli mediante i quali vengono trasmessi dati personali
          </li>
        </ul>
        <p className="text-foreground/80">
          La presente informativa sulla privacy è redatta in conformità alla legge federale svizzera sulla protezione dei dati (LPD, RS 235.1). Qualora il trattamento riguardi anche persone nello Spazio economico europeo, può trovare ulteriore applicazione il regolamento generale sulla protezione dei dati (GDPR).
        </p>
      </div>
    </>
  );
}

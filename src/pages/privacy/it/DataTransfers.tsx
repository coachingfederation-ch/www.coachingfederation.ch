import { Table } from "../shared";

export function DataTransfersSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          6. I dati vengono trasferiti al di fuori della Svizzera?
        </h3>
        <p className="text-foreground/80">
          I dati personali trattati in relazione al nostro sito web possono essere trasferiti al di fuori della Svizzera. Sono noti o previsti i seguenti trasferimenti:
        </p>
        <p className="text-foreground/80">
          <strong>I dati dei clienti</strong> (account dei membri, profili dei coach, iscrizioni agli eventi, iscrizioni alla newsletter) sono conservati nella regione Europa (Irlanda) di Supabase tramite Lovable Cloud. L’UE e il SEE sono riconosciuti come aventi un livello adeguato di protezione dei dati ai sensi del diritto svizzero (art. 16 cpv. 1 LPD); pertanto, per tale conservazione non sono richieste garanzie supplementari.
        </p>
        <p className="text-foreground/80">
          Tuttavia, Lovable Labs Inc. (società statunitense) ha accesso a tali dati quale responsabile del trattamento e i dati di servizio di Lovable (registri tecnici, telemetria di utilizzo) sono trattati negli Stati Uniti. Questi trasferimenti sono coperti dalle garanzie elencate di seguito.
        </p>
        <Table
          headers={["Destinatario", "Paese / regione", "Garanzia"]}
          rows={[
            [
              "Lovable (Lovable Labs Inc.)",
              "Stati Uniti (Delaware)",
              "SCC dell’UE, modulo 2 (da titolare a responsabile del trattamento), applicate ai trasferimenti dalla Svizzera; addendum del Regno Unito. Cfr. accordo sul trattamento dei dati di Lovable",
            ],
            [
              "Sub-responsabili del trattamento di Lovable",
              "Vari (cfr. trust.lovable.dev)",
              "Obblighi contrattuali equivalenti agli accordi sul trattamento dei dati di Lovable",
            ],
            [
              "Supabase (via Lovable Cloud)",
              "Europa (Irlanda)",
              "Sub-responsabile del trattamento di Lovable; coperto dall’accordo sul trattamento dei dati di Lovable. UE e SEE riconosciuti come adeguati ai sensi della LPD svizzera",
            ],
            [
              "Cloudflare",
              "Rete globale",
              "Instradamento edge, DNS e Workers (CDN). Sub-responsabile del trattamento di Lovable; coperto dall’accordo sul trattamento dei dati di Lovable",
            ],
            [
              "MailerLite",
              "Unione europea (Germania)",
              "UE e SEE riconosciuti come adeguati ai sensi della LPD svizzera; addendum sul trattamento dei dati di MailerLite",
            ],
            [
              "Stripe",
              "Stati Uniti",
              "Clausole contrattuali tipo; accordo sul trattamento dei dati di Stripe",
            ],
            [
              "ICF Global",
              "Stati Uniti (gestione a cura di Associations International)",
              "Chapter Agreement e API Agreement con ICF Global",
            ],
            [
              "Google Maps (Google LLC)",
              "Stati Uniti",
              "Clausole contrattuali tipo dell’UE / Swiss-US Data Privacy Framework (Google)",
            ],
            [
              "Unsplash (Unsplash Inc.)",
              "Stati Uniti",
              "Utilizzo esclusivo da parte del personale (selettore di immagini del CMS); nessun dato dei visitatori",
            ],
            [
              "OpenAI (via Lovable AI Gateway)",
              "Stati Uniti",
              "Sub-responsabile del trattamento di Lovable, coperto dall’accordo sul trattamento dei dati di Lovable; nessun utilizzo per l’addestramento dei modelli",
            ],
          ]}
        />
        <p className="text-foreground/80">
          Qualora i dati vengano trasferiti verso Paesi che non dispongono di un livello adeguato di protezione dei dati ai sensi del diritto svizzero, assicuriamo l’adozione di garanzie appropriate, tra cui:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Clausole contrattuali tipo (SCC) o garanzie contrattuali equivalenti</li>
          <li>Norme vincolanti d’impresa (se applicabili)</li>
          <li>Eccezioni specifiche ai sensi dell’art. 16 cpv. 2 LPD</li>
        </ul>
      </div>
    </>
  );
}

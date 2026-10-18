import { ExternalLink, MailLink } from "../shared";

export function RightsSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          9. Quali sono i Suoi diritti in materia di protezione dei dati?
        </h3>
        <p className="text-foreground/80">
          Ai sensi della legge svizzera sulla protezione dei dati (LPD), Lei dispone dei seguenti diritti in relazione ai Suoi dati personali:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>Diritto d’accesso</strong> : Lei può chiedere se trattiamo dati personali che La concernono e, in caso affermativo, quali dati vengono trattati (art. 25 LPD).
          </li>
          <li>
            <strong>Diritto di rettifica</strong> : Lei può chiedere la rettifica di dati personali inesatti o incompleti (art. 32 LPD).
          </li>
          <li>
            <strong>Diritto alla cancellazione</strong> : Lei può chiedere la cancellazione dei Suoi dati personali, fatti salvi gli obblighi legali di conservazione e altre eccezioni (art. 32 LPD).
          </li>
          <li>
            <strong>Diritto di opposizione</strong> : Lei può opporsi al trattamento dei Suoi dati personali in determinate circostanze, in particolare qualora il trattamento si basi su un interesse preponderante (art. 31 LPD) oppure, qualora si applichi il GDPR, su interessi legittimi (art. 21 GDPR).
          </li>
          <li>
            <strong>Diritto alla portabilità dei dati</strong> : Lei può chiedere che Le forniamo i Suoi dati personali in un formato strutturato, di uso comune e leggibile da dispositivo automatico (art. 28 LPD).
          </li>
          <li>
            <strong>Diritto di revocare il consenso</strong> : qualora il trattamento si basi sul Suo consenso, Lei può revocarlo in qualsiasi momento. Ciò non pregiudica la liceità del trattamento effettuato prima della revoca.
          </li>
          <li>
            <strong>Diritto di presentare un reclamo</strong> : Lei ha il diritto di presentare un reclamo all’Incaricato federale della protezione dei dati e della trasparenza (IFPDT / EDÖB):
          </li>
        </ul>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">
            Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)
          </p>
          <p className="mt-2">Feldeggweg 1</p>
          <p>3003 Bern</p>
          <p>Svizzera</p>
          <p className="mt-2">
            Sito web:{" "}
            <ExternalLink href="https://www.edoeb.admin.ch">www.edoeb.admin.ch</ExternalLink>
          </p>
        </div>
        <p className="text-foreground/80">
          Per esercitare uno qualsiasi di questi diritti, La invitiamo a contattarci all’indirizzo{" "}
          <MailLink address="office@coachingfederation.ch" />. Risponderemo alla Sua richiesta entro 30 giorni. Nei casi complessi, tale termine può essere prorogato; La informeremo di un’eventuale proroga e dei relativi motivi.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">10. Decisioni individuali automatizzate</h3>
        <p className="text-foreground/80">
          Non adottiamo decisioni basate esclusivamente su un trattamento automatizzato che abbiano effetti giuridici o conseguenze rilevanti per Lei (art. 21 LPD). In particolare:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            La ricerca e i filtri dell’elenco dei coach sono strumenti che aiutano i visitatori a trovare coach; non adottano decisioni automatizzate riguardanti persone.
          </li>
          <li>La creazione degli account dei membri e la gestione dei profili prevedono una supervisione umana.</li>
          <li>
            Non viene effettuata alcuna profilazione che produca effetti giuridici o conseguenze analogamente rilevanti per Lei.
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">11. Come proteggiamo i Suoi dati?</h3>
        <p className="text-foreground/80">
          Adottiamo misure tecniche e organizzative adeguate per proteggere i dati personali da accessi non autorizzati, perdita, distruzione o alterazione. Queste misure comprendono:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Trasmissione cifrata dei dati (TLS/SSL)</li>
          <li>Controlli di accesso basati sui ruoli e autenticazione</li>
          <li>Verifiche periodiche della sicurezza dei nostri sistemi</li>
          <li>Dati conservati in una banca dati gestita con regole di sicurezza a livello di riga</li>
          <li>
            Dati ospitati su un’infrastruttura certificata SOC 2 Type II e ISO 27001 fornita dalla nostra piattaforma di hosting (cfr. sezione 5b)
          </li>
        </ul>
        <p className="text-foreground/80">
          Qualora si verifichi una violazione della sicurezza dei dati che comporti verosimilmente un rischio elevato per i Suoi diritti e le Sue libertà, ne daremo notifica all’IFPDT (EDÖB) quanto prima, conformemente all’art. 24 LPD.
        </p>
      </div>
    </>
  );
}

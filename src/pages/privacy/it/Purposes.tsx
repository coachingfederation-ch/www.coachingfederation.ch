import { Table } from "../shared";

export function PurposesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          4. Per quali scopi e su quale base giuridica trattiamo i Suoi dati?
        </h3>
        <p className="text-foreground/80">Trattiamo i dati personali per i seguenti scopi:</p>
        <Table
          headers={["Scopo", "Categorie di dati"]}
          rows={[
            [
              "Funzionamento tecnico, sicurezza e manutenzione del sito web",
              "Dati tecnici (IP, browser, dispositivo, registri)",
            ],
            ["Risposta alle richieste e alle comunicazioni", "Dati di contatto"],
            [
              "Gestione dell’affiliazione e degli account dei membri",
              "Dati degli account dei membri, dati dell’integrazione con ICF Global",
            ],
            ["Pubblicazione dei profili nell’elenco dei coach", "Dati dei profili nell’elenco dei coach"],
            ["Organizzazione degli eventi e gestione delle iscrizioni", "Dati di iscrizione agli eventi"],
            ["Gestione dei Guest Pass per gli ospiti invitati dai membri", "Dati del Guest Pass"],
            ["Invio di newsletter e comunicazioni dell’associazione", "Dati di iscrizione alla newsletter"],
            [
              "Amministrazione dei contenuti, gestione dei membri e integrazione con ICF",
              "Dati del personale e degli utenti del CMS, dati dell’integrazione con ICF Global",
            ],
            ["Adempimento degli obblighi legali e regolamentari", "Vari, secondo necessità"],
          ]}
        />

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            Quadro giuridico secondo il diritto svizzero
          </h4>
          <p className="text-foreground/80">
            Ai sensi della legge svizzera sulla protezione dei dati (LPD), il trattamento di dati personali da parte di privati è di norma consentito purché rispetti i principi dell’art. 6 LPD (liceità, buona fede, proporzionalità, limitazione delle finalità, trasparenza, esattezza dei dati e sicurezza dei dati) e non leda la personalità della persona interessata.
          </p>
          <p className="text-foreground/80">
            Qualora il trattamento possa ledere la personalità, può essere giustificato da:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>il consenso della persona interessata,</li>
            <li>un obbligo legale, oppure</li>
            <li>un interesse privato o pubblico preponderante (art. 31 LPD).</li>
          </ul>
          <p className="text-foreground/80">Per le attività di trattamento sopra descritte:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Le iscrizioni alla newsletter</strong> si basano sul Suo consenso attivo. Lei può disiscriversi in qualsiasi momento.
            </li>
            <li>
              <strong>I profili nell’elenco dei coach</strong> sono pubblicati nell’ambito della partecipazione del membro all’associazione, nel rispetto delle impostazioni di visibilità scelte dal membro. Un profilo viene pubblicato soltanto quando il membro ne imposta la visibilità su &quot;pubblicato&quot;; per impostazione predefinita i profili non sono pubblicati e i membri possono nasconderli o rimuoverli in qualsiasi momento.
            </li>
            <li>
              <strong>Il trattamento dei dati tecnici</strong> è necessario per il funzionamento e la sicurezza del sito web.
            </li>
            <li>
              <strong>I dati dei membri e l’integrazione con ICF Global</strong> servono all’adempimento del rapporto associativo e dello scopo dell’associazione.
            </li>
            <li>
              <strong>I dati di iscrizione agli eventi</strong> sono trattati per organizzare gli eventi e gestire la partecipazione.
            </li>
            <li>
              <strong>I dati del Guest Pass</strong> sono trattati per esaminare il pass, predisporre il posto gratuito dell’ospite e contattarlo in relazione a tale evento. I contatti ulteriori rispetto all’evento si basano su un consenso separato dell’ospite, revocabile in qualsiasi momento.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">Qualora si applichi anche il GDPR</h4>
          <p className="text-foreground/80">
            Qualora il trattamento riguardi anche persone nello Spazio economico europeo e si applichi il GDPR, le basi giuridiche pertinenti comprendono: il consenso (art. 6 par. 1 lett. a GDPR), la necessità contrattuale (art. 6 par. 1 lett. b GDPR), l’obbligo legale (art. 6 par. 1 lett. c GDPR) e gli interessi legittimi (art. 6 par. 1 lett. f GDPR).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          4a. Da quali fonti otteniamo i Suoi dati personali?
        </h3>
        <p className="text-foreground/80">Otteniamo i dati personali dalle seguenti fonti:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Direttamente da Lei</strong> : quando Lei ci contatta, si iscrive alla newsletter o a un evento, crea o gestisce un account membro oppure modifica il Suo profilo nell’elenco dei coach.
          </li>
          <li>
            <strong>Da ICF Global</strong> : tramite la sincronizzazione notturna automatizzata dei dati dei membri (cfr. sezione 3h).
          </li>
          <li>
            <strong>Da un membro invitante</strong> : il membro che richiede un Guest Pass ci fornisce il nome e l’indirizzo e-mail dell’ospite affinché possiamo invitarlo a completare personalmente i propri dati.
          </li>
          <li>
            <strong>Dai sistemi tecnici</strong> : dati tecnici raccolti automaticamente quando Lei visita il sito web (cfr. sezione 3a).
          </li>
          <li>
            <strong>Dai fornitori di servizi</strong> : ICF Global (schede dei membri tramite la sincronizzazione notturna) e MailerLite (iscrizioni alla newsletter effettuate tramite il sito web).
          </li>
        </ul>
        <p className="text-foreground/80">
          Qualora otteniamo dati personali non raccolti direttamente presso di Lei (art. 19 cpv. 3 LPD), La informiamo sulla provenienza dei dati e sulle categorie di dati trattati.
        </p>
      </div>
    </>
  );
}

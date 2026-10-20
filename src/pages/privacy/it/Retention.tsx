import { Table } from "../shared";

export function RetentionSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">7. Per quanto tempo conserviamo i Suoi dati?</h3>
        <p className="text-foreground/80">
          Conserviamo i dati personali soltanto per il tempo necessario al conseguimento degli scopi per i quali sono stati raccolti o per il periodo prescritto dalla legge. I termini specifici di conservazione sono i seguenti:
        </p>
        <Table
          headers={["Categoria", "Periodo di conservazione / criteri"]}
          rows={[
            [
              "Dati tecnici (registri)",
              "I dati di registro sono conservati da Lovable per il tempo necessario ai fini della sicurezza e della piattaforma (cfr. sezione 5b)",
            ],
            [
              "Richieste di contatto",
              "Per la durata della richiesta e per i 3 mesi successivi ai fini del seguito. La registrazione temporanea creata mentre una richiesta tramite il sito web è in attesa della Sua conferma via e-mail viene eliminata da una procedura automatica giornaliera sette giorni dopo la creazione, indipendentemente dalla conferma",
            ],

            [
              "Iscrizioni alla newsletter",
              "Fino alla disiscrizione; viene conservato un elenco di esclusione per impedire una nuova iscrizione senza consenso",
            ],
            [
              "Dati degli account dei membri",
              "Per la durata dell’affiliazione a ICF; eliminati o anonimizzati 90 giorni dopo la cessazione dell’affiliazione",
            ],
            [
              "Profili nell’elenco dei coach",
              "Finché il membro mantiene un profilo pubblico; rimossi quando il membro disattiva il profilo o cessa l’affiliazione",
            ],
            [
              "Dati di iscrizione agli eventi",
              "Per la durata dell’evento e per i 12 mesi successivi ai fini della contabilità e del seguito",
            ],
            [
              "Risposte ai sondaggi",
              "12 mesi dopo la chiusura del sondaggio",
            ],
            [
              "Registrazioni dei Guest Pass",
              "12 mesi dopo la conclusione dell’evento; eliminate mediante una procedura automatica giornaliera, con contestuale anonimizzazione dell’iscrizione gratuita. La revoca del consenso a ulteriori contatti ne interrompe l’invio, ma non anticipa l’eliminazione della registrazione",
            ],
            [
              "Riscontri sugli articoli",
              "Valutazioni anonime, proposte di argomenti e commenti sono conservati per 24 mesi per orientare la pianificazione editoriale. Un indirizzo e-mail viene conservato soltanto se Lei lo aggiunge personalmente ed è utilizzato esclusivamente per una domanda di approfondimento sul Suo riscontro",
            ],

            [
              "Dati degli utenti del CMS e del personale",
              "Per la durata del ruolo dell’utente; eliminati 90 giorni dopo la revoca dell’accesso",
            ],
            [
              "Dati dell’integrazione con ICF Global",
              "Sincronizzati ogni notte; conservati in funzione dello stato dell’affiliazione",
            ],
            [
              "Documenti di pagamento e fatture",
              "10 anni, come prescritto dal diritto contabile svizzero (art. 958f CO)",
            ],
          ]}
        />
        <p className="text-foreground/80">
          Qualora obblighi legali o regolamentari richiedano una conservazione più lunga (ad es. documenti contabili ai sensi del diritto fiscale e commerciale svizzero), i dati vengono conservati per il periodo prescritto dalla legge.
        </p>
      </div>
    </>
  );
}

import { ExternalLink } from "../shared";

export function DataProcessingSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          3. Quali dati personali trattiamo?
        </h3>
        <p className="text-foreground/80">Trattiamo le seguenti categorie di dati personali:</p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            a) Dati tecnici (tutti i visitatori del sito web)
          </h4>
          <p className="text-foreground/80">
            Quando Lei visita il nostro sito web, noi e la nostra piattaforma di hosting Lovable trattiamo automaticamente i dati tecnici trasmessi dal Suo browser:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Indirizzo IP (o indirizzo IP abbreviato)</li>
            <li>Tipo e versione del browser</li>
            <li>Sistema operativo</li>
            <li>Tipo di dispositivo</li>
            <li>URL di provenienza (la pagina visitata prima della nostra)</li>
            <li>Data e ora dell’accesso</li>
            <li>Pagine visitate e durata della visita</li>
          </ul>
          <p className="text-foreground/80">
            Questi dati sono trattati per il funzionamento tecnico, la sicurezza e la stabilità del sito web. Per i dati del Suo account, dei moduli e del profilo, Lovable agisce quale nostro responsabile del trattamento. Per i dati tecnici di registro e di utilizzo (quali indirizzo IP, dati del browser e del dispositivo), Lovable agisce quale titolare autonomo del trattamento ai sensi della propria{" "}
            <ExternalLink href="https://lovable.dev/privacy">informativa sulla privacy</ExternalLink> e può conservare tali dati finché sussiste un’esigenza aziendale legittima.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">b) Dati di contatto e delle richieste</h4>
          <p className="text-foreground/80">
            Quando Lei ci contatta tramite e-mail o un modulo di contatto, trattiamo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome</li>
            <li>Indirizzo e-mail</li>
            <li>Qualsiasi altra informazione che Lei sceglie di fornire nel Suo messaggio</li>
          </ul>
          <p className="text-foreground/80">
            Nella nostra pagina di presentazione, Lei può preparare la Sua richiesta conversando con un assistente di intelligenza artificiale anziché compilando un modulo. La conversazione viene trattata da OpenAI (USA) tramite l’AI Gateway di Lovable. Non viene conservata sui nostri server e, in virtù del nostro accordo sul trattamento dei dati, non viene mai utilizzata per addestrare modelli di intelligenza artificiale. La cronologia della conversazione è conservata esclusivamente nel Suo browser (cfr. sezione 8). Quando Lei preme &ldquo;Rivedi e invia&rdquo;, l’assistente redige un riepilogo che Lei può modificare; riceviamo la versione da Lei approvata. Conserviamo quindi temporaneamente il Suo nome, indirizzo e-mail, oggetto e messaggio e inviamo un collegamento di conferma al Suo indirizzo e-mail; il Suo messaggio perviene al nostro ufficio soltanto quando Lei clicca su tale collegamento. Ciò La protegge dall’invio di messaggi a Suo nome da parte di terzi. Le richieste, sia confermate sia non confermate, vengono eliminate automaticamente sette giorni dopo la loro creazione.
          </p>
        </div>


        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            c) Dati di iscrizione alla newsletter
          </h4>
          <p className="text-foreground/80">
            Quando Lei si iscrive alla nostra newsletter tramite il sito web, trattiamo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Indirizzo e-mail</li>
            <li>Data e stato dell’iscrizione</li>
          </ul>
          <p className="text-foreground/80">
            Al momento dell’iscrizione viene raccolto soltanto l’indirizzo e-mail; non vengono raccolti ulteriori dati (quali nome o interessi).
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Dati dell’account membro</h4>
          <p className="text-foreground/80">
            Quando Lei crea un account membro o ne rivendica la titolarità, trattiamo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome</li>
            <li>Indirizzo e-mail</li>
            <li>Informazioni sull’affiliazione a ICF (identificativo del membro, credenziali, stato dell’affiliazione)</li>
            <li>
              Dati di autenticazione dell’account (ad es. credenziali di accesso gestite tramite il nostro fornitore di servizi di autenticazione)
            </li>
            <li>Preferenze e impostazioni del profilo</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            e) Dati dei profili nell’elenco dei coach
          </h4>
          <p className="text-foreground/80">
            Per i membri i cui profili figurano nell’elenco pubblico &quot;Find a Coach&quot;, trattiamo e pubblichiamo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome e credenziali</li>
            <li>Fotografia</li>
            <li>Biografia e specializzazioni nel coaching</li>
            <li>Dati di contatto (resi pubblici dal membro)</li>
            <li>Lingue parlate</li>
            <li>Località / regione</li>
            <li>Ambiti di coaching</li>
            <li>Collegamenti a profili esterni (ad es. sito web, LinkedIn), se forniti dal membro</li>
          </ul>
          <p className="text-foreground/80">
            Il profilo di un coach è visibile pubblicamente soltanto quando il membro stesso ne imposta la visibilità su &quot;pubblicato&quot;. I profili vengono creati come bozze non pubblicate e non diventano mai pubblici automaticamente; i membri possono nascondere o rimuovere il proprio profilo in qualsiasi momento. La pubblicazione richiede inoltre che il membro sia un membro attivo di ICF con una credenziale valida. Non pubblichiamo pertanto alcun profilo senza un intervento del membro stesso.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">f) Dati di iscrizione agli eventi</h4>
          <p className="text-foreground/80">Quando Lei si iscrive a un evento, trattiamo:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome</li>
            <li>Indirizzo e-mail</li>
            <li>Stato dell’iscrizione e informazioni sul pagamento, se del caso</li>
          </ul>
          <p className="text-foreground/80">
            Oltre al nome e all’indirizzo e-mail, l’iscrizione agli eventi non comporta la raccolta di dati personali identificativi. I moduli dei singoli eventi possono richiedere informazioni supplementari qualora l’evento lo richieda. Tali dati sono utilizzati esclusivamente per l’evento in questione ed eliminati unitamente ai dati di iscrizione. Durante l’iscrizione agli eventi non raccogliamo esigenze alimentari, necessità di accessibilità o altre categorie di dati personali degni di particolare protezione (art. 5 lett. c LPD).
          </p>
          <p className="text-foreground/80">Svolgiamo inoltre sondaggi a cui chiunque può rispondere tramite un link condiviso. Le risposte sono anonime, a meno che un sondaggio non chieda il Suo nome e il Suo indirizzo e-mail, cosa sempre indicata nella pagina del sondaggio. Le risposte sono consultabili solo dal nostro team, vengono utilizzate esclusivamente per valutare il sondaggio in questione e vengono cancellate 12 mesi dopo la chiusura del sondaggio.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Dati del personale e degli utenti del CMS</h4>
          <p className="text-foreground/80">
            Per il personale e gli utenti autorizzati del CMS e degli strumenti di amministrazione, trattiamo:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome e indirizzo e-mail</li>
            <li>Ruolo e autorizzazioni di accesso</li>
            <li>Dati di autenticazione</li>
            <li>Registri delle attività nel CMS</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            h) Dati provenienti dall’integrazione con ICF Global
          </h4>
          <p className="text-foreground/80">
            Riceviamo dati dei membri dalla International Coaching Federation (ICF Global) tramite una sincronizzazione notturna automatizzata. Questi comprendono:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Numero di membro ICF (identificativo interno del membro)</li>
            <li>Nome, cognome e nome completo</li>
            <li>Indirizzo e-mail e numero di telefono</li>
            <li>Città e Paese di residenza</li>
            <li>Organizzazione (se indicata nella scheda ICF)</li>
            <li>Tipo e stato dell’affiliazione</li>
            <li>Data di adesione e data di scadenza dell’affiliazione</li>
            <li>Credenziale (ACC, PCC o MCC) e date di rilascio e scadenza della credenziale</li>
          </ul>
          <p className="text-foreground/80">
            Questi dati vengono trattati per mantenere aggiornate e corrette le schede dei membri e i profili nell’elenco.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">i) Dati del Guest Pass</h4>
          <p className="text-foreground/80">
            I membri possono invitare un ospite non membro a un evento mediante un Guest Pass. Il membro invitante fornisce soltanto il nome e l’indirizzo e-mail dell’ospite e conferma di averlo informato al riguardo. Inviamo quindi all’ospite un collegamento personale tramite e-mail e l’ospite decide autonomamente quali ulteriori informazioni condividere:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Nome e indirizzo e-mail (forniti dal membro invitante)</li>
            <li>Lingua preferita</li>
            <li>
              Facoltativamente: numero di telefono, luogo in cui opera l’ospite, livello o esperienza nel coaching, ambito principale di attività, altre associazioni di coaching ed eventuali note che desidera aggiungere
            </li>
            <li>Eventuale consenso dell’ospite a essere successivamente contattato in merito al chapter</li>
          </ul>
          <p className="text-foreground/80">
            Utilizziamo questi dati per esaminare il Guest Pass, iscrivere l’ospite all’evento in caso di approvazione e contattarlo in relazione a tale evento. La richiesta perviene al nostro team Membership &amp; Engagement soltanto dopo che l’ospite l’ha completata personalmente; tale team, che decide sul rilascio del pass, è l’unico gruppo ad avere accesso ai dati di contatto dell’ospite e alle informazioni facoltative sopra indicate. I responsabili della community e del progetto relativo all’evento vedono il nome dell’ospite e di chi lo ha invitato, per poterlo accogliere. Ulteriori contatti oltre a quelli relativi all’evento avvengono soltanto se l’ospite vi ha acconsentito e tale consenso può essere revocato in qualsiasi momento.
          </p>
          <p className="text-foreground/80">
            Un Guest Pass non costituisce un’iscrizione ordinaria a un evento: il posto è gratuito, non vengono generati dati di pagamento e la registrazione documenta sia il rapporto di invito sia l’iscrizione. Le registrazioni dei Guest Pass vengono eliminate automaticamente 12 mesi dopo l’evento.
          </p>
        </div>
      </div>
    </>
  );
}

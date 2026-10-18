import { ExternalLink, MailLink } from "../shared";

export function ThirdPartiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">5. Chi riceve i Suoi dati?</h3>
        <p className="text-foreground/80">
          Comunichiamo dati personali alle seguenti categorie di destinatari:
        </p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            a) Fornitori di hosting e infrastruttura
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Supabase</strong> : fornisce la banca dati, l’autenticazione, l’archiviazione dei file e l’infrastruttura in tempo reale per il nostro sito web. L’accesso a Supabase avviene tramite Lovable Cloud; Supabase è pertanto un sub-responsabile del trattamento di Lovable e non un responsabile diretto del trattamento di The Switzerland Chapter of ICF. I dati personali conservati in Supabase sono trattati in virtù dell’accordo sul trattamento dei dati di Lovable. Ubicazione dei dati: Europa (Irlanda). Il progetto Lovable Cloud è configurato per conservare i dati nella regione UE (Irlanda). L’UE e il SEE sono riconosciuti come aventi un livello adeguato di protezione dei dati ai sensi del diritto svizzero.
            </li>
            <li>
              <strong>Cloudflare</strong> : fornisce instradamento edge, DNS e Workers (rete di distribuzione dei contenuti) nell’ambito della piattaforma di hosting Lovable, distribuendo il sito tramite la rete edge globale di Cloudflare. Cloudflare è un sub-responsabile del trattamento di Lovable; il suo trattamento dei dati è coperto dall’accordo sul trattamento dei dati di Lovable.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            b) Piattaforma del sito web e hosting: Lovable
          </h4>
          <p className="text-foreground/80">
            Il sito web di The Switzerland Chapter of ICF è ospitato e gestito sulla piattaforma{" "}
            <strong>Lovable</strong> (Lovable Labs Incorporated, società statunitense). Lovable fornisce l’hosting dell’applicazione web, gli strumenti di sviluppo e l’infrastruttura di distribuzione per coachingfederation.ch.
          </p>
          <p className="text-foreground/80">
            Lovable tratta dati personali quale <strong>responsabile del trattamento</strong> per conto di The Switzerland Chapter of ICF. Principali informazioni tratte dall’{" "}
            <ExternalLink href="https://lovable.dev/privacy">
              informativa sulla privacy di Lovable
            </ExternalLink>{" "}(ultimo aggiornamento: aprile 2026):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Entità giuridica:</strong> Lovable Labs Incorporated (Delaware, USA)
            </li>
            <li>
              <strong>Rappresentante nell’UE:</strong> Lovable Labs AB, Regeringsgatan 25, 111 53 Stockholm, Svezia
            </li>
            <li>
              <strong>Contatto OPDa:</strong> <MailLink address="dpo@lovable.dev" />
            </li>
            <li>
              <strong>Ruolo:</strong> Per i dati del Suo account, dei moduli e del profilo (dati dei clienti), Lovable agisce quale nostro responsabile del trattamento. Per i dati tecnici di registro e di utilizzo (quali indirizzo IP, dati del browser e del dispositivo), Lovable agisce quale titolare autonomo del trattamento ai sensi della propria informativa sulla privacy e può conservare tali dati finché sussiste un’esigenza aziendale legittima.
            </li>
            <li>
              <strong>Infrastruttura di hosting:</strong> Lovable Cloud conserva e tratta tutti i dati dei clienti, inclusi la banca dati del sito web, l’autenticazione, l’archiviazione dei file e i dati dell’applicazione, sull’infrastruttura di Supabase. Supabase è un sub-responsabile del trattamento di Lovable, accessibile tramite Lovable Cloud. The Switzerland Chapter of ICF non intrattiene un rapporto contrattuale diretto con Supabase. Utilizziamo l’AI Gateway di Lovable, che trasmette dati a fornitori terzi di intelligenza artificiale (attualmente OpenAI).
            </li>
            <li>
              <strong>Sub-responsabili del trattamento:</strong> Lovable si avvale di sub-responsabili del trattamento tra cui Google Cloud Platform (hosting), Cloudflare (instradamento edge, DNS e CDN), Supabase (banca dati e autenticazione), Stripe (pagamenti) e OpenAI (AI Gateway). L’elenco completo è disponibile su{" "}
              <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink>.
            </li>
            <li>
              <strong>Trasferimenti internazionali:</strong> Lovable può trasferire dati personali negli Stati Uniti. Lovable tutela tali trasferimenti mediante le clausole contrattuali tipo dell’UE (modulo 2, da titolare a responsabile del trattamento), applicate ai trasferimenti dalla Svizzera, e l’addendum del Regno Unito sui trasferimenti internazionali di dati.
            </li>
            <li>
              <strong>Conservazione dei dati:</strong> Lovable conserva i dati di registro per il tempo necessario ai fini della sicurezza e della piattaforma; i dati dei clienti vengono eliminati entro 30 giorni dalla chiusura dell’account.
            </li>
            <li>
              <strong>Sicurezza:</strong> Centri di calcolo certificati SOC 2 Type II e ISO 27001, controlli di accesso basati sui ruoli, autenticazione a più fattori (MFA), cifratura dei dati in transito e a riposo, backup continui e risposta agli incidenti 24 ore su 24, 7 giorni su 7.
            </li>
            <li>
              <strong>Cookie sulla piattaforma Lovable:</strong> Lovable utilizza cookie sulla propria piattaforma (PostHog, Google Analytics, TikTok, Facebook/Meta, Google Ads). Questi si applicano soltanto agli amministratori del sito che utilizzano l’editor Lovable e non vengono impostati per i visitatori di coachingfederation.ch.
            </li>
          </ul>
          <p className="text-foreground/80">
            Utilizziamo il <strong>piano Business</strong>di Lovable, che comprende un accordo sul trattamento dei dati (DPA) con Lovable. Abbiamo esaminato l’elenco completo dei sub-responsabili del trattamento di Lovable su{" "}
            <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink> e verificato che sia conforme alle nostre esigenze di trattamento dei dati.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            c) Fornitori di servizi di posta elettronica e comunicazione
          </h4>
          <p className="text-foreground/80">
            Utilizziamo <strong>MailerLite</strong> (MailerLite Ltd, Lituania) per inviare la nostra newsletter e le e-mail transazionali. MailerLite tratta i dati su server nell’Unione europea (Germania) e fornisce un addendum sul trattamento dei dati. L’UE e il SEE sono riconosciuti come aventi un livello adeguato di protezione dei dati ai sensi del diritto svizzero.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Fornitori di servizi di analisi</h4>
          <p className="text-foreground/80">Non utilizziamo strumenti di analisi o tracciamento.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">e) ICF Global</h4>
          <p className="text-foreground/80">
            Riceviamo dati dei membri da ICF Global tramite una sincronizzazione notturna automatizzata; non ritrasmettiamo dati dei profili. Questi dati sono trattati da ICF Global negli Stati Uniti, dove le schede dei membri di ICF Global sono amministrate dalla sua società di gestione associativa, Associations International (Lexington, Kentucky, USA). Il trasferimento è disciplinato dal nostro Chapter Agreement e dal nostro API Agreement con ICF Global.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            f) Fornitori di servizi di pagamento (se applicabile)
          </h4>
          <p className="text-foreground/80">
            I pagamenti per le iscrizioni agli eventi sono gestiti da <strong>Stripe</strong> (Stripe, Inc., società statunitense). Stripe è anche un sub-responsabile del trattamento di Lovable per la fatturazione di Lovable stessa. I dati di pagamento sono trattati da Stripe in virtù del suo accordo sul trattamento dei dati e i trasferimenti sono coperti da clausole contrattuali tipo.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Accesso interno</h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Membri del Comitato di The Switzerland Chapter of ICF</li>
            <li>
              Personale e volontari autorizzati con accesso al CMS e agli strumenti di amministrazione dei membri
            </li>
            <li>L’accesso è concesso in funzione del ruolo e secondo il principio della necessità di conoscere</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">h) Altri servizi di terzi</h4>
          <p className="text-foreground/80">
            I caratteri sono ospitati autonomamente (Quicksand per i titoli, Plus Jakarta Sans per il corpo del testo); non vengono effettuate richieste esterne di caratteri.
          </p>
          <p className="text-foreground/80">
            Sul sito web vengono utilizzati i seguenti servizi di terzi:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Google Maps</strong> (Google LLC, USA): visualizza mappe sulle pagine degli eventi. Al caricamento di una mappa, il Suo indirizzo IP viene trasmesso a Google.
            </li>
            <li>
              <strong>Unsplash</strong> (Unsplash Inc., USA): utilizzato soltanto dal personale nel selettore di immagini del CMS; non vengono trasmessi dati dei visitatori.
            </li>
            <li>
              <strong>OpenAI</strong> (tramite Lovable AI Gateway, USA): tratta le conversazioni con l’assistente di intelligenza artificiale sulla pagina di presentazione (cfr. sezione 3b).
            </li>
          </ul>
          <p className="text-foreground/80">
            Non utilizziamo video incorporati, contenuti o plugin di social media incorporati, CAPTCHA o protezioni contro i bot, né pixel di tracciamento nelle newsletter.
          </p>
          <p className="text-foreground/80">Non vendiamo dati personali a terzi.</p>
        </div>
      </div>
    </>
  );
}

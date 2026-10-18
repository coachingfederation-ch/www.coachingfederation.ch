import { InfoCallout } from "../shared";

export function CookiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          8. Cookie e tecnologie analoghe
        </h3>
        <p className="text-foreground/80">
          Il nostro sito web imposta un solo cookie tecnicamente necessario (__cf_bm), collocato dalla nostra rete di hosting Cloudflare per distinguere i visitatori reali dai bot. Non contiene alcun profilo personale, non viene utilizzato per il tracciamento e scade dopo 30 minuti. Non impostiamo cookie di analisi, marketing o tracciamento.
        </p>
        <p className="text-foreground/80">
          Per un numero limitato di funzioni tecniche utilizziamo la{" "}
          <strong>memoria locale</strong> (localStorage e sessionStorage) del Suo browser anziché i cookie: memorizzazione della lingua preferita, salvataggio delle bozze durante la scrittura (editor CMS, iscrizione agli eventi), conservazione della cronologia delle conversazioni del widget dell’assistente e memorizzazione degli avvisi chiusi. Questi dati rimangono nel Suo browser. Non utilizziamo queste tecnologie per il tracciamento o la pubblicità e non utilizziamo il fingerprinting o tecniche analoghe.
        </p>
        <InfoCallout>
          <p>
            Poiché utilizziamo soltanto un cookie di sicurezza strettamente necessario e nessuna tecnologia di tracciamento o pubblicitaria, non è richiesto alcun banner di consenso ai cookie. Qualora ciò dovesse cambiare, aggiorneremo la presente informativa e introdurremo un meccanismo di consenso.
          </p>
        </InfoCallout>

        <h4 className="text-base font-semibold tracking-tight">Gestione dei cookie e dei dati del sito</h4>
        <p className="text-foreground/80">
          Lei può controllare ed eliminare i cookie e i dati del sito tramite le impostazioni del Suo browser.
        </p>
      </div>
    </>
  );
}

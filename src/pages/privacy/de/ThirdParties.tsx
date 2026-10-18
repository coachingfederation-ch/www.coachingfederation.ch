import { ExternalLink, MailLink } from "../shared";

export function ThirdPartiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">5. Wer erhält Ihre Daten?</h3>
        <p className="text-foreground/80">
          Wir geben Personendaten an folgende Kategorien von Empfängern bekannt:
        </p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            a) Hosting- und Infrastrukturanbieter
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Supabase</strong> stellt die Datenbank, Authentifizierung, Dateispeicherung und
              Echtzeitinfrastruktur für unsere Website bereit. Der Zugriff auf Supabase erfolgt über Lovable Cloud.
              Supabase ist somit ein Unterauftragsbearbeiter von Lovable und kein direkter Auftragsbearbeiter von
              The Switzerland Chapter of ICF. In Supabase gespeicherte Personendaten werden auf Grundlage der
              Auftragsbearbeitungsvereinbarung von Lovable bearbeitet. Datenstandort: Europa (Irland).
              Das Lovable-Cloud-Projekt ist so konfiguriert, dass Daten in der EU-Region Irland gespeichert werden.
              Die EU und der EWR gelten nach schweizerischem Recht als Gebiete mit angemessenem Datenschutz.
            </li>
            <li>
              <strong>Cloudflare</strong> stellt als Teil der Hosting-Plattform von Lovable Edge-Routing,
              DNS und Workers (Content Delivery Network) bereit. Die Website wird über das globale
              Edge-Netzwerk von Cloudflare ausgeliefert. Cloudflare ist ein Unterauftragsbearbeiter von Lovable;
              die Datenbearbeitung ist durch die Auftragsbearbeitungsvereinbarung von Lovable abgedeckt.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            b) Website-Plattform und Hosting: Lovable
          </h4>
          <p className="text-foreground/80">
            Die Website von The Switzerland Chapter of ICF wird auf der Plattform{" "}
            <strong>Lovable</strong> (Lovable Labs Incorporated, ein US-Unternehmen) gehostet und betrieben.
            Lovable stellt das Hosting der Webanwendung, die Entwicklungswerkzeuge und die
            Bereitstellungsinfrastruktur für coachingfederation.ch bereit.
          </p>
          <p className="text-foreground/80">
            Lovable bearbeitet Personendaten als <strong>Auftragsbearbeiter</strong> im Auftrag von
            The Switzerland Chapter of ICF. Wesentliche Angaben aus der{" "}
            <ExternalLink href="https://lovable.dev/privacy">
              Datenschutzerklärung von Lovable
            </ExternalLink>{" "}
            (zuletzt aktualisiert im April 2026):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Rechtsträger:</strong> Lovable Labs Incorporated (Delaware, USA)
            </li>
            <li>
              <strong>EU-Vertretung:</strong> Lovable Labs AB, Regeringsgatan 25, 111 53
              Stockholm, Schweden
            </li>
            <li>
              <strong>Kontakt der Datenschutzbeauftragten:</strong> <MailLink address="dpo@lovable.dev" />
            </li>
            <li>
              <strong>Rolle:</strong> Für Ihre Konto-, Formular- und Profildaten (Kundendaten)
              handelt Lovable als unser Auftragsbearbeiter. Für technische Protokoll- und Nutzungsdaten
              (wie IP-Adresse, Browser- und Gerätedaten) handelt Lovable als eigenständiger Verantwortlicher
              gemäss seiner eigenen Datenschutzerklärung und kann diese Daten so lange aufbewahren,
              wie ein berechtigter geschäftlicher Bedarf besteht.
            </li>
            <li>
              <strong>Hosting-Infrastruktur:</strong> Lovable Cloud speichert und bearbeitet sämtliche
              Kundendaten, einschliesslich der Datenbank, Authentifizierung, Dateispeicherung und
              Anwendungsdaten der Website, auf der Infrastruktur von Supabase. Supabase ist ein
              Unterauftragsbearbeiter von Lovable; der Zugriff erfolgt über Lovable Cloud.
              The Switzerland Chapter of ICF hat keine direkte Vertragsbeziehung mit Supabase.
              Wir nutzen das AI Gateway von Lovable, das Daten an externe KI-Anbieter
              (derzeit OpenAI) übermittelt.
            </li>
            <li>
              <strong>Unterauftragsbearbeiter:</strong> Lovable setzt unter anderem Google Cloud Platform
              (Hosting), Cloudflare (Edge-Routing, DNS und CDN), Supabase (Datenbank und Authentifizierung),
              Stripe (Zahlungen) und OpenAI (AI Gateway) als Unterauftragsbearbeiter ein.
              Die vollständige Liste ist abrufbar unter{" "}
              <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink>.
            </li>
            <li>
              <strong>Bekanntgaben ins Ausland:</strong> Lovable kann Personendaten in die Vereinigten
              Staaten bekanntgeben. Lovable sichert diese Bekanntgaben durch die EU-Standarddatenschutzklauseln
              (Modul 2, Verantwortlicher an Auftragsbearbeiter), angewendet auf Bekanntgaben aus der Schweiz,
              sowie durch das UK International Data Transfer Addendum ab.
            </li>
            <li>
              <strong>Aufbewahrung:</strong> Lovable bewahrt Protokolldaten so lange auf, wie dies für
              Sicherheits- und Plattformzwecke erforderlich ist; Kundendaten werden innerhalb von
              30 Tagen nach Beendigung des Kontos gelöscht.
            </li>
            <li>
              <strong>Sicherheit:</strong> Nach SOC 2 Typ II und ISO 27001 zertifizierte Rechenzentren,
              rollenbasierte Zugriffskontrollen, MFA, Verschlüsselung bei der Übertragung und Speicherung,
              laufende Datensicherungen sowie Reaktion auf Sicherheitsvorfälle rund um die Uhr.
            </li>
            <li>
              <strong>Cookies auf der Lovable-Plattform:</strong> Lovable verwendet auf seiner eigenen
              Plattform Cookies (PostHog, Google Analytics, TikTok, Facebook/Meta, Google Ads).
              Diese betreffen nur Website-Administratoren, die den Lovable-Editor nutzen, und werden
              bei Besucherinnen und Besuchern von coachingfederation.ch nicht gesetzt.
            </li>
          </ul>
          <p className="text-foreground/80">
            Wir nutzen den <strong>Business-Tarif</strong> von Lovable, der eine
            Auftragsbearbeitungsvereinbarung (DPA) mit Lovable umfasst. Wir haben die vollständige
            Liste der Unterauftragsbearbeiter von Lovable unter{" "}
            <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink> geprüft und
            festgestellt, dass sie unseren Anforderungen an die Datenbearbeitung entspricht.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            c) E-Mail- und Kommunikationsanbieter
          </h4>
          <p className="text-foreground/80">
            Wir verwenden <strong>MailerLite</strong> (MailerLite Ltd, Litauen) für den Versand unseres
            Newsletters und transaktionaler E-Mails. MailerLite bearbeitet Daten auf Servern innerhalb
            der Europäischen Union (Deutschland) und stellt einen Auftragsbearbeitungsnachtrag bereit.
            Die EU und der EWR gelten nach schweizerischem Recht als Gebiete mit angemessenem Datenschutz.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Analyseanbieter</h4>
          <p className="text-foreground/80">Wir verwenden keine Analyse- oder Tracking-Werkzeuge.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">e) ICF Global</h4>
          <p className="text-foreground/80">
            Wir erhalten Mitgliederdaten von ICF Global durch eine automatisierte nächtliche Synchronisation;
            wir übermitteln keine Profildaten zurück. Diese Daten werden von ICF Global in den Vereinigten
            Staaten bearbeitet. Dort werden die Mitgliederverzeichnisse von ICF Global durch dessen
            Verbandsverwaltungsgesellschaft Associations International (Lexington, Kentucky, USA) verwaltet.
            Die Übermittlung richtet sich nach unserem Chapter Agreement und API Agreement mit ICF Global.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            f) Zahlungsanbieter (soweit anwendbar)
          </h4>
          <p className="text-foreground/80">
            Zahlungen für Veranstaltungsanmeldungen werden durch <strong>Stripe</strong> (Stripe, Inc.,
            ein US-Unternehmen) abgewickelt. Stripe ist zudem ein Unterauftragsbearbeiter von Lovable
            für dessen eigene Rechnungsstellung. Zahlungsdaten werden von Stripe auf Grundlage seiner
            Auftragsbearbeitungsvereinbarung bearbeitet; Bekanntgaben sind durch Standarddatenschutzklauseln
            abgesichert.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Interner Zugriff</h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Vorstandsmitglieder von The Switzerland Chapter of ICF</li>
            <li>
              Berechtigte Mitarbeitende und Freiwillige mit Zugriff auf das CMS und die Werkzeuge zur Mitgliederverwaltung
            </li>
            <li>Der Zugriff erfolgt rollenbasiert und nur im für die Aufgabenerfüllung erforderlichen Umfang</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">h) Weitere Dienste Dritter</h4>
          <p className="text-foreground/80">
            Schriftarten werden selbst gehostet (Quicksand für Überschriften, Plus Jakarta Sans für Fliesstext).
            Es erfolgen keine externen Schriftartenanfragen.
          </p>
          <p className="text-foreground/80">
            Auf der Website werden folgende Dienste Dritter eingesetzt:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Google Maps</strong> (Google LLC, USA): zeigt Karten auf Veranstaltungsseiten an.
              Beim Laden einer Karte wird Ihre IP-Adresse an Google übermittelt.
            </li>
            <li>
              <strong>Unsplash</strong> (Unsplash Inc., USA): wird ausschliesslich von Mitarbeitenden
              in der CMS-Bildauswahl verwendet; es werden keine Besucherdaten übermittelt.
            </li>
            <li>
              <strong>OpenAI</strong> (über Lovable AI Gateway, USA): bearbeitet Gespräche mit dem
              KI-Assistenten auf der Seite über uns (siehe Abschnitt 3b).
            </li>
          </ul>
          <p className="text-foreground/80">
            Wir verwenden keine eingebetteten Videos, Social-Media-Einbettungen oder -Plugins,
            keinen CAPTCHA- oder Bot-Schutz und keine Newsletter-Tracking-Pixel.
          </p>
          <p className="text-foreground/80">Wir verkaufen keine Personendaten an Dritte.</p>
        </div>
      </div>
    </>
  );
}

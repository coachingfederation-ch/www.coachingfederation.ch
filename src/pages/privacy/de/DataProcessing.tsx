import { ExternalLink } from "../shared";

export function DataProcessingSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">3. Welche Personendaten bearbeiten wir?</h3>
        <p className="text-foreground/80">Wir bearbeiten die folgenden Kategorien von Personendaten:</p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">a) Technische Daten (alle Website-Besuchenden)</h4>
          <p className="text-foreground/80">Wenn Sie unsere Website besuchen, bearbeiten wir und unsere Hosting-Plattform Lovable automatisch technische Daten, die Ihr Browser übermittelt:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>IP-Adresse (oder gekürzte IP-Adresse)</li>
            <li>Browsertyp und -version</li>
            <li>Betriebssystem</li>
            <li>Gerätetyp</li>
            <li>Referrer-URL (die zuvor besuchte Seite)</li>
            <li>Datum und Uhrzeit des Zugriffs</li>
            <li>Besuchte Seiten und Besuchsdauer</li>
          </ul>
          <p className="text-foreground/80">Diese Daten werden für den technischen Betrieb, die Sicherheit und die Stabilität der Website bearbeitet. Für Ihre Konto-, Formular- und Profildaten handelt Lovable als unser Auftragsbearbeiter. Für technische Protokoll- und Nutzungsdaten (etwa IP-Adresse, Browser- und Gerätedaten) handelt Lovable als eigenständiger Verantwortlicher gemäss seiner eigenen{" "}<ExternalLink href="https://lovable.dev/privacy">Datenschutzerklärung</ExternalLink> und kann diese Daten so lange aufbewahren, wie ein berechtigtes geschäftliches Bedürfnis besteht.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">b) Kontakt- und Anfragedaten</h4>
          <p className="text-foreground/80">Wenn Sie uns per E-Mail oder über ein Kontaktformular kontaktieren, bearbeiten wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Weitere Informationen, die Sie uns in Ihrer Nachricht freiwillig mitteilen</li>
          </ul>
          <p className="text-foreground/80">Auf unserer Seite über uns können Sie Ihre Anfrage in einem Gespräch mit einem KI-Assistenten vorbereiten, anstatt ein Formular auszufüllen. Das Gespräch wird über das AI Gateway von Lovable durch OpenAI (USA) bearbeitet. Es wird nicht auf unseren Servern gespeichert und gemäss unserer Auftragsbearbeitungsvereinbarung niemals zum Training von KI-Modellen verwendet. Ihr Chatverlauf wird ausschliesslich in Ihrem eigenen Browser aufbewahrt (siehe Ziffer 8). Wenn Sie auf &ldquo;Prüfen und senden&rdquo; klicken, erstellt der Assistent eine Zusammenfassung, die Sie bearbeiten können. Wir erhalten die von Ihnen genehmigte Fassung. Anschliessend speichern wir Ihren Namen, Ihre E-Mail-Adresse, den Betreff und Ihre Nachricht vorübergehend und senden einen Bestätigungslink an Ihre E-Mail-Adresse. Ihre Nachricht erreicht unsere Geschäftsstelle erst, wenn Sie diesen Link anklicken. Dies schützt Sie davor, dass jemand in Ihrem Namen an uns schreibt. Sowohl unbestätigte als auch bestätigte Anfragen werden sieben Tage nach ihrer Erstellung automatisch gelöscht.</p>
        </div>


        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">c) Newsletter-Abonnementdaten</h4>
          <p className="text-foreground/80">Wenn Sie unseren Newsletter über die Website abonnieren, bearbeiten wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>E-Mail-Adresse</li>
            <li>Datum und Status des Abonnements</li>
          </ul>
          <p className="text-foreground/80">Bei der Anmeldung wird nur die E-Mail-Adresse erhoben. Weitere Angaben (etwa Name oder Interessen) werden nicht erhoben.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Mitgliederkontodaten</h4>
          <p className="text-foreground/80">Wenn Sie ein Mitgliederkonto erstellen oder für sich beanspruchen, bearbeiten wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Angaben zur ICF-Mitgliedschaft (Mitgliedsnummer, Zertifizierungen, Mitgliedschaftsstatus)</li>
            <li>Authentifizierungsdaten des Kontos (z. B. Zugangsdaten, die über unseren Authentifizierungsanbieter verwaltet werden)</li>
            <li>Profilpräferenzen und Einstellungen</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">e) Profildaten im Coach-Verzeichnis</h4>
          <p className="text-foreground/80">Bei Mitgliedern, deren Profile im öffentlichen Verzeichnis &quot;Find a Coach&quot; erscheinen, bearbeiten und veröffentlichen wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name und Zertifizierungen</li>
            <li>Fotografie</li>
            <li>Biografie und Coaching-Spezialisierungen</li>
            <li>Kontaktangaben (soweit vom Mitglied öffentlich gemacht)</li>
            <li>Gesprochene Sprachen</li>
            <li>Standort / Region</li>
            <li>Coaching-Schwerpunkte</li>
            <li>Links zu externen Profilen (z. B. Website, LinkedIn), sofern vom Mitglied angegeben</li>
          </ul>
          <p className="text-foreground/80">Ein Coach-Profil erscheint nur dann öffentlich, wenn das Mitglied selbst die Sichtbarkeit auf &quot;veröffentlicht&quot; setzt. Profile werden als unveröffentlichte Entwürfe erstellt und niemals selbstständig öffentlich. Mitglieder können ihr Profil jederzeit ausblenden oder entfernen. Die Veröffentlichung setzt zudem eine aktive ICF-Mitgliedschaft mit gültiger Zertifizierung voraus. Wir veröffentlichen daher kein Profil ohne eigenes Zutun des Mitglieds.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">f) Veranstaltungsanmeldedaten</h4>
          <p className="text-foreground/80">Wenn Sie sich für eine Veranstaltung anmelden, bearbeiten wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>E-Mail-Adresse</li>
            <li>Anmeldestatus und gegebenenfalls Zahlungsinformationen</li>
          </ul>
          <p className="text-foreground/80">Abgesehen von Name und E-Mail-Adresse werden bei der Veranstaltungsanmeldung keine identifizierenden Personendaten erhoben. Einzelne Veranstaltungsformulare können zusätzliche Angaben abfragen, wenn dies für die Veranstaltung erforderlich ist. Solche Daten werden ausschliesslich für diese Veranstaltung verwendet und zusammen mit den Anmeldedaten gelöscht. Bei der Veranstaltungsanmeldung erheben wir keine Angaben zu Ernährungsanforderungen, zum Bedarf an Barrierefreiheit oder zu anderen Kategorien besonders schützenswerter Personendaten (Art. 5 lit. c DSG).</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Daten von Mitarbeitenden und CMS-Nutzenden</h4>
          <p className="text-foreground/80">Für Mitarbeitende und berechtigte Nutzende des CMS und der Verwaltungswerkzeuge bearbeiten wir:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name und E-Mail-Adresse</li>
            <li>Rolle und Zugriffsberechtigungen</li>
            <li>Authentifizierungsdaten</li>
            <li>Aktivitätsprotokolle im CMS</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">h) Daten aus der ICF Global-Integration</h4>
          <p className="text-foreground/80">Wir erhalten Mitgliederdaten von der International Coaching Federation (ICF Global) durch eine automatisierte nächtliche Synchronisierung. Dazu gehören:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>ICF-Mitgliedsnummer (interne Mitgliederkennung)</li>
            <li>Vorname, Nachname und vollständiger Name</li>
            <li>E-Mail-Adresse und Telefonnummer</li>
            <li>Wohnort und Wohnsitzland</li>
            <li>Organisation (sofern im ICF-Datensatz angegeben)</li>
            <li>Mitgliedschaftsart und Mitgliedschaftsstatus</li>
            <li>Beginn und Ablaufdatum der Mitgliedschaft</li>
            <li>Zertifizierung (ACC, PCC oder MCC) sowie Erteilungs- und Ablaufdatum der Zertifizierung</li>
          </ul>
          <p className="text-foreground/80">Diese Daten werden bearbeitet, um korrekte Mitgliederdatensätze und Verzeichnisprofile zu führen.</p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">i) Guest Pass-Daten</h4>
          <p className="text-foreground/80">Mitglieder können mit einem Guest Pass einen Gast, der kein Mitglied ist, zu einer Veranstaltung einladen. Das einladende Mitglied gibt ausschliesslich den Namen und die E-Mail-Adresse des Gastes an und bestätigt, den Gast darüber informiert zu haben. Wir senden dem Gast anschliessend per E-Mail einen persönlichen Link. Der Gast entscheidet selbst, welche weiteren Angaben er mitteilt:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name und E-Mail-Adresse (vom einladenden Mitglied angegeben)</li>
            <li>Bevorzugte Sprache</li>
            <li>Optional: Telefonnummer, Standort, Coaching-Niveau oder Hintergrund, hauptsächliches Tätigkeitsgebiet, weitere Coaching-Verbände und allfällige Anmerkungen</li>
            <li>Ob der Gast einer späteren Kontaktaufnahme zum Chapter zustimmt</li>
          </ul>
          <p className="text-foreground/80">Wir verwenden diese Daten, um den Guest Pass zu prüfen, den Gast bei Genehmigung für die Veranstaltung anzumelden und ihn zu dieser Veranstaltung zu kontaktieren. Die Anfrage erreicht unser Membership &amp; Engagement-Team erst, wenn der Gast sie selbst vervollständigt hat. Nur dieses Team, das über den Pass entscheidet, sieht die Kontaktangaben des Gastes und die oben genannten optionalen Angaben. Community- und Projektleitende der Veranstaltung sehen den Namen des Gastes und die einladende Person, damit sie ihn willkommen heissen können. Eine über die Veranstaltung hinausgehende Kontaktaufnahme erfolgt nur mit Einwilligung des Gastes. Diese Einwilligung kann jederzeit widerrufen werden.</p>
          <p className="text-foreground/80">Ein Guest Pass ist keine gewöhnliche Veranstaltungsanmeldung: Der Platz ist kostenlos, es fallen keine Zahlungsdaten an, und der Datensatz enthält neben der Anmeldung auch die Einladungsbeziehung. Guest Pass-Datensätze werden zwölf Monate nach der Veranstaltung automatisch gelöscht.</p>
        </div>
      </div>
    </>
  );
}

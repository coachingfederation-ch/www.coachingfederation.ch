import { Table } from "../shared";

export function PurposesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">4. Zu welchen Zwecken und auf welcher rechtlichen Grundlage bearbeiten wir Ihre Daten?</h3>
        <p className="text-foreground/80">Wir bearbeiten Personendaten zu folgenden Zwecken:</p>
        <Table
          headers={["Zweck", "Datenkategorien"]}
          rows={[
            [
              "Technischer Betrieb, Sicherheit und Wartung der Website",
              "Technische Daten (IP, Browser, Gerät, Protokolle)",
            ],
            ["Beantwortung von Anfragen und Kommunikation", "Kontaktdaten"],
            [
              "Verwaltung der Mitgliedschaft und der Mitgliederkonten",
              "Mitgliederkontodaten, Daten aus der ICF Global-Integration",
            ],
            ["Veröffentlichung von Profilen im Coach-Verzeichnis", "Profildaten im Coach-Verzeichnis"],
            ["Organisation von Veranstaltungen und Verwaltung von Anmeldungen", "Veranstaltungsanmeldedaten"],
            ["Verwaltung von Guest Passes für von Mitgliedern eingeladene Gäste", "Guest Pass-Daten"],
            ["Versand von Newslettern und Vereinsmitteilungen", "Newsletter-Abonnementdaten"],
            [
              "Verwaltung von Inhalten, Mitgliedern und ICF-Integration",
              "Daten von Mitarbeitenden/CMS-Nutzenden, Daten aus der ICF Global-Integration",
            ],
            ["Erfüllung gesetzlicher und regulatorischer Verpflichtungen", "Verschiedene, je nach Erfordernis"],
          ]}
        />

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">Rechtlicher Rahmen nach schweizerischem Recht</h4>
          <p className="text-foreground/80">Nach dem schweizerischen Datenschutzgesetz (DSG) ist die Bearbeitung von Personendaten durch Private grundsätzlich zulässig, sofern sie die Grundsätze von Art. 6 DSG (Rechtmässigkeit, Treu und Glauben, Verhältnismässigkeit, Zweckbindung, Transparenz, Datenrichtigkeit und Datensicherheit) einhält und die Persönlichkeit der betroffenen Person nicht verletzt.</p>
          <p className="text-foreground/80">Soweit eine Bearbeitung die Persönlichkeit verletzen könnte, kann sie gerechtfertigt sein durch:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>die Einwilligung der betroffenen Person,</li>
            <li>eine gesetzliche Verpflichtung oder</li>
            <li>ein überwiegendes privates oder öffentliches Interesse (Art. 31 DSG).</li>
          </ul>
          <p className="text-foreground/80">Für die oben beschriebenen Bearbeitungen gilt:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Newsletter-Abonnements</strong> beruhen auf Ihrer ausdrücklichen Einwilligung. Sie können sich jederzeit abmelden.</li>
            <li>
              <strong>Profile im Coach-Verzeichnis</strong> werden im Rahmen der Teilnahme des Mitglieds am Verein unter Berücksichtigung seiner Sichtbarkeitseinstellungen veröffentlicht. Ein Profil wird nur veröffentlicht, wenn das Mitglied die Sichtbarkeit auf &quot;veröffentlicht&quot; setzt. Profile sind standardmässig unveröffentlicht. Mitglieder können ihr Profil jederzeit ausblenden oder entfernen.</li>
            <li>
              <strong>Bearbeitung technischer Daten</strong> ist für den Betrieb und die Sicherheit der Website erforderlich.</li>
            <li>
              <strong>Mitgliederdaten und ICF Global-Integration</strong> dienen der Erfüllung des Mitgliedschaftsverhältnisses und des Vereinszwecks.</li>
            <li>
              <strong>Veranstaltungsanmeldedaten</strong> werden zur Organisation von Veranstaltungen und zur Verwaltung der Teilnahme bearbeitet.</li>
            <li>
              <strong>Guest Pass-Daten</strong> werden bearbeitet, um den Pass zu prüfen, den kostenlosen Platz des Gastes vorzubereiten und ihn zu dieser Veranstaltung zu kontaktieren. Eine darüber hinausgehende Kontaktaufnahme beruht auf einer gesonderten Einwilligung des Gastes, die jederzeit widerrufen werden kann.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">Soweit zusätzlich die DSGVO anwendbar ist</h4>
          <p className="text-foreground/80">Soweit die Bearbeitung auch Personen im Europäischen Wirtschaftsraum betrifft und die DSGVO anwendbar ist, kommen insbesondere folgende Rechtsgrundlagen in Betracht: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), Erforderlichkeit zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO) und berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO).</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">4a. Woher beziehen wir Ihre Personendaten?</h3>
        <p className="text-foreground/80">Wir beziehen Personendaten aus folgenden Quellen:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Direkt von Ihnen</strong>: wenn Sie uns kontaktieren, den Newsletter abonnieren, sich für eine Veranstaltung anmelden, ein Mitgliederkonto erstellen oder verwalten oder Ihr Profil im Coach-Verzeichnis bearbeiten.</li>
          <li>
            <strong>Von ICF Global</strong>: über die automatisierte nächtliche Synchronisierung der Mitgliederdaten (siehe Ziffer 3h).</li>
          <li>
            <strong>Von einem einladenden Mitglied</strong>: Ein Mitglied, das einen Guest Pass beantragt, gibt uns den Namen und die E-Mail-Adresse des Gastes, damit wir ihn einladen können, seine Angaben selbst zu vervollständigen.</li>
          <li>
            <strong>Aus technischen Systemen</strong>: technische Daten, die beim Besuch der Website automatisch erhoben werden (siehe Ziffer 3a).</li>
          <li>
            <strong>Von Dienstleistungsanbietern</strong>: ICF Global (Mitgliederdatensätze über die nächtliche Synchronisierung) und MailerLite (Newsletter-Anmeldungen über die Website).</li>
        </ul>
        <p className="text-foreground/80">Wenn wir Personendaten beziehen, die nicht direkt bei Ihnen erhoben wurden (Art. 19 Abs. 3 DSG), informieren wir Sie über die Herkunft der Daten und die Kategorien der bearbeiteten Daten.</p>
      </div>
    </>
  );
}

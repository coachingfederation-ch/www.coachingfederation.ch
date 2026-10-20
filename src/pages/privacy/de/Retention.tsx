import { Table } from "../shared";

export function RetentionSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">7. Wie lange speichern wir Ihre Daten?</h3>
        <p className="text-foreground/80">Wir bewahren Personendaten nur so lange auf, wie dies zur Erfüllung der Erhebungszwecke erforderlich oder gesetzlich vorgeschrieben ist. Es gelten folgende Aufbewahrungsfristen:</p>
        <Table
          headers={["Kategorie", "Aufbewahrungsdauer / Kriterien"]}
          rows={[
            [
              "Technische Daten (Protokolle)",
              "Lovable bewahrt Protokolldaten so lange auf, wie dies für Sicherheits- und Plattformzwecke erforderlich ist (siehe Ziffer 5b)",
            ],
            [
              "Kontaktanfragen",
              "Für die Dauer der Anfrage und weitere 3 Monate zur Nachbearbeitung. Der vorübergehende Datensatz, der während des Wartens auf Ihre E-Mail-Bestätigung einer Website-Anfrage erstellt wird, wird durch einen automatischen täglichen Vorgang sieben Tage nach Erstellung gelöscht, unabhängig davon, ob die Anfrage bestätigt wurde",
            ],

            [
              "Newsletter-Abonnements",
              "Bis zur Abmeldung; eine Sperrliste wird aufbewahrt, um eine erneute Anmeldung ohne Einwilligung zu verhindern",
            ],
            [
              "Mitgliederkontodaten",
              "Für die Dauer der ICF-Mitgliedschaft; Löschung oder Anonymisierung 90 Tage nach deren Ende",
            ],
            [
              "Profile im Coach-Verzeichnis",
              "Solange das Mitglied ein öffentliches Profil unterhält; Entfernung bei Deaktivierung des Profils durch das Mitglied oder bei Ende der Mitgliedschaft",
            ],
            [
              "Veranstaltungsanmeldedaten",
              "Für die Dauer der Veranstaltung und weitere 12 Monate für Buchhaltung und Nachbearbeitung",
            ],
            [
              "Umfrageantworten",
              "12 Monate nach Abschluss der Umfrage",
            ],
            [
              "Guest Pass-Datensätze",
              "12 Monate nach Veranstaltungsende; Löschung durch einen automatischen täglichen Vorgang und gleichzeitige Anonymisierung der kostenlosen Anmeldung. Der Widerruf der Einwilligung in weitere Kontakte beendet diese, führt jedoch nicht zur vorzeitigen Löschung des Datensatzes",
            ],
            [
              "Rückmeldungen zu Artikeln",
              "Anonyme Bewertungen, Themenwünsche und Kommentare werden 24 Monate zur redaktionellen Planung aufbewahrt. Eine E-Mail-Adresse wird nur gespeichert, wenn Sie diese selbst angeben, und ausschliesslich für eine Rückfrage zu Ihrer Rückmeldung verwendet",
            ],

            [
              "Daten von CMS-Nutzenden/Mitarbeitenden",
              "Für die Dauer der Funktion; Löschung 90 Tage nach Entzug des Zugriffs",
            ],
            [
              "Daten aus der ICF Global-Integration",
              "Nächtliche Synchronisierung; Aufbewahrung entsprechend dem Mitgliedschaftsstatus",
            ],
            [
              "Zahlungs- und Rechnungsunterlagen",
              "10 Jahre gemäss schweizerischem Rechnungslegungsrecht (Art. 958f OR)",
            ],
          ]}
        />
        <p className="text-foreground/80">Soweit gesetzliche oder regulatorische Verpflichtungen eine längere Aufbewahrung verlangen (z. B. Buchhaltungsunterlagen nach schweizerischem Steuer- und Handelsrecht), werden die Daten während der gesetzlich vorgeschriebenen Dauer aufbewahrt.</p>
      </div>
    </>
  );
}

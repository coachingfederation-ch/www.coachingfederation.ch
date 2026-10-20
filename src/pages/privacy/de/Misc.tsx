import { MailLink } from "../shared";

export function MiscSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">12. Daten von Kindern</h3>
        <p className="text-foreground/80">Unsere Website richtet sich nicht an Kinder unter 16 Jahren. Wir erheben wissentlich keine Personendaten von Kindern unter 16 Jahren. Wenn Sie der Ansicht sind, dass wir Personendaten eines Kindes erhoben haben, kontaktieren Sie uns bitte. Wir werden Massnahmen zur Löschung dieser Daten ergreifen.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">13. Änderungen dieser Datenschutzerklärung</h3>
        <p className="text-foreground/80">Wir können diese Datenschutzerklärung von Zeit zu Zeit aktualisieren, um Änderungen unserer Datenbearbeitung, der gesetzlichen Anforderungen oder unserer angebotenen Dienstleistungen Rechnung zu tragen. Die aktuelle Fassung ist stets auf dieser Seite verfügbar. Wir empfehlen Ihnen, diese Seite regelmässig zu prüfen.</p>
        <p className="text-foreground/80">Das Datum der letzten Aktualisierung ist am Ende dieser Seite angegeben.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">14. Kontakt</h3>
        <p className="text-foreground/80">Bei Fragen zu dieser Datenschutzerklärung oder zu unserer Datenbearbeitung wenden Sie sich bitte an:</p>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p className="mt-2">Weitegasse 6</p>
          <p>9320 Arbon</p>
          <p>Schweiz</p>
          <p className="mt-2">E-Mail: <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Zuletzt aktualisiert: 20. Oktober 2026</p>
    </>
  );
}

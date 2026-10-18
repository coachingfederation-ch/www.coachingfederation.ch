import { ExternalLink, MailLink } from "../shared";

export function ControllerSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">1. Wer ist verantwortlich?</h3>
        <p className="text-foreground/80">Verantwortlich für die Bearbeitung von Personendaten auf dieser Website ist:</p>
        <div className="space-y-2 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p>Verein nach schweizerischem Recht</p>
          <p>UID: CHE-205.048.647</p>
        </div>
        <address className="not-italic text-foreground/80">Weitegasse 6<br />9320 Arbon<br />Schweiz</address>
        <p className="text-foreground/80">E-Mail: <MailLink address="office@coachingfederation.ch" />
        </p>
        <p className="text-foreground/80">Bei Fragen zum Datenschutz können Sie sich unter der oben angegebenen E-Mail-Adresse an uns wenden.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">2. Worum geht es in dieser Datenschutzerklärung?</h3>
        <p className="text-foreground/80">Diese Datenschutzerklärung beschreibt, wie The Switzerland Chapter of ICF (&quot;wir&quot;, &quot;der Verein&quot;) Personendaten auf und im Zusammenhang mit der Website{" "}<ExternalLink href="https://www.coachingfederation.ch">www.coachingfederation.ch</ExternalLink> bearbeitet. Sie gilt für:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Öffentliche Website</strong>: Startseite, Veranstaltungsübersicht, Blog (&quot;Insights&quot;), Seiten über uns, Coach-Verzeichnis</li>
          <li>
            <strong>Coach-Verzeichnis</strong> (&quot;Find a Coach&quot;): öffentliche Profile von ICF-Mitgliedern</li>
          <li>
            <strong>Mitgliederbereich</strong>: Bereich, in dem Mitglieder ihr eigenes Verzeichnisprofil und ihr Konto verwalten</li>
          <li>
            <strong>Werkzeuge für Mitarbeitende</strong>: CMS, Mitgliederverwaltung und Steuerung der ICF-Integration</li>
          <li>
            <strong>Newsletter und Mitteilungen</strong>: E-Mail-Abonnements über die Website</li>
          <li>
            <strong>Kontakt- und Veranstaltungsanmeldeformulare</strong>: Formulare, über die Personendaten übermittelt werden</li>
        </ul>
        <p className="text-foreground/80">Diese Datenschutzerklärung richtet sich nach dem schweizerischen Bundesgesetz über den Datenschutz (DSG, SR 235.1). Soweit die Bearbeitung auch Personen im Europäischen Wirtschaftsraum betrifft, kann zusätzlich die Datenschutz-Grundverordnung (DSGVO) anwendbar sein.</p>
      </div>
    </>
  );
}

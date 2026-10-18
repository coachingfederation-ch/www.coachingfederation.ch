import { ExternalLink, MailLink } from "../shared";

export function RightsSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">9. Welche Datenschutzrechte haben Sie?</h3>
        <p className="text-foreground/80">Nach dem schweizerischen Datenschutzgesetz (DSG) stehen Ihnen hinsichtlich Ihrer Personendaten folgende Rechte zu:</p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>Auskunftsrecht</strong>: Sie können Auskunft darüber verlangen, ob wir Personendaten über Sie bearbeiten und gegebenenfalls welche Daten bearbeitet werden (Art. 25 DSG).</li>
          <li>
            <strong>Recht auf Berichtigung</strong>: Sie können die Berichtigung unrichtiger oder unvollständiger Personendaten verlangen (Art. 32 DSG).</li>
          <li>
            <strong>Recht auf Löschung</strong>: Sie können die Löschung Ihrer Personendaten verlangen, vorbehaltlich gesetzlicher Aufbewahrungspflichten und anderer Ausnahmen (Art. 32 DSG).</li>
          <li>
            <strong>Widerspruchsrecht</strong>: Sie können unter bestimmten Umständen der Bearbeitung Ihrer Personendaten widersprechen, insbesondere wenn die Bearbeitung auf einem überwiegenden Interesse (Art. 31 DSG) oder, soweit die DSGVO anwendbar ist, auf berechtigten Interessen (Art. 21 DSGVO) beruht.</li>
          <li>
            <strong>Recht auf Datenherausgabe und -übertragung</strong>: Sie können verlangen, dass wir Ihnen Ihre Personendaten in einem strukturierten, gängigen und maschinenlesbaren Format zur Verfügung stellen (Art. 28 DSG).</li>
          <li>
            <strong>Recht auf Widerruf der Einwilligung</strong>: Soweit die Bearbeitung auf Ihrer Einwilligung beruht, können Sie diese jederzeit widerrufen. Die Rechtmässigkeit der vor dem Widerruf erfolgten Bearbeitung bleibt davon unberührt.</li>
          <li>
            <strong>Recht auf Beschwerde</strong>: Sie haben das Recht, sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren:</li>
        </ul>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)</p>
          <p className="mt-2">Feldeggweg 1</p>
          <p>3003 Bern</p>
          <p>Schweiz</p>
          <p className="mt-2">Website:{" "}<ExternalLink href="https://www.edoeb.admin.ch">www.edoeb.admin.ch</ExternalLink>
          </p>
        </div>
        <p className="text-foreground/80">Zur Ausübung dieser Rechte kontaktieren Sie uns bitte unter{" "}<MailLink address="office@coachingfederation.ch" />. Wir beantworten Ihr Gesuch innert 30 Tagen. In komplexen Fällen kann diese Frist verlängert werden. Wir informieren Sie über eine allfällige Verlängerung und deren Gründe.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">10. Automatisierte Einzelentscheidungen</h3>
        <p className="text-foreground/80">Wir treffen keine Entscheidungen, die ausschliesslich auf einer automatisierten Bearbeitung beruhen und für Sie mit einer Rechtsfolge verbunden sind oder Sie erheblich beeinträchtigen (Art. 21 DSG). Insbesondere gilt:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Die Suche und Filterung im Coach-Verzeichnis helfen Besuchenden, Coaches zu finden. Sie treffen keine automatisierten Entscheidungen über Personen.</li>
          <li>Die Erstellung von Mitgliederkonten und die Profilverwaltung unterliegen menschlicher Aufsicht.</li>
          <li>Es findet kein Profiling statt, das für Sie rechtliche oder ähnlich erhebliche Auswirkungen hätte.</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">11. Wie schützen wir Ihre Daten?</h3>
        <p className="text-foreground/80">Wir treffen angemessene technische und organisatorische Massnahmen, um Personendaten vor unbefugtem Zugriff, Verlust, Vernichtung oder Veränderung zu schützen. Dazu gehören:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Verschlüsselte Datenübertragung (TLS/SSL)</li>
          <li>Rollenbasierte Zugriffskontrollen und Authentifizierung</li>
          <li>Regelmässige Sicherheitsüberprüfungen unserer Systeme</li>
          <li>Speicherung in einer verwalteten Datenbank mit Sicherheitsrichtlinien auf Zeilenebene</li>
          <li>Hosting der Daten auf einer SOC 2 Type II- und ISO 27001-zertifizierten Infrastruktur unserer Hosting-Plattform (siehe Ziffer 5b)</li>
        </ul>
        <p className="text-foreground/80">Kommt es zu einer Verletzung der Datensicherheit, die voraussichtlich zu einem hohen Risiko für Ihre Rechte und Freiheiten führt, melden wir dies dem EDÖB gemäss Art. 24 DSG so rasch als möglich.</p>
      </div>
    </>
  );
}

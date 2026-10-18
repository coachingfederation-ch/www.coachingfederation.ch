import { Table } from "../shared";

export function DataTransfersSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">6. Werden Daten ins Ausland bekanntgegeben?</h3>
        <p className="text-foreground/80">Personendaten, die im Zusammenhang mit unserer Website bearbeitet werden, können ins Ausland bekanntgegeben werden. Folgende Bekanntgaben sind bekannt oder zu erwarten:</p>
        <p className="text-foreground/80">
          <strong>Kundendaten</strong> (Mitgliederkonten, Coach-Profile, Veranstaltungsanmeldungen, Newsletter-Abonnements) werden über Lovable Cloud in der Supabase-Region Europa (Irland) gespeichert. Die EU und der EWR gelten nach schweizerischem Recht als Gebiete mit angemessenem Datenschutz (Art. 16 Abs. 1 DSG), weshalb für diese Speicherung keine zusätzlichen Garantien erforderlich sind.</p>
        <p className="text-foreground/80">Lovable Labs Inc. (ein US-Unternehmen) hat jedoch als Auftragsbearbeiter Zugriff auf diese Daten. Die Dienstdaten von Lovable (technische Protokolle, Nutzungstelemetrie) werden in den Vereinigten Staaten bearbeitet. Diese Bekanntgaben sind durch die nachfolgend aufgeführten Garantien abgesichert.</p>
        <Table
          headers={["Empfänger", "Land / Region", "Garantie"]}
          rows={[
            [
              "Lovable (Lovable Labs Inc.)",
              "Vereinigte Staaten (Delaware)",
              "EU-Standarddatenschutzklauseln, Modul 2 (Verantwortlicher an Auftragsbearbeiter), angewendet auf Bekanntgaben aus der Schweiz; UK Addendum. Siehe Auftragsbearbeitungsvereinbarung von Lovable",
            ],
            [
              "Unterauftragsbearbeiter von Lovable",
              "Verschiedene (siehe trust.lovable.dev)",
              "Vertragliche Verpflichtungen, die den Auftragsbearbeitungsvereinbarungen von Lovable entsprechen",
            ],
            [
              "Supabase (über Lovable Cloud)",
              "Europa (Irland)",
              "Unterauftragsbearbeiter von Lovable; durch dessen Auftragsbearbeitungsvereinbarung abgedeckt. EU/EWR nach schweizerischem DSG als angemessen anerkannt",
            ],
            [
              "Cloudflare",
              "Globales Netzwerk",
              "Edge-Routing, DNS und Workers (CDN). Unterauftragsbearbeiter von Lovable; durch dessen Auftragsbearbeitungsvereinbarung abgedeckt",
            ],
            [
              "MailerLite",
              "Europäische Union (Deutschland)",
              "EU/EWR nach schweizerischem DSG als angemessen anerkannt; Auftragsbearbeitungsnachtrag von MailerLite",
            ],
            [
              "Stripe",
              "Vereinigte Staaten",
              "Standarddatenschutzklauseln; Auftragsbearbeitungsvereinbarung von Stripe",
            ],
            [
              "ICF Global",
              "Vereinigte Staaten (Verwaltung durch Associations International)",
              "Chapter Agreement und API Agreement mit ICF Global",
            ],
            [
              "Google Maps (Google LLC)",
              "Vereinigte Staaten",
              "EU-Standarddatenschutzklauseln / Swiss-US Data Privacy Framework (Google)",
            ],
            [
              "Unsplash (Unsplash Inc.)",
              "Vereinigte Staaten",
              "Nur Nutzung durch Mitarbeitende (CMS-Bildauswahl); keine Besucherdaten",
            ],
            [
              "OpenAI (über Lovable AI Gateway)",
              "Vereinigte Staaten",
              "Unterauftragsbearbeiter von Lovable, durch dessen Auftragsbearbeitungsvereinbarung abgedeckt; keine Verwendung zum Modelltraining",
            ],
          ]}
        />
        <p className="text-foreground/80">Bei Bekanntgaben in Länder ohne angemessenes Datenschutzniveau nach schweizerischem Recht stellen wir sicher, dass geeignete Garantien bestehen, insbesondere:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Standarddatenschutzklauseln (SCC) oder gleichwertige vertragliche Garantien</li>
          <li>Verbindliche unternehmensinterne Datenschutzvorschriften (soweit anwendbar)</li>
          <li>Besondere Ausnahmen gemäss Art. 16 Abs. 2 DSG</li>
        </ul>
      </div>
    </>
  );
}

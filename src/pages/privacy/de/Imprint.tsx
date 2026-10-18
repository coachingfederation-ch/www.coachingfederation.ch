import { ExternalLink, MailLink } from "../shared";

export function ImprintSection() {
  return (
    <>
      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Impressum</h2>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Anbieter</h3>
          <div className="space-y-2 text-foreground/80">
            <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
            <p>Rechtsform: Verein nach schweizerischem Recht</p>
            <p>UID: CHE-205.048.647</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Adresse</h3>
          <address className="not-italic text-foreground/80">Weitegasse 6<br />9320 Arbon<br />Schweiz</address>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Kontakt</h3>
          <div className="space-y-2 text-foreground/80">
            <p>E-Mail: <MailLink address="office@coachingfederation.ch" />
            </p>
            <p>Website:{" "}<ExternalLink href="https://www.coachingfederation.ch">www.coachingfederation.ch</ExternalLink>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Verantwortlich für den Inhalt</h3>
          <p className="text-foreground/80">Der Vorstand von The Switzerland Chapter of ICF ist nach schweizerischem Recht für den Inhalt dieser Website verantwortlich.</p>
          <p className="text-foreground/80">Kontakt: <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Haftung für Inhalte</h3>
          <p className="text-foreground/80">Die Inhalte dieser Website wurden mit grösstmöglicher Sorgfalt erstellt. The Switzerland Chapter of ICF übernimmt jedoch keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Informationen. Haftungsansprüche gegen The Switzerland Chapter of ICF wegen materieller oder immaterieller Schäden, die durch die Nutzung oder Nichtnutzung der bereitgestellten Informationen oder durch die Nutzung unrichtiger oder unvollständiger Informationen entstehen, sind ausgeschlossen, soweit dies nach schweizerischem Recht zulässig ist.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Haftung für Links</h3>
          <p className="text-foreground/80">Diese Website kann Links zu externen Websites Dritter enthalten, auf deren Inhalte The Switzerland Chapter of ICF keinen Einfluss hat. The Switzerland Chapter of ICF übernimmt daher keine Haftung für die Inhalte externer Websites. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Urheberrecht</h3>
          <p className="text-foreground/80">Die auf dieser Website veröffentlichten Inhalte und Werke, einschliesslich Texte, Bilder, Grafiken und Gestaltungselemente, unterliegen dem schweizerischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Form der kommerziellen Nutzung der Inhalte ausserhalb der urheberrechtlichen Schranken bedürfen der schriftlichen Zustimmung von The Switzerland Chapter of ICF oder gegebenenfalls der jeweiligen Rechteinhaber.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">Anwendbares Recht</h3>
          <p className="text-foreground/80">Dieses Impressum und sämtliche Rechtsbeziehungen, die sich aus der Nutzung dieser Website ergeben, unterliegen schweizerischem Recht.</p>
        </div>
      </section>
    </>
  );
}

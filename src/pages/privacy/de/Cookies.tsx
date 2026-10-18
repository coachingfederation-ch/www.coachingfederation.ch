import { InfoCallout } from "../shared";

export function CookiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">8. Cookies und ähnliche Technologien</h3>
        <p className="text-foreground/80">Unsere Website setzt nur ein technisch notwendiges Cookie (__cf_bm) ein. Es wird von unserem Hosting-Netzwerk Cloudflare gesetzt, um echte Besucherinnen und Besucher von Bots zu unterscheiden. Es enthält kein persönliches Profil, wird nicht zur Nachverfolgung verwendet und verfällt nach 30 Minuten. Wir setzen keine Analyse-, Marketing- oder Tracking-Cookies ein.</p>
        <p className="text-foreground/80">Für einige wenige technische Funktionen verwenden wir anstelle von Cookies den{" "}<strong>lokalen Speicher</strong> Ihres Browsers (localStorage und sessionStorage): zum Speichern Ihrer Sprachpräferenz, zum Zwischenspeichern von Entwürfen während der Eingabe (CMS-Editor, Veranstaltungsanmeldung), zum Aufbewahren des Chatverlaufs des Assistenz-Widgets und zum Merken geschlossener Hinweise. Diese Daten verbleiben in Ihrem Browser. Wir verwenden diese Technologien weder zur Nachverfolgung noch zu Werbezwecken und setzen kein Fingerprinting oder ähnliche Verfahren ein.</p>
        <InfoCallout>
          <p>Da wir ausschliesslich ein unbedingt erforderliches Sicherheits-Cookie und keine Tracking- oder Werbetechnologien einsetzen, ist kein Cookie-Einwilligungsbanner erforderlich. Sollte sich dies ändern, werden wir diese Erklärung aktualisieren und einen Einwilligungsmechanismus einführen.</p>
        </InfoCallout>

        <h4 className="text-base font-semibold tracking-tight">Cookies und Website-Daten verwalten</h4>
        <p className="text-foreground/80">Sie können Cookies und Website-Daten über die Einstellungen Ihres Browsers verwalten und löschen.</p>
      </div>
    </>
  );
}

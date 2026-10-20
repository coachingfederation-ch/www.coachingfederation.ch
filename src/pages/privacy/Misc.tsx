/**
 * Privacy policy sections 12-14: children's data, policy changes, and contact.
 * Exports: MiscSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { MailLink } from "./shared";

export function MiscSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">12. Data of children</h3>
        <p className="text-foreground/80">
          Our website is not directed at children under 16. We do not knowingly collect personal
          data from children under 16. If you believe we have collected personal data from a child,
          please contact us and we will take steps to delete the data.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">13. Changes to this privacy policy</h3>
        <p className="text-foreground/80">
          We may update this privacy policy from time to time to reflect changes in our data
          processing practices, legal requirements, or the services we offer. The current version
          will always be available on this page. We recommend that you review this page
          periodically.
        </p>
        <p className="text-foreground/80">
          The date of the last update will be indicated at the bottom of this page.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">14. Contact</h3>
        <p className="text-foreground/80">
          If you have any questions about this privacy policy or our data processing practices,
          please contact:
        </p>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p className="mt-2">Weitegasse 6</p>
          <p>9320 Arbon</p>
          <p>Switzerland</p>
          <p className="mt-2">
            Email: <MailLink address="office@coachingfederation.ch" />
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Last updated: October 20, 2026</p>
    </>
  );
}

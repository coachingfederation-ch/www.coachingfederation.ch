/**
 * Appendix section of the Privacy page: remaining internal items to confirm before publishing.
 * Exports: AppendixSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
export function AppendixSection() {
  return (
    <>
      <section className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">
          Appendix: Items to confirm before publishing
        </h2>
        <p className="text-foreground/80">
          Most items previously listed in this appendix have been confirmed and are now reflected in
          the policy text above (services and providers, data details, retention periods, cookies,
          and Lovable/Cloudflare/Stripe/ICF Global arrangements). The following items remain open
          and must be resolved before publication:
        </p>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">A. Organisation and governance</h3>
          <ol className="list-decimal space-y-2 pl-5 text-foreground/80">
            <li>
              <strong>Data Protection Adviser</strong> — Has The Switzerland Chapter of ICF
              designated a Data Protection Adviser (Datenschutzberater) under Art. 14 DPO? If so,
              their name and contact should be in Section 1.
            </li>
            <li>
              <strong>Board contact</strong> — Should a named board member (e.g., President) be
              listed as responsible for content in the Imprint? Currently, &quot;The Board&quot; is
              used generically.
            </li>
          </ol>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold tracking-tight">F. Legal review</h3>
          <ol className="list-decimal space-y-2 pl-5 text-foreground/80">
            <li>
              <strong>Swiss legal counsel</strong> — This draft should be reviewed by a
              Swiss-qualified lawyer before publication to ensure full compliance with the DSG, DPO,
              and UWG.
            </li>
            <li>
              <strong>GDPR applicability</strong> — If the website is accessible to users in the
              EU/EEA (which it is), consider whether additional GDPR-specific provisions should be
              included.
            </li>
            <li>
              <strong>Association statutes</strong> — Verify that the data processing described here
              aligns with the association&apos;s statutes (Statuten) regarding member data, as the
              board is responsible under association law.
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}

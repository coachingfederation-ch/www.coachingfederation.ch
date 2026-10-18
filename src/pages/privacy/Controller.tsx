/**
 * Privacy policy sections 1-2: who is responsible and scope of the policy.
 * Exports: ControllerSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { ExternalLink, MailLink } from "./shared";

export function ControllerSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">1. Who is responsible?</h3>
        <p className="text-foreground/80">
          The controller responsible for the processing of personal data on this website is:
        </p>
        <div className="space-y-2 text-foreground/80">
          <p className="font-semibold text-foreground">The Switzerland Chapter of ICF</p>
          <p>Association (Verein) under Swiss law</p>
          <p>UID: CHE-205.048.647</p>
        </div>
        <address className="not-italic text-foreground/80">
          Weitegasse 6
          <br />
          9320 Arbon
          <br />
          Switzerland
        </address>
        <p className="text-foreground/80">
          Email: <MailLink address="office@coachingfederation.ch" />
        </p>
        <p className="text-foreground/80">
          For any questions regarding data protection, you may contact us at the email address
          above.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          2. What is this privacy policy about?
        </h3>
        <p className="text-foreground/80">
          This privacy policy describes how The Switzerland Chapter of ICF (&quot;we&quot;,
          &quot;the association&quot;) processes personal data on and in connection with the website{" "}
          <ExternalLink href="https://www.coachingfederation.ch">
            www.coachingfederation.ch
          </ExternalLink>
          . It applies to:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Public website</strong> — homepage, events listings, blog
            (&quot;Insights&quot;), about pages, coach directory
          </li>
          <li>
            <strong>Coach directory</strong> (&quot;Find a Coach&quot;) — public profiles of ICF
            members
          </li>
          <li>
            <strong>Member area</strong> — where members manage their own directory profile and
            account
          </li>
          <li>
            <strong>Staff tooling</strong> — CMS, member administration, and ICF integration
            controls
          </li>
          <li>
            <strong>Newsletter and communications</strong> — email subscriptions via the website
          </li>
          <li>
            <strong>Contact and event registration forms</strong> — where personal data is submitted
          </li>
        </ul>
        <p className="text-foreground/80">
          This privacy policy is written to comply with the Swiss Federal Act on Data Protection
          (DSG, SR 235.1). Where the processing also affects individuals in the European Economic
          Area, the General Data Protection Regulation (GDPR) may additionally apply.
        </p>
      </div>
    </>
  );
}

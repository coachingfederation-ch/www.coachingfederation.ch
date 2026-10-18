/**
 * Privacy policy section 8: cookies and similar technologies.
 * Exports: CookiesSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { InfoCallout } from "./shared";

export function CookiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          8. Cookies and similar technologies
        </h3>
        <p className="text-foreground/80">
          Our website sets only one technically necessary cookie (__cf_bm), placed by our hosting
          network Cloudflare to distinguish real visitors from bots. It contains no personal
          profile, is not used for tracking and expires after 30 minutes. We set no analytics,
          marketing or tracking cookies.
        </p>
        <p className="text-foreground/80">
          For a small number of technical functions we use your browser&apos;s{" "}
          <strong>local storage</strong> (localStorage and sessionStorage) rather than cookies:
          remembering your language preference, saving draft content while you write (CMS editor,
          event registration), keeping chat history for the assistant widget, and remembering
          dismissed notices. This data stays in your browser. We do not use these technologies for
          tracking or advertising, and we do not use fingerprinting or similar techniques.
        </p>
        <InfoCallout>
          <p>
            Because we only use a strictly necessary security cookie and no tracking or advertising
            technologies, no cookie consent banner is required. If this changes, we will update this
            policy and implement a consent mechanism.
          </p>
        </InfoCallout>

        <h4 className="text-base font-semibold tracking-tight">Managing cookies and site data</h4>
        <p className="text-foreground/80">
          You can control and delete cookies and site data through your browser settings.
        </p>
      </div>
    </>
  );
}

/**
 * Privacy policy section 8: cookies and similar technologies.
 * Exports: CookiesSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { ExternalLink, InfoCallout } from "./shared";

export function CookiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          8. Cookies and similar technologies
        </h3>
        <p className="text-foreground/80">
          Our website does not set any cookies. The EDÖB provides guidance on the use of cookies and
          similar technologies under the DSG and the Telecommunications Act (TCA) ({" "}
          <ExternalLink href="https://www.edoeb.admin.ch/dam/de/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20V.%201.1%20vom%2006.10.2025_DE.pdf">
            EDÖB cookie guidelines
          </ExternalLink>
          ).
        </p>
        <p className="text-foreground/80">
          <strong>Plausible Analytics</strong>, our only analytics service, is cookieless: it
          records aggregated page views and a small number of goals without setting cookies, without
          cross-site tracking and without identifying individual visitors (see Section 5d).
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
            Because we set no non-essential cookies and use no tracking or advertising technologies,
            no cookie consent banner is required. If cookies or tracking are introduced in the
            future, this policy will be updated and a consent mechanism implemented.
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

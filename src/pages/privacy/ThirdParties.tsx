/**
 * Privacy policy section 5: recipients of personal data (hosting, platform, sub-processors).
 * Exports: ThirdPartiesSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { ExternalLink, MailLink } from "./shared";

export function ThirdPartiesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">5. Who receives your data?</h3>
        <p className="text-foreground/80">
          We share personal data with the following categories of recipients:
        </p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            a) Hosting and infrastructure providers
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Supabase</strong> — provides the database, authentication, file storage, and
              real-time infrastructure for our website. Supabase is accessed through Lovable Cloud,
              meaning Supabase is a sub-processor of Lovable, not a direct processor of The
              Switzerland Chapter of ICF. Personal data stored in Supabase is processed under
              Lovable&apos;s data processing agreement. Data residency: Europe (Ireland) — the
              Lovable Cloud project is configured to store data in the EU (Ireland) region. The
              EU/EEA is recognised as having an adequate level of data protection under Swiss law.
            </li>
            <li>
              <strong>Cloudflare</strong> — provides edge routing, DNS, and Workers (content
              delivery network) as part of the Lovable hosting platform, serving the site over
              Cloudflare&apos;s global edge network. Cloudflare is a sub-processor of Lovable; its
              data processing is covered by Lovable&apos;s data processing agreement.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            b) Website platform and hosting — Lovable
          </h4>
          <p className="text-foreground/80">
            The Switzerland Chapter of ICF website is hosted and operated on the{" "}
            <strong>Lovable</strong> platform (Lovable Labs Incorporated, a US company). Lovable
            provides the web application hosting, development tools, and deployment infrastructure
            for coachingfederation.ch.
          </p>
          <p className="text-foreground/80">
            Lovable processes personal data as a <strong>data processor</strong> on behalf of The
            Switzerland Chapter of ICF. Key details from{" "}
            <ExternalLink href="https://lovable.dev/privacy">
              Lovable&apos;s Privacy Policy
            </ExternalLink>{" "}
            (last updated April 2026):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Legal entity:</strong> Lovable Labs Incorporated (Delaware, USA)
            </li>
            <li>
              <strong>EU representative:</strong> Lovable Labs AB, Regeringsgatan 25, 111 53
              Stockholm, Sweden
            </li>
            <li>
              <strong>DPO contact:</strong> <MailLink address="dpo@lovable.dev" />
            </li>
            <li>
              <strong>Role:</strong> Lovable processes Customer Data (website content, user data,
              application data) as a data processor. Lovable also collects Service Data (usage
              telemetry, IP addresses, browser data, error logs) as an independent controller for
              its own security, billing, analytics, and product-improvement purposes.
            </li>
            <li>
              <strong>Hosting infrastructure:</strong> Lovable Cloud stores and processes all
              Customer Data — including the website&apos;s database, authentication, file storage,
              and application data — on Supabase infrastructure. Supabase is a sub-processor of
              Lovable, accessed through Lovable Cloud. The Switzerland Chapter of ICF does not have
              a direct contractual relationship with Supabase. We use Lovable&apos;s AI Gateway,
              which transmits data to third-party AI providers (currently OpenAI).
            </li>
            <li>
              <strong>Sub-processors:</strong> Lovable engages sub-processors including Google Cloud
              Platform (hosting), Cloudflare (edge routing, DNS and CDN), Supabase (database and
              authentication), Stripe (payments), and OpenAI (AI Gateway). The full list is
              available at{" "}
              <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink>.
            </li>
            <li>
              <strong>International transfers:</strong> Lovable may transfer Personal Data to the
              United States. Lovable safeguards these transfers through EU Standard Contractual
              Clauses (Module 2, Controller-to-Processor), the UK International Data Transfer
              Addendum, and a Swiss Addendum adapting the SCCs to the revised Swiss FADP, naming the
              FDPIC as the competent authority.
            </li>
            <li>
              <strong>Data retention:</strong> Lovable retains Log Data for up to 90 days; Customer
              Data is deleted within 30 days after account termination.
            </li>
            <li>
              <strong>Security:</strong> SOC 2 Type II and ISO 27001 certified data centers,
              role-based access controls, MFA, encrypted data in transit and at rest, continuous
              backups, 24/7 incident response.
            </li>
            <li>
              <strong>Cookies on the Lovable platform:</strong> Lovable uses cookies on its own
              platform (PostHog, Google Analytics, TikTok, Facebook/Meta, Google Ads). These apply
              only to site administrators using the Lovable editor and are not set for visitors of
              coachingfederation.ch.
            </li>
          </ul>
          <p className="text-foreground/80">
            We operate on Lovable&apos;s <strong>Business plan</strong>, which includes a Data
            Processing Agreement (DPA) with Lovable. We have reviewed Lovable&apos;s full
            sub-processor list at{" "}
            <ExternalLink href="https://trust.lovable.dev">trust.lovable.dev</ExternalLink> and
            verified that it aligns with our data processing needs.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            c) Email and communication providers
          </h4>
          <p className="text-foreground/80">
            We use <strong>MailerLite</strong> (MailerLite Ltd, Lithuania) to send our newsletter
            and transactional emails. MailerLite processes data on servers within the European Union
            (Germany), provides a Data Processing Addendum, and the EU/EEA is recognised as having
            an adequate level of data protection under Swiss law.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Analytics providers</h4>
          <p className="text-foreground/80">
            We use Plausible Analytics (Plausible Insights OÜ, Estonia) to understand how this
            website is used. Plausible is cookieless and privacy-focused: it records aggregated page
            views and a small number of goals (for example a deck download, an event registration or
            an article share) without cookies, without cross-site tracking and without storing
            personal data or full IP addresses. No individual visitor can be identified, and the
            data is processed on servers in the European Union. We use no other analytics or
            tracking tools.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">e) ICF Global</h4>
          <p className="text-foreground/80">
            We receive member data from ICF Global through an automated nightly synchronisation; we
            do not send profile data back. This data is processed by ICF Global in the United
            States, where ICF Global&apos;s member records are administered by its association
            management company, Associations International (Lexington, Kentucky, USA).
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            f) Payment providers (if applicable)
          </h4>
          <p className="text-foreground/80">
            Payments for event registrations are processed by <strong>Stripe</strong> (Stripe, Inc.,
            a US company). Stripe is also a sub-processor of Lovable for Lovable&apos;s own billing.
            Payment data is processed by Stripe under its data processing agreement, with transfers
            covered by standard contractual clauses.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Internal access</h4>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Members of the Board of The Switzerland Chapter of ICF</li>
            <li>
              Authorised staff and volunteers with access to the CMS and member administration tools
            </li>
            <li>Access is granted on a role-based, need-to-know basis</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">h) Other third-party services</h4>
          <p className="text-foreground/80">
            Fonts are self-hosted (Quicksand for headlines, Plus Jakarta Sans for body text) — no
            external font requests are made.
          </p>
          <p className="text-foreground/80">
            The following third-party services are used on the website:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Google Maps</strong> — used to display location and map data on event pages
            </li>
            <li>
              <strong>Unsplash</strong> — used by the CMS image picker to source images
            </li>
          </ul>
          <p className="text-foreground/80">
            We do not use video embeds, social media embeds or plugins, CAPTCHA / bot protection, or
            newsletter tracking pixels.
          </p>
          <p className="text-foreground/80">
            We use Plausible Analytics (see Section 5d), which is cookieless and does not track
            individuals. We use no other analytics or tracking tools. Lovable&apos;s own platform
            analytics (PostHog, Google Analytics, TikTok, Facebook/Meta, Google Ads) apply to the
            Lovable editor at lovable.dev, not to visitors of coachingfederation.ch.
          </p>
          <p className="text-foreground/80">We do not sell personal data to third parties.</p>
        </div>
      </div>
    </>
  );
}

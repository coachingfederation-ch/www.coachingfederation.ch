/**
 * Privacy policy section 3: categories of personal data processed.
 * Exports: DataProcessingSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { ExternalLink } from "./shared";

export function DataProcessingSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          3. What personal data do we process?
        </h3>
        <p className="text-foreground/80">We process the following categories of personal data:</p>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            a) Technical data (all website visitors)
          </h4>
          <p className="text-foreground/80">
            When you visit our website, we and our hosting platform Lovable automatically process
            technical data that your browser transmits:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>IP address (or truncated IP address)</li>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Device type</li>
            <li>Referrer URL (the page you visited before ours)</li>
            <li>Date and time of access</li>
            <li>Pages visited and duration of visit</li>
          </ul>
          <p className="text-foreground/80">
            This data is processed for the technical operation, security, and stability of the
            website. Our hosting platform Lovable also processes this data as an independent
            controller for its own security, analytics, and product-improvement purposes, in
            accordance with{" "}
            <ExternalLink href="https://lovable.dev/privacy">
              Lovable&apos;s Privacy Policy
            </ExternalLink>
            . Lovable retains this log data for up to 90 days.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">b) Contact and enquiry data</h4>
          <p className="text-foreground/80">
            When you contact us via email or a contact form, we process:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>Email address</li>
            <li>Any other information you choose to provide in your message</li>
          </ul>
          <p className="text-foreground/80">
            On our About page, you can prepare your enquiry in a conversation with an AI assistant
            instead of filling in a form. The conversation runs through our AI provider, is not
            stored by us, and is never used to train a model. When you press &ldquo;Review and
            send&rdquo;, the assistant drafts a summary that you can edit — the version you approve
            is the one we receive. We then store your name, email address, subject, and message
            temporarily and send a confirmation link to your email address; your message only
            reaches our office when you click that link. This protects you against someone writing
            to us in your name. Unconfirmed and confirmed enquiries alike are deleted automatically
            seven days after they were created.
          </p>
        </div>


        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            c) Newsletter subscription data
          </h4>
          <p className="text-foreground/80">
            When you subscribe to our newsletter via the website, we process:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Email address</li>
            <li>Subscription date and status</li>
          </ul>
          <p className="text-foreground/80">
            Only the email address is collected at signup; no additional fields (such as name or
            interests) are collected.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">d) Member account data</h4>
          <p className="text-foreground/80">
            When you create or claim a member account, we process:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>Email address</li>
            <li>ICF membership information (member ID, credentials, membership status)</li>
            <li>
              Account authentication data (e.g., login credentials managed through our
              authentication provider)
            </li>
            <li>Profile preferences and settings</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            e) Coach directory profile data
          </h4>
          <p className="text-foreground/80">
            For members whose profiles appear in the public &quot;Find a Coach&quot; directory, we
            process and publish:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name and credentials</li>
            <li>Photograph</li>
            <li>Biography and coaching specialties</li>
            <li>Contact information (as made public by the member)</li>
            <li>Languages spoken</li>
            <li>Location / region</li>
            <li>Coaching focus areas</li>
            <li>Links to external profiles (e.g., website, LinkedIn), if provided by the member</li>
          </ul>
          <p className="text-foreground/80">
            A coach&apos;s profile appears publicly only when the member themselves sets its
            visibility to &quot;published&quot;. Profiles are created as unpublished drafts and
            never become public on their own; members can hide or remove their profile at any time.
            Publication additionally requires that the member is an active ICF member with a valid
            credential. We therefore do not publish any profile without the member&apos;s own
            action.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">f) Event registration data</h4>
          <p className="text-foreground/80">When you register for an event, we process:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name</li>
            <li>Email address</li>
            <li>Registration status and payment information, if applicable</li>
          </ul>
          <p className="text-foreground/80">
            Beyond name and email, event registration collects no personal identifiable data.
            Individual event forms may include further fields, but these do not collect personal
            data. We do not collect dietary requirements, accessibility needs, or any other category
            of sensitive personal data (Art. 5 lit. c DSG) during event registration.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">g) Staff and CMS user data</h4>
          <p className="text-foreground/80">
            For staff and authorised users of the CMS and administration tools, we process:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name and email address</li>
            <li>Role and access permissions</li>
            <li>Authentication data</li>
            <li>Activity logs within the CMS</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            h) Data from ICF Global integration
          </h4>
          <p className="text-foreground/80">
            We receive member data from the International Coaching Federation (ICF Global) through
            an automated nightly synchronisation. This includes:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>ICF member number (internal member identifier)</li>
            <li>First name, last name, and full name</li>
            <li>Email address and phone number</li>
            <li>City and country of residence</li>
            <li>Organisation (if provided in the ICF record)</li>
            <li>Membership type and membership status</li>
            <li>Membership join date and expiration date</li>
            <li>Credential (ACC, PCC or MCC) and credential award/expiry dates</li>
          </ul>
          <p className="text-foreground/80">
            This data is processed to maintain accurate member records and directory profiles.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">i) Guest Pass data</h4>
          <p className="text-foreground/80">
            Members may invite one non-member guest to an event with a Guest Pass. The inviting
            member provides only the guest&apos;s name and email address, and confirms that they
            have told the guest they are doing so. We then email the guest a personal link, and the
            guest decides for themselves what else to share:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>Name and email address (provided by the inviting member)</li>
            <li>Preferred language</li>
            <li>
              Optionally: phone number, where the guest is based, coaching level or background, main
              area of activity, other coaching associations, and any note they wish to add
            </li>
            <li>Whether the guest opts in to being contacted about the chapter afterwards</li>
          </ul>
          <p className="text-foreground/80">
            We use this data to review the Guest Pass, register the guest for the event if it is
            approved, and contact them about that event. The request only reaches our Membership
            &amp; Engagement team once the guest has completed it themselves; that team, which
            decides on the pass, is the only group that sees the guest&apos;s contact details and
            the optional details above. Community and project leaders of the event see the
            guest&apos;s name and who invited them, so they can welcome them. Follow-up contact
            beyond the event happens only where the guest opted in, and that opt-in can be withdrawn
            at any time.
          </p>
          <p className="text-foreground/80">
            A Guest Pass is not an ordinary event registration: the seat is complimentary, no
            payment data arises, and the record carries the invitation relationship as well as the
            registration. Guest Pass records are deleted automatically 12 months after the event.
          </p>
        </div>
      </div>
    </>
  );
}

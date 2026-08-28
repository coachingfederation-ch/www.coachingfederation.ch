/**
 * Privacy policy sections 4-4a: purposes, legal basis, and sources of personal data.
 * Exports: PurposesSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { Table } from "./shared";

export function PurposesSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">
          4. For what purposes and on what legal basis do we process your data?
        </h3>
        <p className="text-foreground/80">We process personal data for the following purposes:</p>
        <Table
          headers={["Purpose", "Categories of data"]}
          rows={[
            [
              "Technical operation, security, and maintenance of the website",
              "Technical data (IP, browser, device, logs)",
            ],
            ["Responding to enquiries and communications", "Contact data"],
            [
              "Managing membership and member accounts",
              "Member account data, ICF Global integration data",
            ],
            ["Publishing coach directory profiles", "Coach directory profile data"],
            ["Organising events and managing registrations", "Event registration data"],
            ["Administering Guest Passes for member-invited guests", "Guest Pass data"],
            ["Sending newsletters and association communications", "Newsletter subscription data"],
            [
              "Administering content, member management, and ICF integration",
              "Staff/CMS user data, ICF Global integration data",
            ],
            ["Meeting legal and regulatory obligations", "Various, as required"],
          ]}
        />

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">
            Legal framework under Swiss law
          </h4>
          <p className="text-foreground/80">
            Under the Swiss Data Protection Act (DSG), the processing of personal data by private
            parties is generally permissible as long as it complies with the principles of Art. 6
            DSG (lawfulness, good faith, proportionality, purpose limitation, transparency, data
            accuracy, and data security) and does not violate the personality rights of the data
            subject.
          </p>
          <p className="text-foreground/80">
            Where processing could infringe personality rights, it may be justified by:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>the data subject&apos;s consent,</li>
            <li>a legal obligation, or</li>
            <li>an overriding private or public interest (Art. 31 DSG).</li>
          </ul>
          <p className="text-foreground/80">For the processing activities described above:</p>
          <ul className="list-disc space-y-1 pl-5 text-foreground/80">
            <li>
              <strong>Newsletter subscriptions</strong> are based on your active consent. You may
              unsubscribe at any time.
            </li>
            <li>
              <strong>Coach directory profiles</strong> are published as part of the member&apos;s
              participation in the association, subject to the member&apos;s visibility settings. A
              profile is published only when the member sets its visibility to
              &quot;published&quot;; profiles default to unpublished, and members can hide or remove
              their profile at any time.
            </li>
            <li>
              <strong>Technical data processing</strong> is necessary for the operation and security
              of the website.
            </li>
            <li>
              <strong>Member data and ICF Global integration</strong> serve the fulfilment of the
              membership relationship and the association&apos;s purpose.
            </li>
            <li>
              <strong>Event registration data</strong> is processed to organise events and manage
              participation.
            </li>
            <li>
              <strong>Guest Pass data</strong> is processed to review the pass, prepare the
              guest&apos;s complimentary place, and contact them about that event. Contact beyond
              the event is based on the guest&apos;s separate opt-in, which they may withdraw at any
              time.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold tracking-tight">Where the GDPR also applies</h4>
          <p className="text-foreground/80">
            Where the processing also affects individuals in the European Economic Area and the GDPR
            applies, the relevant legal bases include: consent (Art. 6 para. 1 lit. a GDPR),
            contractual necessity (Art. 6 para. 1 lit. b GDPR), legal obligation (Art. 6 para. 1
            lit. c GDPR), and legitimate interests (Art. 6 para. 1 lit. f GDPR).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          4a. Where do we obtain your personal data from?
        </h3>
        <p className="text-foreground/80">We obtain personal data from the following sources:</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            <strong>Directly from you</strong> — when you contact us, subscribe to the newsletter,
            register for an event, create or manage a member account, or edit your coach directory
            profile.
          </li>
          <li>
            <strong>From ICF Global</strong> — through the automated nightly member data
            synchronisation (see Section 3h).
          </li>
          <li>
            <strong>From an inviting member</strong> — a member who requests a Guest Pass gives us
            the guest&apos;s name and email address so that we can invite the guest to complete
            their own details.
          </li>
          <li>
            <strong>From technical systems</strong> — technical data collected automatically when
            you visit the website (see Section 3a).
          </li>
          <li>
            <strong>From service providers</strong> — ICF Global (member records through the nightly
            synchronisation) and MailerLite (newsletter signups made via the website).
          </li>
        </ul>
        <p className="text-foreground/80">
          Where we obtain personal data that was not collected directly from you (Art. 19 para. 3
          DSG), we inform you about the source of the data and the categories of data processed.
        </p>
      </div>
    </>
  );
}

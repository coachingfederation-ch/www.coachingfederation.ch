/**
 * Privacy policy section 7: data retention periods.
 * Exports: RetentionSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { Table } from "./shared";

export function RetentionSection() {
  return (
    <>
      <div className="space-y-6">
        <h3 className="text-lg font-semibold tracking-tight">7. How long do we store your data?</h3>
        <p className="text-foreground/80">
          We retain personal data only for as long as is necessary to fulfil the purposes for which
          it was collected, or as long as required by law. The specific retention periods are:
        </p>
        <Table
          headers={["Category", "Retention period / criteria"]}
          rows={[
            [
              "Technical data (logs)",
              "In accordance with our data processing agreement: Lovable retains log data for up to 90 days; customer data is deleted within 30 days after termination",
            ],
            [
              "Contact enquiries",
              "For the duration of the enquiry and 3 months thereafter for follow-up. The temporary record created while a website enquiry awaits your email confirmation is deleted by an automatic daily job seven days after it was created, whether or not it was confirmed",
            ],

            [
              "Newsletter subscriptions",
              "Until you unsubscribe; suppression list retained to prevent re-subscription without consent",
            ],
            [
              "Member account data",
              "For the duration of ICF membership; deleted or anonymised 90 days after membership ends",
            ],
            [
              "Coach directory profiles",
              "For as long as the member maintains a public profile; removed when the member deactivates their profile or membership ends",
            ],
            [
              "Event registration data",
              "For the duration of the event and 12 months thereafter for accounting and follow-up",
            ],
            [
              "Guest Pass records",
              "12 months after the event ends; deleted by an automatic daily job, and the complimentary registration is anonymised at the same time. Withdrawing consent to follow-up stops further contact but does not delete the record earlier",
            ],
            [
              "CMS/staff user data",
              "For the duration of the user&apos;s role; deleted 90 days after access is revoked",
            ],
            [
              "ICF Global integration data",
              "Synchronised nightly; retained according to membership status",
            ],
          ]}
        />
        <p className="text-foreground/80">
          Where legal or regulatory obligations require longer retention (e.g., accounting records
          under Swiss tax and commercial law), data is retained for the legally required period.
        </p>
      </div>
    </>
  );
}

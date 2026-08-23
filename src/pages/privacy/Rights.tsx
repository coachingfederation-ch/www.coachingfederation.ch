/**
 * Privacy policy sections 9-11: data protection rights, automated decisions, and security.
 * Exports: RightsSection. Rendered by src/pages/Privacy.tsx inside the Privacy Policy section.
 */
import { ExternalLink, MailLink } from "./shared";

export function RightsSection() {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">
          9. What are your data protection rights?
        </h3>
        <p className="text-foreground/80">
          Under the Swiss Data Protection Act (DSG), you have the following rights regarding your
          personal data:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-foreground/80">
          <li>
            <strong>Right to information (Auskunftsrecht)</strong> — You may request information
            about whether we process personal data about you and, if so, what data is processed
            (Art. 25 DSG).
          </li>
          <li>
            <strong>Right to rectification (Recht auf Berichtigung)</strong> — You may request the
            correction of inaccurate or incomplete personal data (Art. 32 DSG).
          </li>
          <li>
            <strong>Right to erasure (Recht auf Löschung)</strong> — You may request the deletion of
            your personal data, subject to legal retention obligations and other exceptions (Art. 32
            DSG).
          </li>
          <li>
            <strong>Right to object (Widerspruchsrecht)</strong> — You may object to the processing
            of your personal data in certain circumstances, particularly where processing is based
            on an overriding interest (Art. 31 DSG) or, where the GDPR applies, on legitimate
            interests (Art. 21 GDPR).
          </li>
          <li>
            <strong>Right to data portability</strong> — You may request that we provide your
            personal data in a structured, commonly used, and machine-readable format (Art. 28 DSG).
          </li>
          <li>
            <strong>Right to withdraw consent</strong> — Where processing is based on your consent,
            you may withdraw consent at any time. This does not affect the lawfulness of processing
            carried out before withdrawal.
          </li>
          <li>
            <strong>Right to lodge a complaint</strong> — You have the right to lodge a complaint
            with the Swiss Federal Data Protection and Information Commissioner (FDPIC / EDÖB):
          </li>
        </ul>
        <div className="rounded-2xl border border-border/70 bg-card p-6 text-foreground/80">
          <p className="font-semibold text-foreground">
            Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter (EDÖB)
          </p>
          <p className="mt-2">Feldeggweg 1</p>
          <p>3003 Bern</p>
          <p>Switzerland</p>
          <p className="mt-2">
            Website:{" "}
            <ExternalLink href="https://www.edoeb.admin.ch">www.edoeb.admin.ch</ExternalLink>
          </p>
        </div>
        <p className="text-foreground/80">
          To exercise any of these rights, please contact us at{" "}
          <MailLink address="office@coachingfederation.ch" />. We will respond to your request
          within 30 days. In complex cases, this period may be extended; we will inform you of any
          extension and the reasons for it.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">10. Automated individual decisions</h3>
        <p className="text-foreground/80">
          We do not make decisions based solely on automated processing that produce legal effects
          or significantly affect you (Art. 21 DSG). In particular:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            The coach directory search and filtering is a tool to help visitors find coaches; it
            does not make automated decisions about individuals.
          </li>
          <li>Member account creation and profile management involve human oversight.</li>
          <li>
            No profiling is carried out that would produce legal or similarly significant effects on
            you.
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">11. How do we protect your data?</h3>
        <p className="text-foreground/80">
          We implement appropriate technical and organisational measures to protect personal data
          against unauthorised access, loss, destruction, or alteration. These measures include:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>Encrypted data transmission (TLS/SSL)</li>
          <li>Role-based access controls and authentication</li>
          <li>Regular security reviews of our systems</li>
          <li>Data stored in a managed database with row-level security policies</li>
          <li>
            Data hosted on SOC 2 Type II and ISO 27001 certified infrastructure provided by our
            hosting platform (see Section 5b)
          </li>
        </ul>
        <p className="text-foreground/80">
          If a data breach occurs that is likely to result in a high risk to your rights and
          freedoms, we will notify the FDPIC (EDÖB) as soon as possible, in accordance with Art. 24
          DSG.
        </p>
      </div>
    </>
  );
}

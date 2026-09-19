import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_PHONE_DISPLAY,
} from "@/lib/legal-meta";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Refunds Policy",
  description:
    "How QuickPrint handles refunds for cancelled print jobs, failed prints, and payment issues.",
  path: "/refunds",
});

const toc = [
  { id: "overview", label: "Overview" },
  { id: "cancellation-refunds", label: "Cancellation refunds" },
  { id: "eligibility", label: "Cancellation eligibility" },
  { id: "refund-timing", label: "Refund timing" },
  { id: "failed-prints", label: "Failed prints" },
  { id: "non-refundable", label: "Non-refundable cases" },
  { id: "how-to-get-help", label: "How to get help" },
  { id: "contact", label: "Contact" },
];

export default function RefundsPolicyPage() {
  return (
    <LegalPageShell
      title="Refunds Policy"
      description="This policy explains when QuickPrint issues refunds, how cancellation refunds work, and how to contact us if you need help with a payment or print job."
      toc={toc}
    >
      <LegalSection id="overview" title="1. Overview">
        <p>
          QuickPrint processes payments through Razorpay. Refunds are returned to your original
          payment method when you cancel an eligible paid job, or when we approve a refund after a
          print failure or payment issue.
        </p>
        <p>
          You can see refund status for cancelled jobs in your print History. Statuses include
          Refund processing and Refunded.
        </p>
      </LegalSection>

      <LegalSection id="cancellation-refunds" title="2. Cancellation refunds">
        <p>
          If you cancel a paid print job while it is still eligible for cancellation, QuickPrint
          automatically initiates a refund to your original payment method through Razorpay. You do
          not need to contact support for standard cancellation refunds.
        </p>
        <p>
          The uploaded file associated with the cancelled job is removed as part of cancellation.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Cancellation eligibility">
        <p>
          You may cancel a paid job from the app while it is in queue and before printing has
          started at the kiosk. Once printing has started, cancellation is not available through the
          app.
        </p>
        <p>
          Unpaid jobs can be cancelled while they are still awaiting payment or in an eligible
          unpaid state.
        </p>
      </LegalSection>

      <LegalSection id="refund-timing" title="4. Refund timing">
        <p>
          After you cancel an eligible paid job, the refund may show as Refund processing in
          History while we process it with Razorpay. When complete, the status changes to Refunded.
        </p>
        <p>
          Depending on your bank, card issuer, or UPI provider, it may take a few business days for
          the refunded amount to appear in your account after the Refunded status is shown.
        </p>
      </LegalSection>

      <LegalSection id="failed-prints" title="5. Failed prints">
        <p>
          If payment succeeded but printing could not be completed because of a kiosk, network, or
          printer issue, check the job status in the app for details. Contact us with your job number
          so we can review whether a refund or other resolution applies.
        </p>
      </LegalSection>

      <LegalSection id="non-refundable" title="6. Non-refundable cases">
        <p>Refunds are generally not available for:</p>
        <ul>
          <li>Successfully completed print jobs</li>
          <li>Jobs cancelled after printing has started</li>
          <li>Expired print jobs</li>
          <li>Issues caused by incorrect print settings you selected, unsupported files, or user error</li>
        </ul>
        <p>
          We may still review exceptional cases at our discretion. Contact support with your job
          number and a description of the issue.
        </p>
      </LegalSection>

      <LegalSection id="how-to-get-help" title="7. How to get help">
        <p>
          For refund questions not covered by automatic cancellation, contact us with your job number
          and payment details. You can reach us by email or phone - see Contact below.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="8. Contact">
        <p>
          Email:{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          Phone:{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="tel:+917899304607"
          >
            {LEGAL_CONTACT_PHONE_DISPLAY}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

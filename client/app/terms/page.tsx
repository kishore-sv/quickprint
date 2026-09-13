import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Terms governing your use of QuickPrint, including accounts, printing, payments, uploaded content, and acceptable use.",
  path: "/terms",
});

const toc = [
  { id: "acceptance", label: "Acceptance of terms" },
  { id: "description", label: "Description of QuickPrint" },
  { id: "accounts", label: "Account registration" },
  { id: "printing-service", label: "Printing service" },
  { id: "responsibilities", label: "User responsibilities" },
  { id: "uploaded-content", label: "Uploaded content" },
  { id: "payments", label: "Payments and pricing" },
  { id: "failures", label: "Print failures" },
  { id: "cancellation", label: "Cancellation" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "availability", label: "Service availability" },
  { id: "cookies-storage", label: "Cookies and browser storage" },
  { id: "disclaimer", label: "Disclaimer and limitation of liability" },
  { id: "termination", label: "Suspension and termination" },
  { id: "changes", label: "Changes to terms" },
  { id: "governing-law", label: "Governing law" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="These Terms govern your access to and use of QuickPrint at quickprint.fun. Please read them carefully before creating an account or submitting a print job."
      toc={toc}
    >
      <LegalSection id="acceptance" title="1. Acceptance of terms">
        <p>
          By accessing or using QuickPrint, you agree to these Terms of Service and our Privacy
          Policy. If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection id="description" title="2. Description of QuickPrint">
        <p>
          QuickPrint is an online self-service document printing platform. The Service allows you to:
        </p>
        <ul>
          <li>Upload or select documents</li>
          <li>Configure print options such as copies, color, and page range</li>
          <li>Pay online for a print job</li>
          <li>Release the job at a participating kiosk by scanning or selecting the kiosk</li>
          <li>Have the document printed by the kiosk&apos;s printer through an authorized kiosk agent</li>
        </ul>
      </LegalSection>

      <LegalSection id="accounts" title="3. Account registration">
        <p>
          You may register with email and password, sign in with Google (when available), or use
          limited guest access. You are responsible for the accuracy of information you provide and
          for keeping your account credentials secure.
        </p>
        <p>
          Notify us promptly at{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          if you believe your account has been accessed without authorization.
        </p>
      </LegalSection>

      <LegalSection id="printing-service" title="4. Printing service">
        <p>
          Print jobs depend on kiosk availability, printer status, network connectivity, and other
          operational factors outside our direct control. Prices shown in the Service are based on
          configured pricing rules and are displayed before payment.
        </p>
        <p>
          Completing payment does not guarantee that printing will succeed if a kiosk is offline, a
          printer fails, or another technical issue occurs at the location.
        </p>
      </LegalSection>

      <LegalSection id="responsibilities" title="5. User responsibilities">
        <p>You agree that you will:</p>
        <ul>
          <li>Upload and print only documents you have the right to reproduce</li>
          <li>Not upload unlawful, infringing, harmful, or malicious content</li>
          <li>Not use the Service for fraud, abuse, or attempts to bypass payment</li>
          <li>Not attempt to access another user&apos;s files, jobs, or account data</li>
          <li>Not interfere with kiosks, printers, agents, or Service infrastructure</li>
        </ul>
      </LegalSection>

      <LegalSection id="uploaded-content" title="6. Uploaded content">
        <p>
          You retain responsibility for documents you upload. QuickPrint does not claim ownership of
          your documents.
        </p>
        <p>
          You grant QuickPrint a limited permission to store, process, transmit, and make your
          document available to the authorized kiosk agent solely to provide the printing service
          you request, including deletion when retention rules apply.
        </p>
      </LegalSection>

      <LegalSection id="payments" title="7. Payments and pricing">
        <p>
          Prices are shown before you complete payment. Payments are processed by Razorpay. QuickPrint
          stores payment references and status information needed to operate the Service; sensitive
          payment credentials are handled by Razorpay.
        </p>
        <p>
          The current application does not provide an automated refund workflow. If you believe you
          are entitled to a refund because of a payment or printing issue, contact{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          with your job number and payment details. Eligible refund requests are handled on a
          case-by-case basis.
        </p>
      </LegalSection>

      <LegalSection id="failures" title="8. Print failures">
        <p>
          A print job may fail if a kiosk is unavailable, a file cannot be downloaded, a printer
          error occurs, or another technical problem arises. Job status and failure information are
          shown in the Service where available.
        </p>
        <p>
          If payment succeeds but printing cannot be completed, contact support. QuickPrint does not
          guarantee automatic refunds or automatic reprints unless we expressly agree in a specific
          case.
        </p>
      </LegalSection>

      <LegalSection id="cancellation" title="9. Cancellation">
        <p>
          You may cancel an unpaid print job while it is still in an eligible pre-payment or
          unpaid queued state through the Service. Once a job has been paid for, cancellation through
          the current application is not supported. Paid jobs follow the printing and support process
          described above.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="10. Intellectual property">
        <p>
          QuickPrint owns the Service, including its software, branding, user interface, and
          platform content (excluding your documents). You may not copy, modify, or reverse engineer
          the Service except as permitted by law.
        </p>
        <p>You retain your rights in documents you upload, subject to the limited license in Section 6.</p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="11. Acceptable use">
        <p>You must not use QuickPrint to:</p>
        <ul>
          <li>Violate applicable laws or third-party rights</li>
          <li>Upload malware or attempt unauthorized access to systems or data</li>
          <li>Commit payment fraud or abuse pricing or kiosk workflows</li>
          <li>Disrupt or overload the Service, kiosks, or connected infrastructure</li>
        </ul>
        <p>We may investigate suspected violations and cooperate with authorities where required.</p>
      </LegalSection>

      <LegalSection id="availability" title="12. Service availability">
        <p>
          QuickPrint is provided on an &quot;as available&quot; basis. Availability depends on our
          backend, hosting providers, payment systems, object storage, database, kiosk connectivity,
          and physical printers. Maintenance, outages, and third-party failures may affect the Service.
        </p>
      </LegalSection>

      <LegalSection id="cookies-storage" title="13. Cookies and browser storage">
        <p>
          By using QuickPrint, you acknowledge that the Service uses cookies and browser storage as
          described in our{" "}
          <a className="text-primary underline-offset-4 hover:underline" href="/policy#cookies">
            Privacy Policy
          </a>
          , including:
        </p>
        <ul>
          <li>
            <strong>Authentication cookies</strong> on the API domain (for example{" "}
            <code>better-auth.session_token</code>) to maintain your sign-in session
          </li>
          <li>
            <strong>Session storage</strong> for temporary print-flow drafts (
            <code>quickprint.print-flow.v1</code>) and kiosk selection context (
            <code>quickprint.kiosk.v1</code>)
          </li>
          <li>
            <strong>Local storage</strong> for UI preferences such as theme (<code>theme</code> via{" "}
            <code>next-themes</code>)
          </li>
          <li>
            <strong>Third-party cookies</strong> that may be set during Google sign-in or Razorpay
            checkout, subject to those providers&apos; policies
          </li>
        </ul>
        <p>
          You are responsible for managing cookies and storage in your browser if you do not want
          certain preferences or session state to persist. Disabling necessary authentication cookies
          may prevent you from using signed-in features.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="14. Disclaimer and limitation of liability">
        <p>
          To the fullest extent permitted by applicable law, QuickPrint is provided without warranties
          of uninterrupted or error-free operation. We are not liable for indirect, incidental,
          special, consequential, or punitive damages, or for loss of data, profits, or business
          opportunities arising from your use of the Service.
        </p>
        <p>
          Where liability cannot be excluded, our total liability for claims relating to the Service
          is limited to the amount you paid to QuickPrint for the specific print job giving rise to
          the claim, unless a higher minimum is required by applicable law.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="15. Suspension and termination">
        <p>
          We may suspend or restrict access to the Service, cancel jobs, or terminate accounts if we
          reasonably believe you have violated these Terms, engaged in fraud or abuse, created a
          security risk, or if required by law.
        </p>
        <p>You may stop using the Service at any time.</p>
      </LegalSection>

      <LegalSection id="changes" title="16. Changes to terms">
        <p>
          We may update these Terms from time to time. Material changes will be posted on this page
          with an updated &quot;Last updated&quot; date. Continued use after changes take effect
          constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="17. Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-law principles.
          Disputes shall be subject to the courts of India having jurisdiction as permitted by
          applicable law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="18. Contact">
        <p>
          Questions about these Terms:{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

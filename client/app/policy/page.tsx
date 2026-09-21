import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "How QuickPrint collects, uses, stores, and protects your information when you use our document printing service.",
  path: "/policy",
});

const toc = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information we collect" },
  { id: "how-we-use", label: "How we use information" },
  { id: "uploaded-documents", label: "Uploaded document privacy" },
  { id: "data-sharing", label: "Data sharing" },
  { id: "retention", label: "Data retention" },
  { id: "security", label: "Security" },
  { id: "your-rights", label: "Your privacy rights" },
  { id: "children", label: "Children and minors" },
  { id: "cookies", label: "Cookies, local storage, and sessions" },
  { id: "third-party", label: "Third-party services" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This policy explains what information QuickPrint collects, how we use it, and the choices available to you when you use our document printing service at quickprint.fun."
      toc={toc}
    >
      <LegalSection id="introduction" title="1. Introduction">
        <p>
          QuickPrint is an online self-service document printing platform. You can upload documents,
          configure print options, pay online, and release jobs at participating kiosks.
        </p>
        <p>
          This Privacy Policy describes how QuickPrint (&quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;) handles personal information when you use our website, API, and related
          services (collectively, the &quot;Service&quot;).
        </p>
        <p>
          If you have questions about this policy or your information, contact us at{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="information-we-collect" title="2. Information we collect">
        <h3>A. Account information</h3>
        <p>Depending on how you sign up and use the Service, we may collect and store:</p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Display name (stored in your QuickPrint profile)</li>
          <li>Internal account and session identifiers</li>
          <li>Profile image URL when you sign in with Google (we do not receive your Google password)</li>
          <li>Whether your account is a guest (anonymous) account</li>
        </ul>
        <p>
          Account authentication data is managed through Better Auth and stored in our application
          database hosted on Neon PostgreSQL.
        </p>

        <h3>B. Authentication information</h3>
        <p>QuickPrint supports the following sign-in methods:</p>
        <ul>
          <li>
            <strong>Email and password</strong> - you provide your name, email address, and a
            password. Passwords are handled by our authentication system; we do not store them in
            plain text in application code.
          </li>
          <li>
            <strong>Google sign-in</strong> - if enabled, you may authenticate with Google. Google
            provides account information such as your name, email address, and profile image URL.
            QuickPrint does not receive or store your Google password.
          </li>
          <li>
            <strong>Guest access</strong> - you may use limited features without registering. Guest
            sessions are still associated with an internal user identifier.
          </li>
        </ul>

        <h3>C. Uploaded files</h3>
        <p>When you upload a document for printing, we collect and process:</p>
        <ul>
          <li>The file content you upload</li>
          <li>Original filename</li>
          <li>File size</li>
          <li>SHA-256 file hash</li>
          <li>Page count (for PDFs)</li>
        </ul>
        <p>
          The Service is designed for PDF printing. Supported upload formats are PDF, DOC, DOCX,
          XLS, XLSX, ODS, CSV, TXT, RTF, JPG, and PNG. Images (JPEG and PNG) are converted to PDF
          in the client before upload. Office and text uploads (including Word, Excel,
          spreadsheets, CSV, TXT, and RTF) are converted to PDF on the server before storage. All
          stored and printed files are PDF.
        </p>
        <p>
          Uploaded files are stored in private object storage (Supabase Storage using an S3-compatible
          API). Files are not published publicly by default. Access is restricted to authenticated
          users for their own files and to authorized kiosk agents through time-limited download
          mechanisms used to complete printing.
        </p>

        <h3>D. Print-job information</h3>
        <p>For each print job, we store metadata such as:</p>
        <ul>
          <li>Job ID and job number</li>
          <li>Selected print settings (copies, page range, color mode, paper size, duplex, orientation, and related options)</li>
          <li>Calculated price, currency, and pricing snapshot</li>
          <li>Job status and payment status</li>
          <li>Selected kiosk reference</li>
          <li>Timestamps (created, paid, claimed, printing started, completed, failed, and related events)</li>
          <li>Printer/kiosk feedback fields such as failure reason or printer job ID when reported by the kiosk agent</li>
          <li>Whether you opted to retain the file for later reprinting</li>
        </ul>
        <p>
          We also store a chronological event log for jobs (for example, job created, payment
          success, kiosk selected, file deleted) which may include related metadata such as kiosk
          code or payment references.
        </p>

        <h3>E. Payment information</h3>
        <p>
          Payments are processed by <strong>Razorpay</strong>. When you pay for a print job,
          Razorpay collects and processes payment credentials (such as card, UPI, or wallet details)
          according to Razorpay&apos;s own policies.
        </p>
        <p>QuickPrint stores payment-related records such as:</p>
        <ul>
          <li>Razorpay order ID</li>
          <li>Razorpay payment ID (when available)</li>
          <li>Amount in paise and currency</li>
          <li>Payment status (for example, created, success, or failed)</li>
          <li>Links between the payment and the related print job</li>
        </ul>
        <p>
          QuickPrint does <strong>not</strong> store full card numbers, CVV, UPI PINs, or banking
          passwords.
        </p>

        <h3>F. Kiosk information</h3>
        <p>When you use a kiosk, we may process:</p>
        <ul>
          <li>Kiosk code, name, and location label</li>
          <li>A kiosk public token used in scan URLs</li>
          <li>Whether the kiosk service is online</li>
          <li>A short-lived kiosk session linking your account to a kiosk you scanned</li>
        </ul>
        <p>
          Kiosk agent credentials are stored only as hashed values on the server, not as plaintext
          secrets in the database.
        </p>

        <h3>G. Technical information</h3>
        <p>Our systems may automatically collect limited technical information, including:</p>
        <ul>
          <li>HTTP request logs generated by our API (which may include IP address, request path, and timestamps through standard server logging)</li>
          <li>Session metadata supported by our authentication system (which may include IP address and browser user-agent on session records, depending on Better Auth configuration)</li>
          <li>Error and operational logs related to uploads, payments, print jobs, and kiosk connectivity</li>
        </ul>
        <p>
          We do not operate an in-app advertising or third-party analytics tracker based on the
          current application codebase.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="3. How we use information">
        <p>We use the information described above to:</p>
        <ul>
          <li>Create and manage accounts and sessions</li>
          <li>Authenticate users and protect access to accounts, files, and jobs</li>
          <li>Accept uploads and prepare documents for printing</li>
          <li>Calculate pricing and process payments</li>
          <li>Create, track, and display print-job status and history</li>
          <li>Connect paid jobs to the kiosk you selected</li>
          <li>Allow authorized kiosk agents to download and print your document</li>
          <li>Detect abuse, troubleshoot failures, and maintain security</li>
          <li>Respond to support requests</li>
          <li>Meet applicable legal and compliance obligations</li>
        </ul>
        <p>We do not use your documents for advertising.</p>
      </LegalSection>

      <LegalSection id="uploaded-documents" title="4. Uploaded document privacy">
        <p>
          Documents you upload are processed only to provide the printing service you request. They
          are not intentionally made public, sold, or used for advertising.
        </p>
        <p>
          After payment, an authorized kiosk agent may download your file through restricted,
          time-limited access mechanisms so the document can be printed at the kiosk you selected.
        </p>
        <p>
          <strong>Default retention:</strong> unless you opt in to longer retention, uploaded files
          linked to completed print jobs are deleted from object storage after successful printing.
          The application currently defaults to not saving files beyond what is needed for the job.
        </p>
        <p>
          <strong>Optional longer retention:</strong> the backend supports retaining a file for up to
          30 days when the save-for-later option is enabled on a job or upload. This allows
          reprinting from history while the file still exists. When that retention period ends, a
          cleanup process may delete the stored file while preserving job history metadata.
        </p>
        <p>
          You may also delete a saved file yourself through the Service where that action is
          available.
        </p>
      </LegalSection>

      <LegalSection id="data-sharing" title="5. Data sharing">
        <p>
          We do not sell your personal information. We share information only with service providers
          that help us operate QuickPrint, and only as needed to provide the Service:
        </p>
        <ul>
          <li>
            <strong>Database</strong> - PostgreSQL stores account, profile, print-job, payment,
            and related application records.
          </li>
          <li>
            <strong>Payments</strong> - Razorpay processes payments and related payment events.
          </li>
        </ul>
        <p>
          These providers process information on our behalf to provide infrastructure, storage,
          authentication, or payment services. Their handling of information is also governed by
          their own privacy policies.
        </p>
        <p>We may also disclose information if required by law or to protect the Service, users, or the public.</p>
      </LegalSection>

      <LegalSection id="retention" title="6. Data retention">
        <p>Retention depends on the type of data:</p>
        <ul>
          <li>
            <strong>Account and profile data</strong> - retained while your account exists. We do not
            currently provide an in-app account deletion feature in the codebase.
          </li>
          <li>
            <strong>Print-job metadata and history</strong> - generally retained to show your print
            history and job status even after associated files are deleted.
          </li>
          <li>
            <strong>Uploaded files</strong> - deleted after successful printing by default; optional
            30-day retention applies only when that option is enabled; expired saved files may be
            removed by a retention cleanup process.
          </li>
          <li>
            <strong>Payment records</strong> - retained as needed for transaction records, support,
            and legal/accounting requirements.
          </li>
          <li>
            <strong>Logs</strong> - retained for a limited period according to hosting and
            operational practices.
          </li>
        </ul>
        <p>
          File cleanup for expired retention is performed by a maintenance script and may require
          scheduled execution in the deployment environment.
        </p>
      </LegalSection>

      <LegalSection id="security" title="7. Security">
        <p>
          We use reasonable technical and organizational measures designed to protect information,
          including authenticated access to user data, private object storage, time-limited
          presigned download URLs, hashed kiosk agent credentials, HTTPS in production, and access
          controls around API routes.
        </p>
        <p>
          No method of transmission or storage is completely secure. We cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="8. Your privacy rights">
        <p>
          Depending on applicable law, including India&apos;s Digital Personal Data Protection Act,
          2023 and related rules, you may have rights to access, correct, delete, or withdraw
          consent for certain processing of your personal data, subject to legal exceptions.
        </p>
        <p>
          To exercise these rights or raise a grievance, contact{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          . We will respond in accordance with applicable law.
        </p>
        <p>
          Publishing this policy does not by itself mean we are fully compliant with every applicable
          legal requirement. Where our implementation is incomplete, we describe the actual
          behavior of the Service in this document.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children and minors">
        <p>
          QuickPrint is intended for users who can lawfully enter into agreements and use printing
          services at participating locations. We do not knowingly collect personal information from
          children through a dedicated children&apos;s feature. If you believe a child has provided
          personal information without appropriate consent, contact us at{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="10. Cookies, local storage, and sessions">
        <p>
          QuickPrint uses cookies and browser storage technologies to operate the Service. We do not
          use third-party advertising or analytics trackers in the current application codebase.
        </p>

        <h3>A. Cookies</h3>
        <p>Cookies are small text files stored by your browser. QuickPrint-related cookies include:</p>
        <ul>
          <li>
            <strong>Authentication session cookie</strong> (<code>better-auth.session_token</code> on
            the API domain) - set by Better Auth when you sign in (including email, Google, or guest
            access). Used to keep you authenticated and to validate API requests. This cookie is
            necessary for account access.
          </li>
          <li>
            <strong>Theme preference</strong> - if you change light/dark mode, the{" "}
            <code>next-themes</code> library may store your preference in a cookie and/or browser
            storage so your choice persists across visits.
          </li>
        </ul>
        <p>
          When you use <strong>Google sign-in</strong> or <strong>Razorpay checkout</strong>, those
          providers may set their own cookies in your browser during their authentication or payment
          flows. Their use of cookies is governed by their respective policies, not this one.
        </p>
        <p>
          Other cookies (for example from unrelated sites you have visited) may appear in your browser
          but are not set by QuickPrint for core app functionality.
        </p>

        <h3>B. Session storage</h3>
        <p>
          Session storage keeps data in your browser only for the current tab/session. It is cleared
          when you close the tab or browser session. QuickPrint currently uses:
        </p>
        <ul>
          <li>
            <strong>Print flow draft</strong> (<code>quickprint.print-flow.v1</code>) - stores your
            in-progress print session, such as the current step (upload, settings, or checkout),
            print settings, selected page ranges, references to uploaded file IDs, filenames, and an
            active job ID when checkout has started. This helps you continue printing if you
            navigate within the app during a session.
          </li>
          <li>
            <strong>Kiosk context</strong> (<code>quickprint.kiosk.v1</code>) - stores the kiosk
            public token and kiosk display name after you scan or select a kiosk, so the app can
            associate your session with that kiosk until you clear it or end the browser session.
          </li>
        </ul>
        <p>
          Session storage does not replace server-side storage of your account, files, or print jobs.
          It only holds temporary client-side state.
        </p>

        <h3>C. Local storage</h3>
        <p>
          Local storage persists in your browser until you clear it manually or through browser
          settings. QuickPrint does not store uploaded document content in local storage.
        </p>
        <p>
          The theme provider (<code>next-themes</code>) may store your light/dark/system theme
          preference under the key <code>theme</code> in local storage so your UI preference
          survives browser restarts.
        </p>

        <h3>D. Managing cookies and storage</h3>
        <p>
          You can control cookies and browser storage through your browser settings. Blocking or
          clearing authentication cookies will sign you out. Clearing session storage may reset an
          in-progress print flow or kiosk selection on that device. Clearing local storage may reset
          your theme preference.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="11. Third-party links and services">
        <p>
          The Service integrates with third-party services such as Google (sign-in), Razorpay
          (payments), and hosting/storage providers. Those services have their own terms and privacy
          policies. Your use of them is also subject to their policies.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes to this Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. When we make material changes, we will
          post the updated policy on this page and update the &quot;Last updated&quot; date above.
          Continued use of the Service after changes become effective means you accept the updated
          policy.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="13. Contact">
        <p>
          Questions about this Privacy Policy or our data practices:{" "}
          <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}

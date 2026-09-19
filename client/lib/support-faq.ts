import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-meta";
import { SUPPORTED_FORMATS_LABEL } from "@/lib/supported-file-types";

export type SupportFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const SUPPORT_FAQ: SupportFaqItem[] = [
  {
    id: "file-types",
    question: "What file types can I print?",
    answer:
      `QuickPrint supports ${SUPPORTED_FORMATS_LABEL}. Upload from your phone, review your files, and confirm before sending the job to the kiosk.`,
  },
  {
    id: "payment",
    question: "How do I pay for my print job?",
    answer:
      "You pay online through our secure checkout (powered by Razorpay) after choosing your print settings. Your job is sent to the kiosk once payment is complete.",
  },
  {
    id: "wrong-qr",
    question: "I scanned a QR code but it says kiosk not found",
    answer:
      "The QR code may be old, damaged, or from a different kiosk. Make sure you are scanning the QR shown on the printer you are standing at, then try again from the Scan tab.",
  },
  {
    id: "kiosk-offline",
    question: "The kiosk shows as offline or unavailable",
    answer:
      "The kiosk may be temporarily disconnected. Wait a minute and try again, or contact support if the problem continues. Your paid job will stay in your queue until the kiosk is back online.",
  },
  {
    id: "paid-not-printing",
    question: "I paid but my job is not printing",
    answer:
      "After payment, open the Scan tab and scan the QR on the kiosk. Select your job and tap to release it to the printer. Payment alone does not start printing until you connect at the kiosk.",
  },
  {
    id: "tracking",
    question: "How do I track my print job?",
    answer:
      "Open the job status page after releasing a print, or check History for past jobs. Status updates include queued, printing, printed, cancelled, and failed.",
  },
  {
    id: "cancel-refund",
    question: "How do I cancel a paid job and get a refund?",
    answer:
      "You can cancel a paid job from the app while it is still in queue and before printing starts. The refund is processed automatically to your original payment method. See our Refunds policy for details.",
  },
  {
    id: "refund-timing",
    question: "How long does a refund take?",
    answer:
      "Cancelled jobs show Refund processing in History while we process the refund. Once complete, the status changes to Refunded. Depending on your bank or UPI provider, the amount may take a few business days to appear in your account.",
  },
  {
    id: "failure",
    question: "What if my print fails?",
    answer: `Check the job status for details. If payment succeeded but printing could not be completed, contact us at ${LEGAL_CONTACT_EMAIL} with your job number and we will review your case.`,
  },
  {
    id: "upload-limits",
    question: "Is there a file size limit?",
    answer:
      "Yes. The maximum upload size is 50 MB per file. If your upload fails, try compressing the PDF or splitting it into smaller files.",
  },
];

/** Subset shown on the marketing landing page. */
export const LANDING_FAQ_IDS = [
  "file-types",
  "payment",
  "tracking",
  "cancel-refund",
  "failure",
] as const;

export function landingFaqItems(): SupportFaqItem[] {
  const byId = new Map(SUPPORT_FAQ.map((item) => [item.id, item]));
  return LANDING_FAQ_IDS.map((id) => byId.get(id)).filter(
    (item): item is SupportFaqItem => item != null
  );
}

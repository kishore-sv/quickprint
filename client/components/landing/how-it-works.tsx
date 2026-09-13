import {
  CheckCircle2Icon,
  CreditCardIcon,
  MapPinIcon,
  PrinterIcon,
  QrCodeIcon,
  UploadIcon,
} from "lucide-react";
import { LandingSection } from "@/components/landing/landing-section";

const steps = [
  {
    step: 1,
    title: "Find a kiosk",
    description: "Locate a QuickPrint self-service kiosk at your campus or venue.",
    icon: MapPinIcon,
  },
  {
    step: 2,
    title: "Scan the QR code",
    description: "Use your phone camera to open the kiosk page — no app download required.",
    icon: QrCodeIcon,
  },
  {
    step: 3,
    title: "Upload your files",
    description: "Add PDFs or images from your device and review what you are printing.",
    icon: UploadIcon,
  },
  {
    step: 4,
    title: "Choose print settings",
    description: "Set copies, color, page range, duplex, and paper size to match your needs.",
    icon: PrinterIcon,
  },
  {
    step: 5,
    title: "Pay online",
    description: "Complete payment securely so your job can be processed at the kiosk.",
    icon: CreditCardIcon,
  },
  {
    step: 6,
    title: "Collect your print",
    description: "Watch your job status and pick up your documents when printing is complete.",
    icon: CheckCircle2Icon,
  },
];

export function HowItWorks() {
  return (
    <LandingSection id="how-it-works">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Six simple steps from finding a kiosk to collecting your printed documents.
        </p>
      </div>
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((item) => (
          <li
            key={item.step}
            className="relative rounded-2xl border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <span className="font-heading text-muted-foreground text-sm tabular-nums">
                Step {item.step}
              </span>
            </div>
            <h3 className="font-heading text-lg font-medium">{item.title}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{item.description}</p>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}

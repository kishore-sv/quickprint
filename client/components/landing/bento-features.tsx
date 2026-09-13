import {
  ClockIcon,
  CreditCardIcon,
  MapPinIcon,
  SettingsIcon,
  SmartphoneIcon,
  UploadIcon,
} from "lucide-react";
import { LandingSection } from "@/components/landing/landing-section";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Scan or open the kiosk link",
    description: "Find a QuickPrint kiosk and scan the QR code on your phone to get started.",
    icon: SmartphoneIcon,
    className: "md:col-span-2",
    illustration: ScanIllustration,
  },
  {
    title: "Upload PDFs and images",
    description: "Add your documents from your phone. Supported formats include PDF and common image types.",
    icon: UploadIcon,
    className: "md:col-span-1",
    illustration: UploadIcon,
  },
  {
    title: "Flexible print options",
    description:
      "Choose copies, color or black & white, page range, duplex, and paper size before you pay.",
    icon: SettingsIcon,
    className: "md:col-span-1",
    illustration: SettingsIcon,
  },
  {
    title: "Pay online",
    description: "Complete payment securely online so your job can be sent to the kiosk printer.",
    icon: CreditCardIcon,
    className: "md:col-span-1",
    illustration: CreditCardIcon,
  },
  {
    title: "Track your job",
    description: "Follow your print status from queued to ready, with clear updates along the way.",
    icon: ClockIcon,
    className: "md:col-span-1",
    illustration: ClockIcon,
  },
  {
    title: "Kiosk convenience",
    description: "Print when you are on campus or near a kiosk — no need to carry files to a shop.",
    icon: MapPinIcon,
    className: "md:col-span-2",
    illustration: MapPinIcon,
  },
];

export function BentoFeatures() {
  return (
    <LandingSection id="features" className="bg-muted/30">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Everything you need to print on the go
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          A simple flow from your phone to the printer - designed for busy students and professionals.
        </p>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className={cn(
              "rounded-2xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/20",
              feature.className
            )}
          >
            <h3 className="font-heading text-lg font-medium">{feature.title}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            {feature.illustration && <feature.illustration className={cn(feature.className)} />}
          </div>
        ))}
      </div>
    </LandingSection>
  );
}

function ScanIllustration({ className }: { className: string }) {
  return (
    <div className={cn("h-40 w-full bg-red-600 flex items-center justify-between px-4 md:px-10", className)}>
      <div className="size-10 bg-blue-600"></div>
      <div className="size-10 bg-green-600"></div>

    </div>
  );
}
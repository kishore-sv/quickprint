import { ArrowRightIcon, FileIcon, PrinterIcon, SmartphoneIcon } from "lucide-react";
import { LandingSection } from "@/components/landing/landing-section";

const stages = [
  {
    label: "Your phone",
    detail: "Upload and configure",
    icon: SmartphoneIcon,
  },
  {
    label: "QuickPrint",
    detail: "Job queued & paid",
    icon: FileIcon,
  },
  {
    label: "Kiosk printer",
    detail: "Print & collect",
    icon: PrinterIcon,
  },
];

export function PrintExperience() {
  return (
    <LandingSection>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            From your phone to paper
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            QuickPrint connects your mobile upload to a physical kiosk printer. You stay in control of
            settings and payment on your phone, then collect your documents when the job is done.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            {stages.map((stage, index) => (
              <div key={stage.label} className="flex flex-1 items-center gap-3 sm:flex-col sm:text-center">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-muted/50 text-primary">
                  <stage.icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                  <p className="font-medium text-sm">{stage.label}</p>
                  <p className="text-muted-foreground text-xs">{stage.detail}</p>
                </div>
                {index < stages.length - 1 && (
                  <ArrowRightIcon className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}

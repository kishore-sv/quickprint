import { FileIcon, PrinterIcon, SmartphoneIcon } from "lucide-react";
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
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-4">
            {stages.map((stage) => (
              <div key={stage.label} className="flex items-center gap-3 sm:flex-col sm:text-center">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border bg-muted/50 text-primary">
                  <stage.icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                  <p className="font-medium text-sm">{stage.label}</p>
                  <p className="text-muted-foreground text-xs">{stage.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-4 hidden h-5 sm:block">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <line
                x1="16.67%"
                y1="50%"
                x2="83.33%"
                y2="50%"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="5 6"
                className="text-border/80"
              />
            </svg>
            <span
              className="print-experience-flow-dot pointer-events-none absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_6px_1px] shadow-primary/40"
              aria-hidden="true"
            />
            <style>{`
              @keyframes print-experience-flow {
                0% {
                  left: calc(16.67% - 0.25rem);
                  opacity: 0;
                }
                8% {
                  opacity: 1;
                }
                72% {
                  left: calc(83.33% - 0.25rem);
                  opacity: 1;
                }
                82%,
                100% {
                  left: calc(83.33% - 0.25rem);
                  opacity: 0;
                }
              }
              .print-experience-flow-dot {
                animation: print-experience-flow 3.5s ease-in-out infinite;
              }
            `}</style>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}

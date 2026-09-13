import { SparklesIcon, TimerIcon, ZapIcon } from "lucide-react";
import { LandingSection } from "@/components/landing/landing-section";

const pillars = [
  {
    title: "Simple",
    description: "A guided flow on your phone — scan, upload, configure, pay, and collect.",
    icon: SparklesIcon,
  },
  {
    title: "Fast",
    description: "Skip the queue. Submit your job from your phone while you are on the move.",
    icon: ZapIcon,
  },
  {
    title: "Convenient",
    description: "Print at kiosks where you already are, with status updates until pickup.",
    icon: TimerIcon,
  },
];

export function ThreeColumnFeatures() {
  return (
    <LandingSection className="border-y bg-muted/20">
      <div className="grid gap-8 md:grid-cols-3">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="text-center md:text-left">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary md:mx-0">
              <pillar.icon className="size-6" />
            </div>
            <h3 className="font-heading text-xl font-medium">{pillar.title}</h3>
            <p className="mt-2 text-muted-foreground leading-relaxed">{pillar.description}</p>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}

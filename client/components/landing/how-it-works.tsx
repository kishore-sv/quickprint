import { HowItWorksGrid } from "@/components/landing/how-it-works-grid";
import { LandingSection } from "@/components/landing/landing-section";

export function HowItWorks() {
  return (
    <LandingSection id="how-it-works">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Six simple steps from finding a kiosk to collecting your printed documents.
        </p>
      </div>
      <HowItWorksGrid />
    </LandingSection>
  );
}

import { LandingCtaButton } from "@/components/landing/landing-cta-button";
import { LandingSection } from "@/components/landing/landing-section";

export function FinalCta() {
  return (
    <LandingSection className="pb-32">
      <div className="rounded-3xl border bg-linear-to-br from-primary/5 via-card to-muted/40 p-10 text-center shadow-sm md:p-16">
        <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">Ready to print?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Find a kiosk, scan the QR code, and send your first job in minutes.
        </p>
        <div className="mt-8 flex justify-center">
          <LandingCtaButton size="lg" />
        </div>
      </div>
    </LandingSection>
  );
}

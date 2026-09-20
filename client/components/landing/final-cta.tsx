import { LandingCtaButton } from "@/components/landing/landing-cta-button";
import { LandingSection } from "@/components/landing/landing-section";
import { NoiseTexture } from "@/components/ui/noise-texture";

export function FinalCta() {
  return (
    <LandingSection className="pb-32">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-10 text-center shadow-sm md:p-16">
        <NoiseTexture
          aria-hidden
          className="opacity-[0.35] dark:opacity-[0.45]"
          frequency={0.55}
          octaves={5}
          slope={0.08}
          noiseOpacity={0.4}
        />
        <div className="relative z-10">
          <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to print?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Find a kiosk, scan the QR code, and send your first job in minutes.
          </p>
          <div className="mt-8 flex justify-center">
            <LandingCtaButton size="lg" />
          </div>
        </div>
      </div>
    </LandingSection>
  );
}

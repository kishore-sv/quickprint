import { LandingCtaButton } from "@/components/landing/landing-cta-button";
import { HeroVisual } from "@/components/landing/hero-visual";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="scroll-mt-20 px-4 pb-16 pt-12 md:pb-24 md:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-6">
          <p className="font-medium text-primary text-sm tracking-wide">Printing, made simple.</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-6xl">
            Print from your phone at a nearby kiosk
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground leading-relaxed text-pretty">
            Scan the kiosk QR code, upload your PDF or images, choose your print settings, pay online,
            and collect your documents when they are ready.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <LandingCtaButton size="lg" />
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="#how-it-works" />}>
              See how it works
            </Button>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

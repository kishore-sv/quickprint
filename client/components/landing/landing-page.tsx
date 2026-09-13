import { BentoFeatures } from "@/components/landing/bento-features";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingAuthRedirect } from "@/components/landing/landing-auth-redirect";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { PrintExperience } from "@/components/landing/print-experience";
import { ThreeColumnFeatures } from "@/components/landing/three-column-features";
import { TrustSection } from "@/components/landing/trust-section";

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-y-auto bg-background">
      <LandingAuthRedirect />
      <LandingNavbar />
      <main>
        <HeroSection />
        <BentoFeatures />
        <HowItWorks />
        <ThreeColumnFeatures />
        <PrintExperience />
        <TrustSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

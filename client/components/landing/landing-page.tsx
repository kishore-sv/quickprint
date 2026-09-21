import dynamic from "next/dynamic";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingAuthRedirectDeferred } from "@/components/landing/landing-auth-redirect-deferred";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingSectionPlaceholder } from "@/components/landing/landing-section-placeholder";

const BentoFeatures = dynamic(
  () => import("@/components/landing/bento-features").then((module) => ({ default: module.BentoFeatures })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[28rem]" /> }
);

const HowItWorks = dynamic(
  () => import("@/components/landing/how-it-works").then((module) => ({ default: module.HowItWorks })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[36rem]" /> }
);

const ThreeColumnFeatures = dynamic(
  () =>
    import("@/components/landing/three-column-features").then((module) => ({
      default: module.ThreeColumnFeatures,
    })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[16rem]" /> }
);

const PrintExperience = dynamic(
  () =>
    import("@/components/landing/print-experience").then((module) => ({
      default: module.PrintExperience,
    })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[20rem]" /> }
);

const TrustSection = dynamic(
  () => import("@/components/landing/trust-section").then((module) => ({ default: module.TrustSection })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[12rem]" /> }
);

const FaqSection = dynamic(
  () => import("@/components/landing/faq-section").then((module) => ({ default: module.FaqSection })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[24rem]" /> }
);

const FinalCta = dynamic(
  () => import("@/components/landing/final-cta").then((module) => ({ default: module.FinalCta })),
  { loading: () => <LandingSectionPlaceholder className="min-h-[16rem]" /> }
);

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-y-auto scroll-smooth bg-background">
      <LandingAuthRedirectDeferred />
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

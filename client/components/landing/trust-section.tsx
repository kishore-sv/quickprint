import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";
import { LandingSection } from "@/components/landing/landing-section";

export function TrustSection() {
  return (
    <LandingSection className="bg-muted/30">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center shadow-sm md:p-12">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheckIcon className="size-6" />
        </div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Your files are for printing - not for ads
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          QuickPrint uses your uploaded documents only to process your print job. We do not sell your
          files or use them for advertising. Read our{" "}
          <Link href="/policy" className="text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          for full details on how we handle your data.
        </p>
      </div>
    </LandingSection>
  );
}

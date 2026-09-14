import { LinkButton } from "@/components/ui/link-button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type LandingCtaButtonProps = Omit<React.ComponentProps<typeof LinkButton>, "href"> &
  VariantProps<typeof buttonVariants>;

export function LandingCtaButton({ children = "Start Printing", ...props }: LandingCtaButtonProps) {
  return (
    <LinkButton href="/sign-in" {...props}>
      {children}
    </LinkButton>
  );
}

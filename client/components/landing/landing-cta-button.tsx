"use client";

import { authClient } from "@/lib/auth-client";
import { LinkButton } from "@/components/ui/link-button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type LandingCtaButtonProps = Omit<React.ComponentProps<typeof LinkButton>, "href"> &
  VariantProps<typeof buttonVariants>;

export function LandingCtaButton({ children = "Start Printing", ...props }: LandingCtaButtonProps) {
  const { data: session } = authClient.useSession();
  const href = session?.session ? "/home" : "/sign-in";

  return (
    <LinkButton href={href} {...props}>
      {children}
    </LinkButton>
  );
}

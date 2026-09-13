"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

type LinkButtonProps = Omit<React.ComponentProps<typeof Button>, "render" | "nativeButton"> &
  VariantProps<typeof buttonVariants> & {
    href: string;
  };

/** Navigation styled as shadcn Button (Base UI render + Next.js Link). */
export function LinkButton({
  href,
  className,
  variant = "default",
  size,
  ...props
}: LinkButtonProps) {
  const resolvedVariant = variant ?? "default";

  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant={resolvedVariant}
      size={size}
      className={className}
      {...props}
    />
  );
}

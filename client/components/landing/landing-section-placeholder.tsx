import { cn } from "@/lib/utils";

export function LandingSectionPlaceholder({ className }: { className?: string }) {
  return <div className={cn("w-full", className)} aria-hidden="true" />;
}

import { cn } from "@/lib/utils";

export function QuickPrintLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-logo text-xl font-normal uppercase leading-none tracking-wide text-primary",
        className
      )}
    >
      QuickPrint
    </span>
  );
}

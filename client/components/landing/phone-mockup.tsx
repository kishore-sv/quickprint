import { BatteryChargingIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  className?: string;
  children: React.ReactNode;
};

/** Minimal iPhone-style frame matching the landing reference mockup. */
export function PhoneMockup({ className, children }: PhoneMockupProps) {
  return (
    <div className={cn("relative w-[6.75rem] shrink-0", className)}>
      <div
        className="absolute top-[14%] -left-px h-2 w-px rounded-full bg-border"
        aria-hidden="true"
      />
      <div
        className="absolute top-[22%] -left-px h-4 w-px rounded-full bg-border"
        aria-hidden="true"
      />
      <div
        className="absolute top-[30%] -left-px h-4 w-px rounded-full bg-border"
        aria-hidden="true"
      />
      <div
        className="absolute top-[20%] -right-px h-6 w-px rounded-full bg-border"
        aria-hidden="true"
      />

      <div className="rounded-[1.35rem] border border-border/80 bg-white p-[2px] shadow-sm">
        <div className="overflow-hidden rounded-[1.2rem] border border-border/50 bg-white">
          <div className="flex justify-center pt-1.5 pb-0.5" aria-hidden="true">
            <div className="flex h-[9px] w-[46px] items-center justify-between rounded-full bg-black px-1.5">
              <span className="text-[3.5px] font-medium leading-none text-white/85">9:41</span>
              <BatteryChargingIcon className="size-[7px] text-green-500" strokeWidth={2.5} />
            </div>
          </div>

          <div className="px-1.5 pb-1">{children}</div>

          <div className="flex justify-center pb-1.5" aria-hidden="true">
            <div className="h-[2px] w-7 rounded-full bg-foreground/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

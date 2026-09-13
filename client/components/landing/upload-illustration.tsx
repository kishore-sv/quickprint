"use client";

import { CheckIcon, FileTextIcon } from "lucide-react";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { cn } from "@/lib/utils";

type UploadIllustrationProps = {
  className?: string;
};

function FileChip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded border border-border/60 bg-white px-1 py-0.5 shadow-sm",
        className
      )}
    >
      <FileTextIcon className="size-2.5 shrink-0 text-primary" strokeWidth={2.5} />
      <span className="max-w-[2.75rem] truncate text-[0.35rem] font-medium leading-none">
        assignment.pdf
      </span>
    </div>
  );
}

function KioskTerminalBox() {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-heading text-[0.45rem] font-medium leading-none text-muted-foreground">Kiosk</p>
      <div className="flex h-[4.5rem] w-[3.25rem] flex-col overflow-hidden rounded-lg border border-border/80 bg-slate-200 p-1 shadow-sm">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-md bg-linear-to-br from-slate-700 via-slate-600 to-slate-800 px-0.5">
        <div
          className="upload-illustration-kiosk-glow pointer-events-none absolute inset-0 rounded-md bg-primary/25 opacity-0"
          aria-hidden="true"
        />
        <div
          className="upload-illustration-kiosk-check mb-0.5 flex size-3 items-center justify-center rounded-full bg-green-500 text-white opacity-0"
          aria-hidden="true"
        >
          <CheckIcon className="size-2" strokeWidth={3} />
        </div>
        <p className="relative text-center text-[0.32rem] font-semibold leading-tight text-white/90">
          Files received
        </p>
      </div>
      </div>
    </div>
  );
}

export function UploadIllustration({ className }: UploadIllustrationProps) {
  return (
    <div
      className={cn(
        "relative mt-6 flex h-44 w-full items-center overflow-hidden rounded-xl border border-border/60 bg-card mask-x-from-98% mask-x-to-100% mask-y-from-85% mask-y-to-100%",
        className
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes upload-illustration-travel {
          0%,
          15% {
            left: 22%;
            opacity: 1;
          }
          55% {
            left: 62%;
            opacity: 1;
          }
          75% {
            left: 62%;
            opacity: 0;
          }
          76%,
          100% {
            left: 22%;
            opacity: 0;
          }
        }
        @keyframes upload-illustration-kiosk-glow {
          0%,
          54% {
            opacity: 0;
          }
          60%,
          75% {
            opacity: 1;
          }
          76%,
          100% {
            opacity: 0;
          }
        }
        @keyframes upload-illustration-check-in {
          0%,
          54% {
            opacity: 0;
            transform: scale(0.75);
          }
          62%,
          75% {
            opacity: 1;
            transform: scale(1);
          }
          76%,
          100% {
            opacity: 0;
            transform: scale(0.75);
          }
        }
        .upload-illustration-file {
          animation: upload-illustration-travel 2.8s ease-in-out infinite;
        }
        .upload-illustration-kiosk-glow {
          animation: upload-illustration-kiosk-glow 2.8s ease-in-out infinite;
        }
        .upload-illustration-kiosk-check {
          animation: upload-illustration-check-in 2.8s ease-in-out infinite;
        }
      `}</style>

      <div
        className="pointer-events-none absolute left-[26%] right-[20%] top-1/2 z-0 h-px -translate-y-1/2 border-t border-dashed border-border/70"
        aria-hidden="true"
      />

      <div className="absolute left-[4%] top-1/2 z-10 shrink-0 origin-left -translate-y-1/2 scale-[0.78]">
        <PhoneMockup>
          <div className="space-y-0.5 ">
            <p className="font-heading text-[0.45rem] font-semibold leading-tight">Upload files</p>
            <p className="text-[0.38rem] leading-snug text-muted-foreground">Add PDFs from your phone.</p>
          </div>
          <div className="h-36">
            <FileChip />
          </div>
        </PhoneMockup>
      </div>

      <FileChip className="upload-illustration-file absolute top-1/2 z-20 -translate-y-1/2" />

      <div className="absolute right-[6%] top-1/2 z-10 shrink-0 -translate-y-1/2">
        <KioskTerminalBox />
      </div>
    </div>
  );
}

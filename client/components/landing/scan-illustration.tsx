"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { cn } from "@/lib/utils";

type ScanIllustrationProps = {
  className?: string;
};

function QrCodeImage({ className }: { className?: string }) {
  return (
    <Image
      src="/scanner.png"
      alt=""
      width={128}
      height={128}
      className={cn("size-full object-contain", className)}
      aria-hidden="true"
    />
  );
}

/** Mirrors the kiosk scanner card from `scan-content.tsx` with a decorative scan line. */
function KioskScannerViewport() {
  return (
    <Card className="relative w-full overflow-hidden py-0 shadow-none">
      <CardContent className="p-0">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <div
            className="absolute inset-0 bg-linear-to-br from-slate-700 via-slate-600 to-slate-800"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]" />

          <div className="absolute inset-[14%] flex items-center justify-center rounded-[3px] bg-white p-1 shadow-sm">
            <QrCodeImage />
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="scan-illustration-sweeper absolute inset-x-[8%]">
              <div className="h-px bg-primary shadow-[0_0_6px_1px] shadow-primary/60" />
              <div className="h-4 -translate-y-0.5 bg-linear-to-b from-primary/35 to-transparent" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScanIllustration({ className }: ScanIllustrationProps) {
  return (
    <div
      className={cn(
        "relative mt-6 h-44 w-full overflow-hidden rounded-2xl bg-card bg-[radial-gradient(circle,_color-mix(in_oklch,var(--muted-foreground)_30%,transparent)_1px,_transparent_1px)] bg-size-[10px_10px] mask-x-from-72% mask-x-to-100% mask-y-from-68% mask-y-to-100%",
        className
      )}
    >
      <style>{`
        @keyframes scan-illustration-sweep {
          0%,
          100% {
            top: 12%;
          }
          50% {
            top: 84%;
          }
        }
        .scan-illustration-sweeper {
          animation: scan-illustration-sweep 2.6s ease-in-out infinite;
        }
      `}</style>

      <div className="flex h-full items-center justify-center overflow-hidden px-3 perspective-[520px]">
        <div className="relative flex w-full max-w-[15.5rem] items-center justify-center">
          {/* Kiosk QR — faces right toward the phone */}
          <div
            className="relative z-0 shrink-0 -mr-5"
            style={{ transform: "rotateY(26deg) rotateX(4deg)" }}
            aria-hidden="true"
          >
            <div className="rounded-lg border border-border/50 bg-muted/40 p-1 shadow-sm">
              <div className="rounded-md border border-border/60 bg-white p-1.5">
                <QrCodeImage className="size-11" />
              </div>
            </div>
          </div>

          {/* Phone — faces left toward the QR */}
          <div
            className="relative z-10 shrink-0"
            style={{
              transform: "rotateY(-26deg) rotateX(-10deg)",
              transformOrigin: "50% 88%",
            }}
          >
            <PhoneMockup className="w-[6.25rem] drop-shadow-md">
              <div className="space-y-0.5">
                <p className="font-heading text-[0.45rem] font-semibold leading-tight">Scan kiosk</p>
                <p className="text-[0.38rem] leading-snug text-muted-foreground">
                  Scan the QR on the printer to connect.
                </p>
              </div>
              <div className="mt-1">
                <KioskScannerViewport />
              </div>
            </PhoneMockup>
          </div>
        </div>
      </div>
    </div>
  );
}

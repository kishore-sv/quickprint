"use client";

import { CheckIcon } from "lucide-react";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { cn } from "@/lib/utils";

type PayIllustrationProps = {
  className?: string;
};

const SPARKS = [
  { angle: 0, color: "bg-amber-400", delay: "0ms" },
  { angle: 30, color: "bg-emerald-400", delay: "40ms" },
  { angle: 60, color: "bg-sky-400", delay: "20ms" },
  { angle: 90, color: "bg-violet-400", delay: "60ms" },
  { angle: 120, color: "bg-rose-400", delay: "30ms" },
  { angle: 150, color: "bg-amber-300", delay: "50ms" },
  { angle: 180, color: "bg-emerald-300", delay: "10ms" },
  { angle: 210, color: "bg-sky-300", delay: "45ms" },
  { angle: 240, color: "bg-violet-300", delay: "25ms" },
  { angle: 270, color: "bg-rose-300", delay: "55ms" },
  { angle: 300, color: "bg-amber-400", delay: "15ms" },
  { angle: 330, color: "bg-emerald-400", delay: "35ms" },
] as const;

function Spark({ angle, color, delay }: { angle: number; color: string; delay: string }) {
  return (
    <span
      className={cn(
        "pay-illustration-spark absolute top-1/2 left-1/2 h-1 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0",
        color
      )}
      style={
        {
          "--spark-angle": `${angle}deg`,
          animationDelay: delay,
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

function PaymentSuccessBurst() {
  return (
    <div className="relative flex h-24 flex-col items-center justify-center">
      <p className="pay-illustration-pay-pill absolute top-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.38rem] font-medium text-primary">
        Pay ₹2
      </p>

      <div className="relative flex size-9 items-center justify-center">
        {SPARKS.map((spark) => (
          <Spark key={spark.angle} {...spark} />
        ))}
        <div className="pay-illustration-circle flex size-7 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
          <CheckIcon className="pay-illustration-check size-3.5 text-white" strokeWidth={3} />
        </div>
      </div>

      <div className="pay-illustration-success-copy mt-1.5 text-center opacity-0">
        <p className="text-[0.34rem] text-muted-foreground">Payment successful</p>
        <p className="font-heading text-[0.7rem] font-semibold leading-tight">₹2</p>
      </div>
    </div>
  );
}

export function PayIllustration({ className }: PayIllustrationProps) {
  return (
    <div
      className={cn(
        "relative mt-6 flex h-44 w-full items-center justify-center overflow-hidden rounded-xl bg-card mask-x-from-98% mask-x-to-100% mask-y-from-85% mask-y-to-100%",
        className
      )}
      aria-hidden="true"
    >
      <style>{`
        @keyframes pay-illustration-pay-pill {
          0%,
          14% {
            opacity: 1;
            transform: scale(1);
          }
          18%,
          100% {
            opacity: 0;
            transform: scale(0.92);
          }
        }

        @keyframes pay-illustration-circle {
          0%,
          16% {
            transform: scale(0);
            opacity: 0;
          }
          24% {
            transform: scale(1.14);
            opacity: 1;
          }
          32%,
          82% {
            transform: scale(1);
            opacity: 1;
          }
          90%,
          100% {
            transform: scale(0.85);
            opacity: 0;
          }
        }

        @keyframes pay-illustration-check {
          0%,
          26% {
            transform: scale(0);
            opacity: 0;
          }
          34% {
            transform: scale(1.2);
            opacity: 1;
          }
          40%,
          82% {
            transform: scale(1);
            opacity: 1;
          }
          90%,
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }

        @keyframes pay-illustration-spark {
          0%,
          30% {
            opacity: 0;
            transform: rotate(var(--spark-angle, 0deg)) translateY(-8px) scale(0.5);
          }
          36% {
            opacity: 1;
          }
          58% {
            opacity: 0;
            transform: rotate(var(--spark-angle, 0deg)) translateY(-18px) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--spark-angle, 0deg)) translateY(-8px) scale(0.5);
          }
        }

        @keyframes pay-illustration-success-copy {
          0%,
          38% {
            opacity: 0;
            transform: translateY(4px);
          }
          46%,
          82% {
            opacity: 1;
            transform: translateY(0);
          }
          90%,
          100% {
            opacity: 0;
            transform: translateY(4px);
          }
        }

        .pay-illustration-pay-pill {
          animation: pay-illustration-pay-pill 3s ease-in-out infinite;
        }

        .pay-illustration-circle {
          animation: pay-illustration-circle 3s cubic-bezier(0.34, 1.4, 0.64, 1) infinite;
        }

        .pay-illustration-check {
          animation: pay-illustration-check 3s cubic-bezier(0.34, 1.4, 0.64, 1) infinite;
        }

        .pay-illustration-spark {
          animation: pay-illustration-spark 3s ease-out infinite;
        }

        .pay-illustration-success-copy {
          animation: pay-illustration-success-copy 3s ease-out infinite;
        }
      `}</style>

      <PhoneMockup className="w-[7.25rem] drop-shadow-md">
        <div className="space-y-0.5 pb-1">
          <p className="font-heading text-[0.45rem] font-semibold leading-tight">Pay online</p>
          <p className="text-[0.38rem] leading-snug text-muted-foreground">Secure checkout on your phone.</p>
        </div>
        <PaymentSuccessBurst />
      </PhoneMockup>
    </div>
  );
}

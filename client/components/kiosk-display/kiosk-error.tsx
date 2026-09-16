"use client";

import { AlertCircle } from "lucide-react";

export function KioskError() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-8 text-center">
      <div className="flex size-28 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-16" strokeWidth={1.5} />
      </div>
      <h1 className="font-heading text-4xl font-semibold text-foreground md:text-5xl">
        Print couldn&apos;t be completed
      </h1>
      <p className="max-w-2xl text-xl text-muted-foreground md:text-2xl">
        Please try again or contact the kiosk attendant.
      </p>
    </div>
  );
}

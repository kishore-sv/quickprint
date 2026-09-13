"use client";

import { FileTextIcon, QrCodeIcon, Settings2Icon, WalletIcon } from "lucide-react";
import { PrintJobStatusChip } from "@/components/print/print-job-status-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: QrCodeIcon,
    title: "Kiosk selected",
    detail: "Campus Library · Kiosk 2",
    active: false,
  },
  {
    icon: FileTextIcon,
    title: "Document uploaded",
    detail: "assignment.pdf · 12 pages",
    active: false,
  },
  {
    icon: Settings2Icon,
    title: "Print options",
    detail: "2 copies · Color · A4 · Duplex",
    active: true,
  },
  {
    icon: WalletIcon,
    title: "Pay online",
    detail: "Secure checkout",
    active: false,
  },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-linear-to-br from-primary/10 via-transparent to-muted/60 blur-2xl" />
      <Card className="relative border bg-card/95 shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Your print job</CardTitle>
            <PrintJobStatusChip status="QUEUED" label="Queued" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                step.active ? "border-primary/30 bg-primary/5" : "bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  step.active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                )}
              >
                <step.icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-muted-foreground text-xs">{step.detail}</p>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">{index + 1}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

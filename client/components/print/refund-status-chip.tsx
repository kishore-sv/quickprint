"use client";

import { Badge } from "@/components/ui/badge";
import type { PrintJob, RefundSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const REFUND_LABELS: Record<RefundSummary["status"], string> = {
  PROCESSING: "Refund processing",
  REFUNDED: "Refunded",
  FAILED: "Refund failed",
};

const REFUND_CLASSES: Record<RefundSummary["status"], string> = {
  PROCESSING:
    "border-transparent bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200",
  REFUNDED:
    "border-transparent bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200",
  FAILED:
    "border-transparent bg-red-100 text-red-950 dark:bg-red-950/50 dark:text-red-200",
};

type RefundStatusChipProps = {
  refund: RefundSummary;
  className?: string;
};

export function RefundStatusChip({ refund, className }: RefundStatusChipProps) {
  return (
    <Badge variant="outline" className={cn(REFUND_CLASSES[refund.status], className)}>
      {REFUND_LABELS[refund.status]}
    </Badge>
  );
}

export function JobRefundStatusChip({
  job,
  className,
}: {
  job: Pick<PrintJob, "status" | "refund">;
  className?: string;
}) {
  if (job.status !== "CANCELLED" || !job.refund) return null;
  return <RefundStatusChip refund={job.refund} className={className} />;
}

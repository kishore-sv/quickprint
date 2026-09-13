"use client";

import { Badge } from "@/components/ui/badge";
import { mapPrintJobStatus } from "@/lib/map-print-job-status";
import { getPrintJobStatusChipClassName, getPrintJobStatusConfig } from "@/lib/print-job-status-config";
import type { DisplayStatus, PrintJob } from "@/lib/types";
import { cn } from "@/lib/utils";

type JobLike = Pick<
  PrintJob,
  "display_status" | "display_label" | "display_message" | "payment_status" | "status" | "is_terminal"
>;

type PrintJobStatusChipProps = {
  status?: DisplayStatus;
  label?: string;
  job?: JobLike;
  className?: string;
};

export function PrintJobStatusChip({ status, label, job, className }: PrintJobStatusChipProps) {
  const resolved = job ? mapPrintJobStatus(job) : null;
  const resolvedStatus = status ?? resolved?.status ?? "QUEUED";
  const resolvedLabel = label ?? resolved?.label ?? getPrintJobStatusConfig(resolvedStatus).label;
  const chipClassName = getPrintJobStatusChipClassName(resolvedStatus);

  return (
    <Badge variant="outline" className={cn(chipClassName, className)}>
      {resolvedLabel}
    </Badge>
  );
}

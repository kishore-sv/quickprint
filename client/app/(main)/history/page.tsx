"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import type { PrintJob } from "@/lib/types";
import { cn } from "@/lib/utils";

function HistoryJobSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-5 flex-1 max-w-[200px]" />
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
          <Skeleton className="h-4 w-full max-w-[220px]" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function formatHistoryDate(iso: string) {
  return format(new Date(iso), "d MMM, HH:mm");
}

function formatAmount(paise: number | null) {
  if (paise == null) return null;
  return (paise / 100).toFixed(2);
}

function colorModeLabel(mode: string) {
  if (mode === "BW") return "B&W";
  if (mode === "COLOR") return "Colour";
  return mode;
}

function copiesLabel(copies: number) {
  return copies === 1 ? "1 copy" : `${copies} copies`;
}

function jobMetaLine(job: PrintJob) {
  return [
    `${job.page_count} pages`,
    copiesLabel(job.copies),
    colorModeLabel(job.color_mode),
    job.paper_size,
  ].join(" · ");
}

type StatusPresentation = {
  label: string;
  badgeClass: string;
};

function jobStatusPresentation(job: PrintJob): StatusPresentation {
  if (job.payment_status !== "PAID") {
    return {
      label: "Needs payment",
      badgeClass:
        "border-transparent bg-orange-100 text-orange-900 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-200",
    };
  }

  if (
    job.status === "COMPLETED" ||
    job.status === "EXPIRED" ||
    job.status === "CANCELLED" ||
    job.status === "FAILED"
  ) {
    const label =
      job.status === "COMPLETED"
        ? "Completed"
        : job.status === "FAILED"
          ? "Failed"
          : job.status === "CANCELLED"
            ? "Cancelled"
            : "Expired";
    return {
      label,
      badgeClass:
        "border-transparent bg-muted text-muted-foreground hover:bg-muted",
    };
  }

  return {
    label: "In queue",
    badgeClass:
      "border-transparent bg-sky-100 text-sky-900 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200",
  };
}

function daysLeft(until: string | null) {
  if (!until) return null;
  const diff = new Date(until).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (86400000)));
}

function HistoryJobCard({ job }: { job: PrintJob }) {
  const savedDays = daysLeft(job.file_retention_until);
  const status = jobStatusPresentation(job);
  const amount = formatAmount(job.amount_paise);
  const showPrintAgain =
    job.saved_file_id && job.save_file && savedDays !== null && savedDays > 0;

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <FileText className="size-5" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug break-words">
              {job.original_filename}
            </h2>
            {amount != null && (
              <p className="shrink-0 text-base font-semibold tabular-nums">₹{amount}</p>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">{jobMetaLine(job)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatHistoryDate(job.created_at)}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-full px-2.5 py-0.5 font-medium", status.badgeClass)}>
              {status.label}
            </Badge>
            {savedDays != null && job.save_file && (
              <span className="text-xs text-muted-foreground">
                Saved {savedDays}d left
              </span>
            )}
          </div>

          {showPrintAgain && (
            <LinkButton
              href={`/print?file=${job.saved_file_id}`}
              variant="outline"
              size="sm"
              className="mt-3 w-full sm:w-auto"
            >
              Print again
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void apiFetch<PrintJob[]>("/me/print-jobs")
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold tracking-tight">History</h1>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto shrink-0 p-0 text-sm font-medium text-primary"
          onClick={() => toast.add({ title: "Presets are coming soon", type: "info" })}
        >
          My presets
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading print history">
          <HistoryJobSkeleton />
          <HistoryJobSkeleton />
          <HistoryJobSkeleton />
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyTitle>No print jobs yet</EmptyTitle>
            <EmptyDescription>Start a print from the Print tab to see jobs here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && jobs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <HistoryJobCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText } from "lucide-react";
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
import { JobRefundStatusChip } from "@/components/print/refund-status-chip";
import { PrintJobStatusChip } from "@/components/print/print-job-status-chip";
import { mapPrintJobStatus } from "@/lib/map-print-job-status";
import type { PrintJob, PrintJobListResponse } from "@/lib/types";
import Link from "next/link";

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

function daysLeft(until: string | null) {
  if (!until) return null;
  const diff = new Date(until).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (86400000)));
}

function HistoryJobCard({ job }: { job: PrintJob }) {
  const savedDays = daysLeft(job.file_retention_until);
  const amount = formatAmount(job.amount_paise);
  const showPrintAgain =
    job.saved_file_id && job.save_file && savedDays !== null && savedDays > 0;
  const isCancelled = mapPrintJobStatus(job).status === "CANCELLED";

  return (
    <article
      className={`rounded-xl border bg-card p-4 shadow-sm ${isCancelled ? "opacity-60" : ""}`}
    >
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
            <PrintJobStatusChip
              job={job}
              className="rounded-full px-2.5 py-0.5 font-medium"
            />
            <JobRefundStatusChip job={job} className="rounded-full px-2.5 py-0.5 font-medium" />
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

const HISTORY_PAGE_SIZE = 20;

export default function HistoryPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    void apiFetch<PrintJobListResponse>(`/me/print-jobs?page=1&limit=${HISTORY_PAGE_SIZE}`)
      .then((data) => {
        setJobs(data.items);
        setHasMore(data.has_more);
      })
      .catch(() => {
        setJobs([]);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    void apiFetch<PrintJobListResponse>(
      `/me/print-jobs?page=${nextPage}&limit=${HISTORY_PAGE_SIZE}`
    )
      .then((data) => {
        setJobs((prev) => [...prev, ...data.items]);
        setPage(nextPage);
        setHasMore(data.has_more);
      })
      .catch(() => toast.add({ title: "Could not load more jobs", type: "error" }))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground">
          View your print history and manage your print jobs.
        </p>
        </div>
        <Link
          href="/presets"
          className="h-auto shrink-0 p-0 text-sm font-medium text-primary hover:underline transition-none underline-offset-4"
        >
          My Presets
        </Link>
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
        <>
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <HistoryJobCard job={job} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

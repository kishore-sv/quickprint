"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatJobAmount,
  formatJobSummary,
  jobInQueue,
  jobNeedsPayment,
} from "@/lib/print-job-display";
import type { PrintJob } from "@/lib/types";
import { toast } from "@/components/ui/toast";

type PrintJobCardProps = {
  job: PrintJob;
  onRemove?: (jobId: string) => void;
  removing?: boolean;
};

export function PrintJobCard({ job, onRemove, removing }: PrintJobCardProps) {
  const needsPayment = jobNeedsPayment(job);
  const inQueue = jobInQueue(job);
  const amount = formatJobAmount(job);

  return (
    <Card className="py-0 shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium leading-snug">{job.original_filename}</p>
              {inQueue && amount && (
                <span className="shrink-0 text-sm font-semibold tabular-nums">{amount}</span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatJobSummary(job)}</p>
          </div>
        </div>

        {needsPayment && (
          <Badge
            variant="outline"
            className="border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100"
          >
            Needs payment
          </Badge>
        )}
        {inQueue && <Badge>In queue</Badge>}

        <div className="flex flex-wrap gap-2">
          {needsPayment && (
            <>
              <LinkButton href={`/print?job=${job.id}`} size="sm" className="min-w-[5.5rem]">
                Set up
              </LinkButton>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={removing}
                onClick={() => onRemove?.(job.id)}
              >
                Remove
              </Button>
            </>
          )}
          {inQueue && (
            <>
              <LinkButton href="/scan" size="sm" className="min-w-[5.5rem]">
                Scan kiosk
              </LinkButton>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={() =>
                  toast.add({
                    title: "Paid jobs can't be removed here",
                    description: "Print at a kiosk or check History after printing.",
                    type: "info",
                  })
                }
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PrintJobCardSkeleton() {
  return (
    <Card className="py-0 shadow-none" aria-hidden>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[85%] max-w-xs" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

type DraftSessionCardProps = {
  filename: string;
  pageCount: number;
  onRemove: () => void;
};

export function DraftSessionCard({ filename, pageCount, onRemove }: DraftSessionCardProps) {
  return (
    <Card className="py-0 shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-snug">{filename}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pageCount} page{pageCount === 1 ? "" : "s"} · setup not finished
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100"
        >
          Needs payment
        </Badge>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/print" size="sm">
            Set up
          </LinkButton>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

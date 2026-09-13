"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { PrintJobCardSkeleton } from "@/components/print/print-job-card";
import { apiFetch, apiFetchPublic, fetchPrintJobs } from "@/lib/api";
import { formatJobAmount, formatJobSummary } from "@/lib/print-job-display";
import { pageMaxWidthClass } from "@/lib/layout";
import type { Kiosk, PrintJob } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

function parseKioskScan(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("kiosk");
    if (fromQuery) return fromQuery.trim();
    const lastSegment = url.pathname.replace(/\/$/, "").split("/").pop();
    if (lastSegment && lastSegment !== "scan") return lastSegment.trim();
  } catch {
    /* plain code or token */
  }
  return trimmed;
}

export default function ScanPage() {
  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [jobsLoading, setJobsLoading] = useState(true);
  const [kioskLoading, setKioskLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const scanLock = useRef(false);

  const loadReadyJobs = useCallback(async () => {
    const { items } = await fetchPrintJobs("?view=ready&limit=20&page=1");
    setJobs(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, []);

  useEffect(() => {
    void loadReadyJobs()
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  }, [loadReadyJobs]);

  useEffect(() => {
    setSelectedIds(new Set(jobs.map((j) => j.id)));
  }, [jobs]);

  const loadKioskFromScan = useCallback(
    async (rawScan: string) => {
      const token = parseKioskScan(rawScan);
      if (!token) {
        toast.add({ title: "Could not read kiosk QR", type: "error" });
        return;
      }
      setKioskLoading(true);
      try {
        const k = await apiFetchPublic<Kiosk>(`/kiosks/${encodeURIComponent(token)}`);
        await apiFetch(`/kiosks/${encodeURIComponent(token)}/session`, {
          method: "POST",
        });
        setKiosk(k);
        toast.add({ title: `Connected to ${k.name}`, type: "success" });
        await loadReadyJobs();
      } catch (e) {
        toast.add({
          title: e instanceof Error ? e.message : "Could not connect to kiosk",
          type: "error",
        });
      } finally {
        setKioskLoading(false);
      }
    },
    [loadReadyJobs]
  );

  const onQrDetected = (raw: string) => {
    if (kiosk || kioskLoading || scanLock.current) return;
    scanLock.current = true;
    void loadKioskFromScan(raw).finally(() => {
      scanLock.current = false;
    });
  };

  const disconnectKiosk = () => {
    setKiosk(null);
  };

  const toggleJob = (jobId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  };

  const selectAllJobs = () => setSelectedIds(new Set(jobs.map((j) => j.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const releaseSelected = async () => {
    if (!kiosk || selectedIds.size === 0) return;
    setReleasing(true);
    const ids = [...selectedIds];
    let succeeded = 0;
    let lastError: string | null = null;
    try {
      for (const jobId of ids) {
        try {
          await apiFetch<PrintJob>(`/print-jobs/${jobId}/release`, {
            method: "POST",
            json: { kiosk_code: kiosk.kiosk_code },
          });
          succeeded += 1;
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Release failed";
        }
      }
      if (succeeded > 0) {
        toast.add({
          title:
            succeeded === 1
              ? "1 job sent to the printer"
              : `${succeeded} jobs sent to the printer`,
          type: "success",
        });
      }
      if (lastError && succeeded < ids.length) {
        toast.add({
          title: lastError,
          description:
            succeeded > 0 ? `${succeeded} of ${ids.length} jobs were released.` : undefined,
          type: "error",
        });
      }
      await loadReadyJobs();
    } finally {
      setReleasing(false);
    }
  };

  const selectedCount = selectedIds.size;
  const showPrintBar = Boolean(kiosk) && jobs.length > 0;

  return (
    <div className={cn("flex flex-col gap-5", showPrintBar && "pb-32")}>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">Scan kiosk</h1>
        {!kiosk && (
          <p className="text-sm text-muted-foreground">
            Scan the QR on the printer to connect, then choose jobs to print.
          </p>
        )}
      </div>

      {!kiosk && (
        <Card
          className={cn(
            "relative mx-auto w-full overflow-hidden py-0 shadow-none",
            "max-w-[min(100%,20rem)] sm:max-w-[min(100%,22rem)]",
            "md:max-w-[280px] lg:max-w-[300px]"
          )}
        >
          {kioskLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/85">
              <Spinner className="size-8 text-primary" />
              <p className="text-sm font-medium">Connecting…</p>
            </div>
          )}
          <CardContent className="p-0">
            <div className="aspect-square w-full">
              <QrScanner
                onScan={(detected) => {
                  const raw = detected[0]?.rawValue;
                  if (raw) onQrDetected(raw);
                }}
                constraints={{ facingMode: "environment" }}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { objectFit: "cover" },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {kiosk && (
        <Card className="border-primary/25 bg-primary/5 py-0 shadow-none">
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Connected kiosk
              </p>
              <p className="font-heading text-lg font-semibold leading-tight">
                {kiosk.kiosk_code}
              </p>
              <p className="font-medium">{kiosk.name}</p>
              {kiosk.location ? (
                <p className="text-sm text-muted-foreground">{kiosk.location}</p>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={disconnectKiosk}>
              Scan again
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Your print jobs</h2>
          {kiosk && jobs.length > 1 && (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={selectAllJobs}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {jobsLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <PrintJobCardSkeleton />
          </div>
        ) : jobs.length === 0 ? (
          <Empty className="border py-6">
            <EmptyHeader>
              <EmptyTitle>No jobs ready</EmptyTitle>
              <EmptyDescription>
                Paid jobs that are not yet claimed will show here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {!kiosk && (
              <p className="text-xs text-muted-foreground">
                Scan the kiosk QR to enable printing.
              </p>
            )}
            {jobs.map((job) => {
              const amount = formatJobAmount(job);
              const selected = selectedIds.has(job.id);
              return (
                <Card
                  key={job.id}
                  className={cn(
                    "py-0 shadow-none transition-colors",
                    kiosk && selected && "border-primary/40 ring-1 ring-primary/15"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {kiosk ? (
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(c) => toggleJob(job.id, c === true)}
                          aria-label={`Include ${job.job_number}`}
                          className="mt-0.5"
                        />
                      ) : (
                        <div className="size-4 shrink-0" aria-hidden />
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-snug">{job.original_filename}</p>
                          {amount ? (
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              {amount}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatJobSummary(job)}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge>In queue</Badge>
                          <span className="text-xs text-muted-foreground">{job.job_number}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showPrintBar && (
        <div
          className={cn(
            "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-4",
            pageMaxWidthClass
          )}
        >
          <div className="rounded-2xl border bg-card p-3 shadow-lg">
            <p className="mb-2 text-center text-xs text-muted-foreground">
              {selectedCount === jobs.length
                ? `All ${jobs.length} job${jobs.length === 1 ? "" : "s"} selected`
                : `${selectedCount} of ${jobs.length} selected`}
            </p>
            <Button
              className="w-full"
              size="lg"
              disabled={selectedCount === 0 || releasing}
              onClick={() => void releaseSelected()}
            >
              {releasing ? (
                <>
                  <Spinner className="size-4" />
                  Sending to printer…
                </>
              ) : selectedCount === jobs.length ? (
                "Print all at this kiosk"
              ) : (
                `Print ${selectedCount} at this kiosk`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

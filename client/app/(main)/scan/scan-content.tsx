"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { PrintJobCardSkeleton } from "@/components/print/print-job-card";
import { apiFetch, apiFetchPublic, ensureGuestSession, fetchPrintJobs } from "@/lib/api";
import { clearKioskServerSession } from "@/lib/kiosk-session";
import { kioskScanErrorMessage } from "@/lib/kiosk-scan-errors";
import { formatJobAmount, formatJobSummary } from "@/lib/print-job-display";
import { mapPrintJobStatus } from "@/lib/map-print-job-status";
import { PrintJobStatusChip } from "@/components/print/print-job-status-chip";
import { pageMaxWidthClass } from "@/lib/layout";
import type { Kiosk, KioskServiceStatus, PrintJob } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { PlusIcon } from "lucide-react";

const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

const SUPPORT_EMAIL = "help@quickprint.fun";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  const [kioskToken, setKioskToken] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [jobsLoading, setJobsLoading] = useState(true);
  const [kioskLoading, setKioskLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const scanLock = useRef(false);
  const releaseLock = useRef(false);
  const connectHandledRef = useRef<string | null>(null);

  const loadReadyJobs = useCallback(async () => {
    const { items } = await fetchPrintJobs("?view=ready&limit=20&page=1");
    setJobs(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, []);

  const loadKioskServiceStatus = useCallback(async (token: string) => {
    try {
      const status = await apiFetchPublic<KioskServiceStatus>(
        `/kiosks/${encodeURIComponent(token)}/status`
      );
      setServiceOnline(status.service.online);
    } catch {
      setServiceOnline(false);
    }
  }, []);

  useEffect(() => {
    const legacyToken = searchParams.get("kiosk");
    if (legacyToken?.trim()) {
      router.replace(`/scan/${encodeURIComponent(legacyToken.trim())}`);
      return;
    }
    setJobsLoading(true);
    void loadReadyJobs()
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  }, [loadReadyJobs, router, searchParams, pathname]);

  useEffect(() => {
    if (!kioskToken) return;
    const timer = setInterval(() => {
      void loadKioskServiceStatus(kioskToken);
    }, 10000);
    return () => clearInterval(timer);
  }, [kioskToken, loadKioskServiceStatus]);

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
        await ensureGuestSession();
        const k = await apiFetchPublic<Kiosk>(`/kiosks/${encodeURIComponent(token)}`);
        await apiFetch(`/kiosks/${encodeURIComponent(token)}/session`, {
          method: "POST",
        });
        setKiosk(k);
        setKioskToken(token);
        await loadKioskServiceStatus(token);
        toast.add({ title: `Connected to ${k.name}`, type: "success" });
        await loadReadyJobs();
      } catch (e) {
        const { title, description } = kioskScanErrorMessage(e);
        toast.add({ title, description, type: "warning" });
      } finally {
        setKioskLoading(false);
      }
    },
    [loadReadyJobs, loadKioskServiceStatus, router]
  );

  useEffect(() => {
    const connectToken = searchParams.get("connect")?.trim();
    if (!connectToken || kiosk || connectHandledRef.current === connectToken) return;
    connectHandledRef.current = connectToken;
    router.replace("/scan");
    void loadKioskFromScan(connectToken);
  }, [searchParams, kiosk, router, loadKioskFromScan]);

  useEffect(() => {
    return () => {
      void clearKioskServerSession();
    };
  }, []);

  const onQrDetected = (raw: string) => {
    if (kiosk || kioskLoading || scanLock.current) return;
    scanLock.current = true;
    void loadKioskFromScan(raw).finally(() => {
      scanLock.current = false;
    });
  };

  const disconnectKiosk = () => {
    setKiosk(null);
    setKioskToken(null);
    setServiceOnline(null);
    connectHandledRef.current = null;
    void clearKioskServerSession();
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
    if (!kiosk || selectedIds.size === 0 || releaseLock.current) return;
    if (serviceOnline === false) {
      toast.add({
        title: "Kiosk service is currently unavailable.",
        description: `Contact the QuickPrint team at ${SUPPORT_EMAIL}.`,
        type: "error",
      });
      return;
    }

    releaseLock.current = true;
    setReleasing(true);
    const ids = [...selectedIds];
    let succeeded = 0;
    let firstReleasedId: string | null = null;
    let lastError: string | null = null;
    try {
      for (const jobId of ids) {
        try {
          await apiFetch<PrintJob>(`/print-jobs/${jobId}/release`, {
            method: "POST",
            json: { kiosk_code: kiosk.kiosk_code },
          });
          if (!firstReleasedId) firstReleasedId = jobId;
          succeeded += 1;
        } catch (e) {
          lastError = e instanceof Error ? e.message : "Could not send job to kiosk";
        }
      }
      if (succeeded > 0 && firstReleasedId) {
        if (succeeded > 1) {
          toast.add({
            title: `${succeeded} jobs sent to the kiosk`,
            type: "success",
          });
        }
        setKiosk(null);
        setKioskToken(null);
        setServiceOnline(null);
        connectHandledRef.current = null;
        await clearKioskServerSession();
        router.push(`/print/jobs/${firstReleasedId}`);
        return;
      }
      if (lastError) {
        toast.add({
          title: "Could not send job to kiosk",
          description: `Contact the QuickPrint team at ${SUPPORT_EMAIL}.`,
          type: "error",
        });
      }
      await loadReadyJobs();
    } finally {
      setReleasing(false);
      releaseLock.current = false;
    }
  };

  const selectedCount = selectedIds.size;
  const showPrintBar = Boolean(kiosk) && jobs.length > 0;
  const printDisabled = releasing || serviceOnline === false;

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
              {serviceOnline === true && (
                <Badge variant="outline" className="mt-1 border-green-600/40 text-green-700 dark:text-green-400">
                  Service online
                </Badge>
              )}
              {serviceOnline === false && (
                <div className="mt-2 space-y-1">
                  <Badge variant="destructive">Service unavailable</Badge>
                  <p className="text-xs text-muted-foreground">
                    This kiosk is not available right now. Contact {SUPPORT_EMAIL}.
                  </p>
                </div>
              )}
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
                {kiosk
                  ? "Upload and pay for a new job. Scan the kiosk QR each time you print."
                  : "Paid jobs that are not yet printed will show here."}
              </EmptyDescription>
            </EmptyHeader>
            {kiosk ? (
              <LinkButton href="/print" size="lg" className="w-full max-w-sm transition-none">
                <PlusIcon className="mr-2 size-4" />
                Start printing
              </LinkButton>
            ) : null}
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
              const { message: statusMessage } = mapPrintJobStatus(job);
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
                          disabled={printDisabled}
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
                        {kiosk?.name && (
                          <p className="text-xs text-muted-foreground">{kiosk.name}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <PrintJobStatusChip job={job} />
                          <span className="text-xs text-muted-foreground">{job.job_number}</span>
                        </div>
                        {statusMessage && (
                          <p className="text-xs text-muted-foreground">{statusMessage}</p>
                        )}
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
              {serviceOnline === false
                ? "Kiosk service unavailable"
                : selectedCount === jobs.length
                  ? `All ${jobs.length} job${jobs.length === 1 ? "" : "s"} selected`
                  : `${selectedCount} of ${jobs.length} selected`}
            </p>
            <Button
              className="w-full"
              size="lg"
              disabled={selectedCount === 0 || printDisabled}
              onClick={() => void releaseSelected()}
            >
              {releasing ? (
                <>
                  <Spinner className="size-4" />
                  Sending to printer…
                </>
              ) : serviceOnline === false ? (
                "Service unavailable"
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

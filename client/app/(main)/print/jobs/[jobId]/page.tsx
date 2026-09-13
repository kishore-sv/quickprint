"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { pageMaxWidthClass } from "@/lib/layout";
import { playPrintCompleteSound, printPickupMessage } from "@/lib/print-complete-feedback";
import { mapPrintJobStatus, STEP_LABELS } from "@/lib/print-job-status";
import { usePrintJobPoll } from "@/lib/use-print-job-poll";
import { cn } from "@/lib/utils";

export default function PrintJobStatusPage() {
  const params = useParams();
  const jobId = typeof params.jobId === "string" ? params.jobId : "";
  const { job, error, loading } = usePrintJobPoll(jobId);
  const completionSoundPlayed = useRef(false);

  const status = job ? mapPrintJobStatus(job).status : null;

  useEffect(() => {
    if (status !== "COMPLETED" || completionSoundPlayed.current) return;
    completionSoundPlayed.current = true;
    playPrintCompleteSound();
  }, [status]);

  if (error) {
    return (
      <div className={cn("py-10", pageMaxWidthClass)}>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!job && loading) {
    return (
      <div className={cn("flex justify-center py-16", pageMaxWidthClass)}>
        <Spinner />
      </div>
    );
  }

  if (!job) {
    return (
      <div className={cn("py-10", pageMaxWidthClass)}>
        <p className="text-muted-foreground text-sm">Print job not found.</p>
      </div>
    );
  }

  const steps = job.steps ?? [];
  const { label, message, isTerminal: terminal } = mapPrintJobStatus(job);
  const isSuccess = status === "COMPLETED";
  const isFailed = status === "FAILED";
  const pickupMessage = isSuccess ? printPickupMessage(job) : message;

  return (
    <div className={cn("flex flex-col gap-6 py-8", pageMaxWidthClass)}>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Print status</h1>
        <Badge
          className="mt-2"
          variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}
        >
          {label}
        </Badge>
      </div>

      {isSuccess && (
        <div
          className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-primary"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-heading text-base font-semibold">All done!</p>
            <p className="text-sm leading-relaxed">{pickupMessage}</p>
          </div>
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">File</dt>
          <dd className="font-medium">{job.original_filename}</dd>
        </div>
        {(job.kiosk_code || job.kiosk_name) && (
          <div>
            <dt className="text-muted-foreground">Kiosk</dt>
            <dd className="font-medium">
              {job.kiosk_code ?? job.kiosk_name}
              {job.kiosk_code && job.kiosk_name ? (
                <span className="text-muted-foreground"> · {job.kiosk_name}</span>
              ) : null}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Job</dt>
          <dd className="font-medium">{job.job_number}</dd>
        </div>
      </dl>

      {pickupMessage && !isSuccess && (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            isFailed && "border-destructive/30 bg-destructive/5 text-destructive",
            !isFailed && "border-muted bg-muted/30 text-muted-foreground"
          )}
        >
          {pickupMessage}
        </p>
      )}

      {job.kiosk_service_online === false && status === "QUEUED" && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Kiosk temporarily unavailable. Your print will start when the kiosk reconnects.
        </p>
      )}

      <ol className="flex flex-col gap-2 border-l-2 border-muted pl-4">
        {steps.map((step) => {
          const stepLabel = STEP_LABELS[step.key];
          const icon = step.done ? "✓ " : step.active ? "● " : "○ ";
          return (
            <li
              key={step.key}
              className={cn(
                step.done && "text-muted-foreground",
                step.active && "font-medium text-foreground",
                step.key === "printed" && step.done && "font-medium text-primary"
              )}
            >
              {icon}
              {stepLabel}
            </li>
          );
        })}
      </ol>

      {!terminal && (
        <p className="text-xs text-muted-foreground">Updating automatically…</p>
      )}
    </div>
  );
}

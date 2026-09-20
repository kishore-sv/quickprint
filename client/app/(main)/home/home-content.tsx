"use client";

import { useCallback, useEffect, useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DraftSessionCard,
  PrintJobCard,
  PrintJobCardSkeleton,
} from "@/components/print/print-job-card";
import { fetchPrintJobs } from "@/lib/api";
import { cancelPrintJob } from "@/lib/cancel-print-job";
import { clearPrintFlowSession, readPrintFlowSession } from "@/lib/print-session";
import type { PrintJob } from "@/lib/types";
import { toast } from "@/components/ui/toast";
import { PlusIcon, ScanIcon } from "lucide-react";

const SKELETON_COUNT = 2;

export default function HomePageContent() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [sessionDraft, setSessionDraft] = useState<{
    filename: string;
    pageCount: number;
    documentCount: number;
  } | null>(null);

  const loadJobs = useCallback(async () => {
    const { items } = await fetchPrintJobs("?view=active&limit=20&page=1");
    setJobs(items.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }, []);

  useEffect(() => {
    void loadJobs()
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [loadJobs]);

  useEffect(() => {
    if (loading) return;
    const session = readPrintFlowSession();
    if (!session || session.step === "upload" || session.drafts.length === 0) {
      setSessionDraft(null);
      return;
    }
    const coveredByJob =
      session.jobId != null && jobs.some((j) => j.id === session.jobId);
    if (coveredByJob) {
      setSessionDraft(null);
      return;
    }
    const first = session.drafts[0];
    const totalPages = session.drafts.reduce((sum, d) => sum + d.pageCount, 0);
    setSessionDraft({
      filename:
        session.drafts.length > 1
          ? `${first.originalFilename} + ${session.drafts.length - 1} more`
          : first.originalFilename,
      pageCount: totalPages,
      documentCount: session.drafts.length,
    });
  }, [jobs, loading]);

  const removeJob = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      await cancelPrintJob(jobId);
      toast.add({ title: "Job removed", type: "success" });
      await loadJobs();
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : "Could not remove job",
        type: "error",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const cancelPaidJob = async (jobId: string) => {
    setRemovingId(jobId);
    try {
      const result = await cancelPrintJob(jobId);
      toast.add({
        title: "Print job cancelled",
        description:
          result.refund?.status === "PROCESSING"
            ? "Your refund is being processed."
            : undefined,
        type: "success",
      });
      await loadJobs();
    } catch (e) {
      toast.add({
        title: e instanceof Error ? e.message : "Could not cancel job",
        type: "error",
      });
    } finally {
      setRemovingId(null);
    }
  };

  const clearSession = () => {
    clearPrintFlowSession();
    setSessionDraft(null);
    toast.add({ title: "Draft cleared", type: "success" });
  };

  const hasItems = sessionDraft != null || jobs.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">Your print jobs</h1>
        <p className="text-sm text-muted-foreground">
          Finish payment or release paid jobs at a kiosk.
        </p>
      </div>

      <div className="flex flex-col gap-3 justify-center items-center">
        <LinkButton href="/print" size="lg" className="md:w-1/2 w-full transition-none">
         <PlusIcon className="size-4 mr-2"/> Start printing
        </LinkButton>
        <LinkButton href="/scan" variant="outline" size="lg" className="md:w-1/2 w-full transition-none">
          <ScanIcon className="size-4 mr-2"/> Scan kiosk
        </LinkButton>
      </div>

      {loading ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-busy="true"
          aria-label="Loading print jobs"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <PrintJobCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {!hasItems && (
            <Empty className="border py-8">
              <EmptyHeader>
                <EmptyTitle>No active jobs</EmptyTitle>
                <EmptyDescription>
                  Upload a PDF to start printing. Paid jobs waiting at a kiosk appear here
                  too.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {hasItems && (
            <div className="flex flex-col gap-3">
              {sessionDraft && (
                <DraftSessionCard
                  filename={sessionDraft.filename}
                  pageCount={sessionDraft.pageCount}
                  documentCount={sessionDraft.documentCount}
                  onRemove={clearSession}
                />
              )}
              {jobs.map((job) => (
                <PrintJobCard
                  key={job.id}
                  job={job}
                  removing={removingId === job.id}
                  onRemove={(id) => void removeJob(id)}
                  onCancelPaid={(id) => cancelPaidJob(id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

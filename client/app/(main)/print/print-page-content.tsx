"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Spinner } from "@/components/ui/spinner";
import { FileDropzone } from "@/components/print/file-dropzone";
import {
  getDraftDisplayName,
  getDraftDisplaySizeBytes,
  PrintSetupForm,
  type PrintFileDraft,
} from "@/components/print/print-setup-form";
import { apiFetch, apiFetchPublic, uploadFile } from "@/lib/api";
import { formatFileSize, MAX_UPLOAD_BYTES } from "@/lib/format-file-size";
import { loadRazorpayScript } from "@/lib/load-razorpay";
import { readKioskContext } from "@/lib/kiosk-context";
import { PrintJobStatusChip } from "@/components/print/print-job-status-chip";
import { imageFileToPdf } from "@/lib/image-to-pdf";
import { formatPageRange, filterPagesByPageSet, parsePageRange } from "@/lib/print-pricing";
import {
  clearPrintFlowSession,
  draftsFromPersisted,
  draftsToPersisted,
  fileFromSaved,
  readPrintFlowSession,
  writePrintFlowSession,
  type PrintFlowStep,
} from "@/lib/print-session";
import { validatePdfFile } from "@/lib/pdf-validation";
import {
  getUnsupportedFileMessage,
  isPdf,
  isSupportedImage,
  isWordDocument,
} from "@/lib/supported-file-types";
import type {
  PaymentCreateResponse,
  PricingConfig,
  PrintJob,
  PrintSettings,
  SavedFile,
} from "@/lib/types";
import { toast } from "@/components/ui/toast";

function showError(message: string) {
  toast.add({ title: message, type: "error" });
}
function showSuccess(message: string) {
  toast.add({ title: message, type: "success" });
}

type Step = PrintFlowStep;

const defaultSettings: PrintSettings = {
  copies: 1,
  page_range: "all",
  color_mode: "BW",
  paper_size: "A4",
  duplex: "SINGLE",
  pages_per_sheet: 1,
  page_set: "ALL",
  order: "NORMAL",
  orientation: "AUTO",
  quality: "NORMAL",
  fit_to_page: false,
  collate: true,
  save_file: false,
};

function allPages(pageCount: number) {
  return new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
}

function syncJobUrl(jobId: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("job", jobId);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}

function apiPrintSettings(settings: PrintSettings) {
  return {
    copies: settings.copies,
    page_range: settings.page_range,
    color_mode: settings.color_mode,
    paper_size: settings.paper_size,
    duplex: settings.duplex,
    pages_per_sheet: settings.pages_per_sheet,
    order: settings.order,
    orientation: settings.orientation,
    fit_to_page: settings.fit_to_page,
    save_file: settings.save_file,
  };
}

function settingsFromJob(j: PrintJob): Partial<PrintSettings> {
  return {
    copies: j.copies,
    page_range: j.page_range,
    color_mode: j.color_mode as PrintSettings["color_mode"],
    paper_size: j.paper_size as PrintSettings["paper_size"],
    duplex: j.duplex as PrintSettings["duplex"],
    pages_per_sheet: j.pages_per_sheet,
    order: j.order as PrintSettings["order"],
    orientation: j.orientation as PrintSettings["orientation"],
    fit_to_page: j.fit_to_page,
    save_file: j.save_file,
  };
}

export default function PrintPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("job");
  const kioskContext = readKioskContext();

  const [step, setStep] = useState<Step>("upload");
  const [drafts, setDrafts] = useState<PrintFileDraft[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [applySettingsToAll, setApplySettingsToAll] = useState(true);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [job, setJob] = useState<PrintJob | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const paymentVerifyStarted = useRef(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const skipNextPersist = useRef(false);
  const urlHydratedFor = useRef<string | null>(null);

  const assignJob = useCallback((j: PrintJob | null) => {
    setJob(j);
    activeJobIdRef.current = j?.id ?? null;
  }, []);

  const clearActiveJob = useCallback(() => {
    assignJob(null);
  }, [assignJob]);

  const resolveActiveJobId = useCallback(() => {
    return (
      job?.id ??
      activeJobIdRef.current ??
      readPrintFlowSession()?.jobId ??
      jobIdFromUrl ??
      null
    );
  }, [job?.id, jobIdFromUrl]);

  useEffect(() => {
    void apiFetchPublic<PricingConfig>("/config/pricing").then(setPricing).catch(() => {});
  }, []);

  const loadJobFromUrl = useCallback(
    async (jobId: string, preserveStep?: Step) => {
      const j = await apiFetch<PrintJob>(`/print-jobs/${jobId}`);
      if (j.payment_status === "PAID") {
        showSuccess("This job is paid - open Scan kiosk to print");
        assignJob(j);
        setStep("checkout");
        return;
      }
      if (!j.saved_file_id) {
        throw new Error("Print job has no file");
      }
      const saved = await apiFetch<SavedFile>(`/files/${j.saved_file_id}`);
      const file = await fileFromSaved(saved);
      const pages = parsePageRange(j.page_range, j.page_count);
      skipNextPersist.current = true;
      setDrafts([
        {
          file,
          displayName: saved.original_filename,
          displaySizeBytes: saved.file_size_bytes,
          pageCount: j.page_count,
          savedFile: saved,
          selectedPages: new Set(pages.length > 0 ? pages : [...allPages(j.page_count)]),
        },
      ]);
      setFileIndex(0);
      setSettings((prev) => ({ ...defaultSettings, ...prev, ...settingsFromJob(j) }));
      assignJob(j);
      syncJobUrl(j.id);
      if (preserveStep) {
        setStep(preserveStep);
      } else {
        setStep("checkout");
      }
    },
    [assignJob]
  );

  useEffect(() => {
    if (jobIdFromUrl) {
      if (urlHydratedFor.current === jobIdFromUrl && job?.id === jobIdFromUrl) {
        setHydrating(false);
        return;
      }
      let cancelled = false;
      setHydrating(true);
      urlHydratedFor.current = jobIdFromUrl;
      const session = readPrintFlowSession();
      const preserveStep =
        session?.jobId === jobIdFromUrl && session.step !== "upload"
          ? session.step
          : undefined;
      void loadJobFromUrl(jobIdFromUrl, preserveStep)
        .catch((e) => {
          if (!cancelled) {
            showError(e instanceof Error ? e.message : "Could not open job");
            setStep("upload");
            urlHydratedFor.current = null;
          }
        })
        .finally(() => {
          if (!cancelled) setHydrating(false);
        });
      return () => {
        cancelled = true;
      };
    }

    urlHydratedFor.current = null;
    let cancelled = false;
    async function hydrateSession() {
      const saved = readPrintFlowSession();
      if (!saved || saved.step === "upload") {
        setHydrating(false);
        return;
      }
      try {
        const restoredDrafts = await draftsFromPersisted(saved.drafts, (id) =>
          apiFetch<SavedFile>(`/files/${id}`)
        );
        if (cancelled) return;
        skipNextPersist.current = true;
        setDrafts(restoredDrafts);
        setSettings({ ...defaultSettings, ...saved.settings });
        setApplySettingsToAll(saved.applySettingsToAll);
        setFileIndex(Math.min(saved.fileIndex, Math.max(0, restoredDrafts.length - 1)));

        if (saved.jobId) {
          const existingJob = await apiFetch<PrintJob>(`/print-jobs/${saved.jobId}`);
          if (cancelled) return;
          assignJob(existingJob);
          syncJobUrl(existingJob.id);
        }

        setStep(saved.step === "checkout" ? "checkout" : "settings");
      } catch {
        clearPrintFlowSession();
        if (!cancelled) {
          clearActiveJob();
          setStep("upload");
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    }
    void hydrateSession();
    return () => {
      cancelled = true;
    };
  }, [jobIdFromUrl, loadJobFromUrl, assignJob, clearActiveJob, job?.id]);

  useEffect(() => {
    if (step === "checkout") {
      void loadRazorpayScript().catch(() => {
        /* pay() surfaces load errors when user taps Pay */
      });
    }
  }, [step]);

  useEffect(() => {
    if (hydrating) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (step === "upload" && drafts.length === 0) {
      clearPrintFlowSession();
      return;
    }
    const persistedDrafts = draftsToPersisted(drafts);
    if (step === "settings" && persistedDrafts.length === 0) {
      return;
    }
    if (step === "settings" || step === "checkout") {
      const jobId = job?.id ?? activeJobIdRef.current ?? undefined;
      writePrintFlowSession({
        version: 1,
        step,
        settings,
        applySettingsToAll,
        fileIndex,
        drafts: persistedDrafts,
        jobId,
      });
    }
  }, [
    step,
    settings,
    applySettingsToAll,
    fileIndex,
    drafts,
    job?.id,
    hydrating,
  ]);

  const clearDrafts = useCallback(() => {
    clearPrintFlowSession();
    setDrafts([]);
    setFileIndex(0);
    clearActiveJob();
    urlHydratedFor.current = null;
    setStep("upload");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("job");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [clearActiveJob]);

  const processIncomingFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setValidating(true);
      clearActiveJob();
      urlHydratedFor.current = null;
      try {
        const next: PrintFileDraft[] = [];
        for (const raw of files) {
          if (raw.size > MAX_UPLOAD_BYTES) {
            throw new Error(
              `${raw.name} is too large (${formatFileSize(raw.size)}). Maximum size is 50 MB.`
            );
          }
          if (isWordDocument(raw)) {
            next.push({
              file: raw,
              displayName: raw.name,
              displaySizeBytes: raw.size,
              pageCount: 0,
              savedFile: null,
              selectedPages: new Set(),
            });
            continue;
          }

          let candidate = raw;
          if (isSupportedImage(raw)) {
            candidate = await imageFileToPdf(raw);
          } else if (!isPdf(raw)) {
            throw new Error(getUnsupportedFileMessage());
          }

          const { pageCount } = await validatePdfFile(candidate);
          next.push({
            file: candidate,
            displayName: raw.name,
            displaySizeBytes: raw.size,
            pageCount,
            savedFile: null,
            selectedPages: allPages(pageCount),
          });
        }
        setDrafts(next);
        setFileIndex(0);
        setSettings((s) => ({ ...s, page_range: "all" }));
      } catch (e) {
        clearDrafts();
        showError(e instanceof Error ? e.message : "Invalid file");
      } finally {
        setValidating(false);
      }
    },
    [clearDrafts, clearActiveJob]
  );

  const continueToSettings = async () => {
    if (drafts.length === 0) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      const uploaded: PrintFileDraft[] = [];
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        const progress = (p: number) => {
          const base = (i / drafts.length) * 100;
          setUploadProgress(Math.round(base + p / drafts.length));
        };
        let fileToUpload = d.file;
        if (isSupportedImage(fileToUpload)) {
          fileToUpload = await imageFileToPdf(fileToUpload);
        } else if (!isPdf(fileToUpload) && !isWordDocument(fileToUpload)) {
          throw new Error(getUnsupportedFileMessage());
        }
        const saved = await uploadFile(
          fileToUpload,
          settings.save_file,
          progress,
          d.displayName
        );
        const file = isWordDocument(d.file) ? await fileFromSaved(saved) : d.file;
        const selectedPages =
          d.selectedPages.size > 0 ? d.selectedPages : allPages(saved.page_count);
        uploaded.push({
          ...d,
          file,
          displayName: saved.original_filename,
          displaySizeBytes: saved.file_size_bytes,
          savedFile: saved,
          pageCount: saved.page_count,
          selectedPages,
        });
      }
      setUploadProgress(100);
      setDrafts(uploaded);
      clearActiveJob();
      setStep("settings");
      showSuccess("File uploaded");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const settingsForDraft = (draft: PrintFileDraft): PrintSettings => {
    const filtered = filterPagesByPageSet(
      [...draft.selectedPages].sort((a, b) => a - b),
      settings.page_set
    );
    const range = formatPageRange(filtered, draft.pageCount);
    return {
      ...settings,
      page_range: range || "all",
    };
  };

  const submitPrintJobs = async () => {
    if (drafts.length === 0) return;
    setCreatingJob(true);
    try {
      let lastJob: PrintJob | null = job;
      let didPatch = false;
      let didPost = false;
      let patchedTargetId: string | null = null;

      const targetJobId = resolveActiveJobId();

      for (const draft of drafts) {
        if (!draft.savedFile) continue;
        const payload = apiPrintSettings(settingsForDraft(draft));

        let shouldPatch =
          targetJobId != null && patchedTargetId !== targetJobId;

        if (shouldPatch) {
          let existing = job?.id === targetJobId ? job : null;
          if (!existing) {
            existing = await apiFetch<PrintJob>(`/print-jobs/${targetJobId}`);
          }
          const fileMatches =
            drafts.length === 1 ||
            existing.saved_file_id === draft.savedFile.id;
          if (existing.payment_status !== "PAID" && fileMatches) {
            lastJob = await apiFetch<PrintJob>(`/print-jobs/${targetJobId}`, {
              method: "PATCH",
              json: payload,
            });
            assignJob(lastJob);
            patchedTargetId = targetJobId;
            didPatch = true;
            continue;
          }
        }

        lastJob = await apiFetch<PrintJob>("/print-jobs", {
          method: "POST",
          json: { saved_file_id: draft.savedFile.id, ...payload },
        });
        assignJob(lastJob);
        syncJobUrl(lastJob.id);
        didPost = true;
      }

      if (lastJob) {
        setStep("checkout");
        showSuccess(
          didPatch && !didPost
            ? "Print job updated"
            : didPatch && didPost
              ? "Print jobs saved"
              : drafts.length > 1
                ? "Print jobs created"
                : "Print job created"
        );
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to save print job");
    } finally {
      setCreatingJob(false);
    }
  };

  const pay = async () => {
    if (!job || payBusy || verifyingPayment) return;
    setPayBusy(true);
    try {
      const payment = await apiFetch<PaymentCreateResponse>("/payments/create", {
        method: "POST",
        json: { print_job_id: job.id },
      });

      await loadRazorpayScript();

      if (!window.Razorpay) {
        showError("Payment SDK not loaded");
        setPayBusy(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: payment.key_id,
        amount: payment.amount_paise,
        currency: payment.currency,
        order_id: payment.razorpay_order_id,
        name: "QuickPrint",
        description: job.job_number,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          paymentVerifyStarted.current = true;
          setPayBusy(false);
          setVerifyingPayment(true);
          try {
            const updated = await apiFetch<PrintJob>("/payments/verify", {
              method: "POST",
              json: response,
            });
            assignJob(updated);
            clearPrintFlowSession();
            activeJobIdRef.current = null;
            const connectedKiosk = readKioskContext();
            showSuccess(
              connectedKiosk
                ? `Ready to print at ${connectedKiosk.name}`
                : "Payment successful - scan the kiosk to print"
            );
            router.push("/scan");
          } catch (err) {
            showError(err instanceof Error ? err.message : "Payment verification failed");
          } finally {
            paymentVerifyStarted.current = false;
            setVerifyingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPayBusy(false);
          },
        },
      });

      rzp.on("payment.failed", (response: unknown) => {
          if (paymentVerifyStarted.current) return;
          setPayBusy(false);
          const err = response as {
            error?: { description?: string; reason?: string };
          };
          showError(
            err.error?.description ??
              err.error?.reason ??
              "Payment failed. Try again."
          );
        });

      rzp.open();
      setPayBusy(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Payment failed");
      setPayBusy(false);
    }
  };

  const amountRupees =
    job?.amount_paise != null ? (job.amount_paise / 100).toFixed(2) : null;

  const busy =
    validating || uploading || creatingJob || payBusy || verifyingPayment || hydrating;
  const currentDraft = drafts[fileIndex];

  if (hydrating) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <Spinner className="size-8 text-primary" />
        <p className="text-muted-foreground text-sm">Restoring your print session…</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden">
        {step === "upload" && (
          <>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">New print</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Pick a document, then choose how it prints.
              </p>
            </div>

            <FileDropzone
              onFilesSelected={(f) => void processIncomingFiles(f)}
              onFilesRejected={showError}
              validating={validating}
              disabled={uploading}
            />

            {drafts.length > 0 && (
              <div className="space-y-2">
                {drafts.map((d, i) => (
                  <Card key={`${getDraftDisplayName(d)}-${i}`} className="relative py-0 shadow-none">
                    <CardContent className="py-3 pl-4 pr-12 text-sm">
                      {i === 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          className="absolute right-2 top-2 size-7 rounded-full shadow-sm"
                          onClick={clearDrafts}
                          disabled={busy}
                          aria-label="Remove files"
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      )}
                      <p className="font-medium truncate pr-1">{getDraftDisplayName(d)}</p>
                      <p className="text-muted-foreground">
                        {formatFileSize(getDraftDisplaySizeBytes(d))}
                        {d.pageCount > 0
                          ? ` · ${d.pageCount} pages`
                          : " · Word document - page count after upload"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={drafts.length === 0 || busy}
              onClick={() => void continueToSettings()}
            >
              {uploading ? (
                <>
                  <Spinner className="size-4" />
                  Uploading… {uploadProgress}%
                </>
              ) : (
                "Continue to print settings"
              )}
            </Button>
          </>
        )}

        {step === "settings" && currentDraft?.savedFile && (
          <PrintSetupForm
            drafts={drafts}
            fileIndex={fileIndex}
            onFileIndexChange={setFileIndex}
            onSelectedPagesChange={(index, pages) => {
              setDrafts((prev) =>
                prev.map((d, i) => (i === index ? { ...d, selectedPages: pages } : d))
              );
            }}
            settings={settings}
            onSettingsChange={setSettings}
            applySettingsToAll={applySettingsToAll}
            onApplySettingsToAllChange={setApplySettingsToAll}
            pricing={pricing}
            submitting={creatingJob}
            onSubmit={() => void submitPrintJobs()}
          />
        )}

        {step === "checkout" && job && (
          <Card className="relative overflow-hidden m-1">
            {verifyingPayment && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-6 backdrop-blur-[2px]"
                role="status"
                aria-live="polite"
              >
                <Spinner className="size-10 text-primary" />
                <p className="text-center font-medium">Confirming your payment…</p>
                <p className="text-center text-xs text-muted-foreground">
                  Please wait. Do not close this page.
                </p>
              </div>
            )}
            <CardContent className="space-y-3 pt-6 text-sm">
              <p className="font-medium">{job.job_number}</p>
              <p>
                Physical sheets: {job.physical_sheets ?? "-"} · Total: ₹{amountRupees}
              </p>
              {job.payment_status === "PAID" ? (
                <div className="space-y-3">
                  <PrintJobStatusChip job={job} />
                  <p className="text-primary font-medium">Paid - scan the kiosk to print</p>
                  <LinkButton href="/scan" className="w-full">
                    Scan kiosk
                  </LinkButton>
                  <LinkButton href="/home" variant="outline" className="w-full">
                    View on Home
                  </LinkButton>
                </div>
              ) : (
                <>
                  {kioskContext && (
                    <p className="text-muted-foreground text-sm">
                      After payment, confirm print at {kioskContext.name} on the Scan page.
                    </p>
                  )}
                  <p className="text-muted-foreground">Status: {job.payment_status}</p>
                  <Button
                    className="w-full"
                    disabled={payBusy || verifyingPayment}
                    onClick={() => void pay()}
                  >
                    {payBusy ? (
                      <>
                        <Spinner className="size-4" />
                        Opening payment…
                      </>
                    ) : (
                      `Pay ₹${amountRupees}`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={payBusy || verifyingPayment}
                    onClick={() => setStep("settings")}
                  >
                    Edit settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

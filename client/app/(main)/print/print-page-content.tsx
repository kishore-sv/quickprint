"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileDropzone } from "@/components/print/file-dropzone";
import { JobDocumentsList } from "@/components/print/job-documents-list";
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
  PrintJobDocument,
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

function draftFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function documentToSettings(doc: PrintJobDocument): PrintSettings {
  return {
    copies: doc.copies,
    page_range: doc.page_range,
    color_mode: doc.color_mode as PrintSettings["color_mode"],
    paper_size: doc.paper_size as PrintSettings["paper_size"],
    duplex: doc.duplex as PrintSettings["duplex"],
    pages_per_sheet: doc.pages_per_sheet,
    page_set: "ALL",
    order: doc.order as PrintSettings["order"],
    orientation: doc.orientation as PrintSettings["orientation"],
    quality: "NORMAL",
    fit_to_page: doc.fit_to_page,
    collate: true,
    save_file: false,
  };
}

async function draftsFromJobDocuments(
  documents: PrintJobDocument[],
  saveFile: boolean
): Promise<PrintFileDraft[]> {
  const sorted = [...documents].sort((a, b) => a.sort_order - b.sort_order);
  const result: PrintFileDraft[] = [];
  for (const doc of sorted) {
    if (!doc.saved_file_id) continue;
    const saved = await apiFetch<SavedFile>(`/files/${doc.saved_file_id}`);
    const file = await fileFromSaved(saved);
    const pages = parsePageRange(doc.page_range, doc.page_count);
    const settings = { ...documentToSettings(doc), save_file: saveFile };
    result.push({
      file,
      displayName: saved.original_filename,
      displaySizeBytes: saved.file_size_bytes,
      pageCount: doc.page_count,
      savedFile: saved,
      selectedPages: new Set(pages.length > 0 ? pages : [...allPages(doc.page_count)]),
      settings,
    });
  }
  return result;
}

export default function PrintPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("job");
  const fileIdFromUrl = searchParams.get("file");
  const kioskContext = readKioskContext();

  const [step, setStep] = useState<Step>("upload");
  const [drafts, setDrafts] = useState<PrintFileDraft[]>([]);
  const [fileIndex, setFileIndex] = useState(0);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [applySettingsToAll, setApplySettingsToAll] = useState(false);
  const [deleteUploadIndex, setDeleteUploadIndex] = useState<number | null>(null);
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
      const j = await apiFetch<PrintJob & { documents?: PrintJobDocument[] }>(
        `/print-jobs/${jobId}`
      );
      if (j.payment_status === "PAID") {
        showSuccess("This job is paid - open Scan kiosk to print");
        assignJob(j);
        setStep("checkout");
        return;
      }
      const docs = j.documents ?? [];
      if (docs.length === 0 && !j.saved_file_id) {
        throw new Error("Print job has no files");
      }
      skipNextPersist.current = true;
      const restored =
        docs.length > 0
          ? await draftsFromJobDocuments(docs, j.save_file)
          : await draftsFromJobDocuments(
              [
                {
                  id: j.id,
                  sort_order: 0,
                  saved_file_id: j.saved_file_id,
                  original_filename: j.original_filename,
                  page_count: j.page_count,
                  copies: j.copies,
                  page_range: j.page_range,
                  color_mode: j.color_mode,
                  paper_size: j.paper_size,
                  duplex: j.duplex,
                  pages_per_sheet: j.pages_per_sheet,
                  order: j.order,
                  orientation: j.orientation,
                  fit_to_page: j.fit_to_page,
                  physical_sheets: j.physical_sheets,
                  pages_in_range: null,
                  amount_paise: j.amount_paise,
                },
              ],
              j.save_file
            );
      setDrafts(restored);
      setFileIndex(0);
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
    if (fileIdFromUrl && !jobIdFromUrl) {
      let cancelled = false;
      setHydrating(true);
      void (async () => {
        try {
          const saved = await apiFetch<SavedFile>(`/files/${fileIdFromUrl}`);
          const file = await fileFromSaved(saved);
          const pages = [...allPages(saved.page_count)];
          if (!cancelled) {
            skipNextPersist.current = true;
            setDrafts([
              {
                file,
                displayName: saved.original_filename,
                displaySizeBytes: saved.file_size_bytes,
                pageCount: saved.page_count,
                savedFile: saved,
                selectedPages: new Set(pages),
                settings: { ...defaultSettings },
              },
            ]);
            setStep("settings");
          }
        } catch (e) {
          if (!cancelled) {
            showError(e instanceof Error ? e.message : "Could not open file");
          }
        } finally {
          if (!cancelled) setHydrating(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

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
        setApplySettingsToAll(saved.applySettingsToAll ?? false);
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
  }, [jobIdFromUrl, fileIdFromUrl, loadJobFromUrl, assignJob, clearActiveJob, job?.id]);

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
        applySettingsToAll,
        fileIndex,
        drafts: persistedDrafts,
        jobId,
      });
    }
  }, [step, applySettingsToAll, fileIndex, drafts, job?.id, hydrating]);

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
      const existingKeys = new Set(drafts.map((d) => draftFileKey(d.file)));
      const next: PrintFileDraft[] = [];
      const errors: string[] = [];

      for (const raw of files) {
        try {
          if (raw.size > MAX_UPLOAD_BYTES) {
            throw new Error(
              `${raw.name} is too large (${formatFileSize(raw.size)}). Maximum size is 50 MB.`
            );
          }
          if (isWordDocument(raw)) {
            const key = draftFileKey(raw);
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            next.push({
              file: raw,
              displayName: raw.name,
              displaySizeBytes: raw.size,
              pageCount: 0,
              savedFile: null,
              selectedPages: new Set(),
              settings: { ...defaultSettings },
            });
            continue;
          }

          let candidate = raw;
          if (isSupportedImage(raw)) {
            candidate = await imageFileToPdf(raw);
          } else if (!isPdf(raw)) {
            throw new Error(getUnsupportedFileMessage());
          }

          const key = draftFileKey(candidate);
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);

          const { pageCount } = await validatePdfFile(candidate);
          next.push({
            file: candidate,
            displayName: raw.name,
            displaySizeBytes: raw.size,
            pageCount,
            savedFile: null,
            selectedPages: allPages(pageCount),
            settings: { ...defaultSettings },
          });
        } catch (e) {
          errors.push(e instanceof Error ? e.message : `${raw.name} is invalid`);
        }
      }

      if (next.length > 0) {
        setDrafts((prev) => [...prev, ...next]);
      }
      if (errors.length > 0) {
        showError(errors[0]!);
      }
      setValidating(false);
    },
    [drafts, clearActiveJob]
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
          d.settings.save_file,
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
          settings: {
            ...d.settings,
            page_range: formatPageRange([...selectedPages].sort((a, b) => a - b), saved.page_count) || "all",
          },
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
      draft.settings.page_set
    );
    const range = formatPageRange(filtered, draft.pageCount);
    return {
      ...draft.settings,
      page_range: range || "all",
    };
  };

  const buildDocumentsPayload = () =>
    drafts
      .filter((d) => d.savedFile)
      .map((draft) => ({
        saved_file_id: draft.savedFile!.id,
        ...apiPrintSettings(settingsForDraft(draft)),
      }));

  const submitPrintJobs = async () => {
    if (drafts.length === 0) return;
    setCreatingJob(true);
    try {
      const documents = buildDocumentsPayload();
      if (documents.length === 0) throw new Error("No uploaded files");

      const saveFile = drafts.some((d) => d.settings.save_file);
      const targetJobId = resolveActiveJobId();
      let result: PrintJob & { documents?: PrintJobDocument[] };

      if (targetJobId && job?.payment_status !== "PAID") {
        result = await apiFetch(`/print-jobs/${targetJobId}`, {
          method: "PATCH",
          json: { documents, save_file: saveFile },
        });
        showSuccess("Print job updated");
      } else {
        result = await apiFetch("/print-jobs", {
          method: "POST",
          json: { documents, save_file: saveFile },
        });
        showSuccess(
          documents.length > 1 ? "Print job created" : "Print job created"
        );
      }

      assignJob(result);
      syncJobUrl(result.id);
      setStep("checkout");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to save print job");
    } finally {
      setCreatingJob(false);
    }
  };

  const removeDraftAt = (index: number) => {
    setDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        clearDrafts();
        return [];
      }
      setFileIndex((fi) => Math.min(fi, next.length - 1));
      return next;
    });
  };

  const deleteJobDocument = async (index: number) => {
    const targetJobId = resolveActiveJobId();
    const docId = job?.documents?.[index]?.id;
    if (targetJobId && job && job.payment_status !== "PAID" && docId) {
      try {
        const updated = await apiFetch<PrintJob & { documents?: PrintJobDocument[] }>(
          `/print-jobs/${targetJobId}/documents/${docId}`,
          { method: "DELETE" }
        );
        assignJob(updated);
        const restored = await draftsFromJobDocuments(
          updated.documents ?? [],
          updated.save_file
        );
        setDrafts(restored);
        setFileIndex(Math.min(fileIndex, Math.max(0, restored.length - 1)));
        return;
      } catch (e) {
        showError(e instanceof Error ? e.message : "Could not delete file");
        return;
      }
    }
    removeDraftAt(index);
  };

  const updateDraftSettings = (index: number, settings: PrintSettings) => {
    setDrafts((prev) =>
      prev.map((d, i) => {
        if (applySettingsToAll) {
          return { ...d, settings };
        }
        return i === index ? { ...d, settings } : d;
      })
    );
  };

  const currentSettings = drafts[fileIndex]?.settings ?? defaultSettings;

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
      <div className="flex w-full min-w-0 flex-col gap-6 overflow-x-hidden px-2 pb-4">
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
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="absolute right-2 top-2 size-7 rounded-full shadow-sm text-destructive"
                        onClick={() => setDeleteUploadIndex(i)}
                        disabled={busy}
                        aria-label={`Remove ${getDraftDisplayName(d)}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
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

            <AlertDialog
              open={deleteUploadIndex != null}
              onOpenChange={(open) => !open && setDeleteUploadIndex(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This file will be removed from this print job.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      if (deleteUploadIndex != null) removeDraftAt(deleteUploadIndex);
                      setDeleteUploadIndex(null);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
            settings={currentSettings}
            onSettingsChange={(s) => updateDraftSettings(fileIndex, s)}
            applySettingsToAll={applySettingsToAll}
            onApplySettingsToAllChange={setApplySettingsToAll}
            pricing={pricing}
            submitting={creatingJob}
            onSubmit={() => void submitPrintJobs()}
          />
        )}

        {step === "checkout" && job && (
          <div className="relative space-y-4">
            {verifyingPayment && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-6 backdrop-blur-[2px] rounded-xl"
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
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{job.job_number}</h1>
              <p className="text-muted-foreground text-sm">Uploaded files</p>
            </div>

            <JobDocumentsList
              drafts={drafts}
              canDelete={job.payment_status !== "PAID"}
              onDelete={(i) => void deleteJobDocument(i)}
            />

            <Card className="shadow-none">
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total files</span>
                  <span>
                    {job.document_count ?? job.documents?.length ?? drafts.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total pages</span>
                  <span>{job.total_logical_pages ?? job.page_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Physical sheets</span>
                  <span>{job.physical_sheets ?? "-"}</span>
                </div>
                {(job.bw_physical_sheets ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">B&W sheets</span>
                    <span>{job.bw_physical_sheets}</span>
                  </div>
                )}
                {(job.color_physical_sheets ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color sheets</span>
                    <span>{job.color_physical_sheets}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base pt-1 border-t">
                  <span>Total</span>
                  <span>₹{amountRupees}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden m-0 shadow-none">
            <CardContent className="space-y-3 pt-4 text-sm">
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
          </div>
        )}
      </div>
    </>
  );
}

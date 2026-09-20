import type { PrintSettings, SavedFile } from "@/lib/types";
import type { PrintFileDraft } from "@/components/print/print-setup-form";

const STORAGE_KEY = "quickprint.print-flow.v1";

export type PrintFlowStep = "upload" | "settings" | "checkout";

export type PersistedPrintDraft = {
  savedFileId: string;
  selectedPages: number[];
  pageCount: number;
  originalFilename: string;
  settings: PrintSettings;
};

export type PersistedPrintFlow = {
  version: 1;
  step: PrintFlowStep;
  applySettingsToAll: boolean;
  fileIndex: number;
  drafts: PersistedPrintDraft[];
  jobId?: string;
};

export function readPrintFlowSession(): PersistedPrintFlow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedPrintFlow;
    if (parsed.version !== 1 || !parsed.drafts?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePrintFlowSession(data: PersistedPrintFlow): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearPrintFlowSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function draftsToPersisted(drafts: PrintFileDraft[]): PersistedPrintDraft[] {
  return drafts
    .filter((d) => d.savedFile?.id)
    .map((d) => ({
      savedFileId: d.savedFile!.id,
      selectedPages: [...d.selectedPages].sort((a, b) => a - b),
      pageCount: d.pageCount,
      originalFilename: d.savedFile!.original_filename,
      settings: d.settings,
    }));
}

export async function fileFromSaved(saved: SavedFile): Promise<File> {
  let meta = saved;
  if (!meta.download_url) {
    throw new Error("Missing download URL");
  }
  const res = await fetch(meta.download_url);
  if (!res.ok) throw new Error("Could not download file");
  const blob = await res.blob();
  return new File([blob], meta.original_filename, { type: "application/pdf" });
}

export async function draftsFromPersisted(
  persisted: PersistedPrintDraft[],
  fetchSaved: (id: string) => Promise<SavedFile>
): Promise<PrintFileDraft[]> {
  const savedList = await Promise.all(persisted.map((p) => fetchSaved(p.savedFileId)));
  const files = await Promise.all(savedList.map((saved) => fileFromSaved(saved)));
  return persisted.map((p, i) => {
    const saved = savedList[i]!;
    const file = files[i]!;
    const pages =
      p.selectedPages.length > 0
        ? p.selectedPages
        : [...Array(saved.page_count)].map((_, j) => j + 1);
    return {
      file,
      displayName: saved.original_filename,
      displaySizeBytes: saved.file_size_bytes,
      pageCount: saved.page_count,
      savedFile: saved,
      selectedPages: new Set(pages.filter((n) => n >= 1 && n <= saved.page_count)),
      settings: p.settings,
    };
  });
}

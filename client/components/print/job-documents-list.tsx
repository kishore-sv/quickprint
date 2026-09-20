"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { DocumentPreviewCard } from "@/components/print/document-preview-card";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";
import { PrintSettingsSummary } from "@/components/print/print-settings-summary";
import type { PrintFileDraft } from "@/components/print/print-setup-form";
import { formatPageRange } from "@/lib/print-pricing";
import { getDraftDisplayName } from "@/components/print/print-setup-form";

type JobDocumentsListProps = {
  drafts: PrintFileDraft[];
  canDelete?: boolean;
  onDelete?: (index: number) => void;
};

export function JobDocumentsList({
  drafts,
  canDelete = false,
  onDelete,
}: JobDocumentsListProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const previewDraft = previewIndex != null ? drafts[previewIndex] : null;

  return (
    <>
      <div className="space-y-3">
        {drafts.map((draft, i) => {
          const pageRange =
            formatPageRange(
              [...draft.selectedPages].sort((a, b) => a - b),
              draft.pageCount
            ) || "all";
          return (
            <Card key={`${getDraftDisplayName(draft)}-${i}`} className="py-0 shadow-none">
              <CardContent className="space-y-3 p-4">
                <DocumentPreviewCard
                  filename={getDraftDisplayName(draft)}
                  pageCount={draft.pageCount}
                  file={draft.file}
                  pageRange={pageRange}
                  settings={draft.settings}
                  onPreview={() => setPreviewIndex(i)}
                  onDelete={
                    canDelete && onDelete
                      ? () => setDeleteIndex(i)
                      : undefined
                  }
                />
                <PrintSettingsSummary
                  settings={draft.settings}
                  pageCount={draft.pageCount}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewDraft && (
        <PrintPreviewDialog
          open={previewIndex != null}
          onOpenChange={(open) => !open && setPreviewIndex(null)}
          filename={getDraftDisplayName(previewDraft)}
          file={previewDraft.file}
          pageCount={previewDraft.pageCount}
          pageRange={
            formatPageRange(
              [...previewDraft.selectedPages].sort((a, b) => a - b),
              previewDraft.pageCount
            ) || "all"
          }
          settings={previewDraft.settings}
        />
      )}

      <AlertDialog
        open={deleteIndex != null}
        onOpenChange={(open) => !open && setDeleteIndex(null)}
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
                if (deleteIndex != null) onDelete?.(deleteIndex);
                setDeleteIndex(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

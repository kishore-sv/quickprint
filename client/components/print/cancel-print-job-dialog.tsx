"use client";

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
import { formatJobAmount } from "@/lib/print-job-display";
import type { PrintJob } from "@/lib/types";

type CancelPrintJobDialogProps = {
  job: Pick<PrintJob, "original_filename" | "amount_paise">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirming?: boolean;
  includeRefundCopy?: boolean;
};

export function CancelPrintJobDialog({
  job,
  open,
  onOpenChange,
  onConfirm,
  confirming = false,
  includeRefundCopy = true,
}: CancelPrintJobDialogProps) {
  const amount = formatJobAmount(job as PrintJob);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this print job?</AlertDialogTitle>
          <AlertDialogDescription>
            {includeRefundCopy && amount
              ? `${amount} will be refunded to your payment method and the uploaded file will be deleted.`
              : "This will remove the print job from your list."}
          </AlertDialogDescription>
          <p className="text-sm font-medium">{job.original_filename}</p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>Keep job</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={confirming}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirming ? "Cancelling…" : "Cancel print job"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

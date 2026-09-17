import { apiFetch } from "@/lib/api";
import type { CancelPrintJobResponse } from "@/lib/types";

export async function cancelPrintJob(jobId: string) {
  return apiFetch<CancelPrintJobResponse>(`/print-jobs/${jobId}/cancel`, {
    method: "POST",
  });
}

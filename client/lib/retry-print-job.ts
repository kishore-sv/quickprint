import { apiFetch } from "@/lib/api";
import type { PrintJobDetail } from "@/lib/types";

export async function retryPrintJob(jobId: string) {
  return apiFetch<PrintJobDetail>(`/print-jobs/${jobId}/retry`, {
    method: "POST",
  });
}

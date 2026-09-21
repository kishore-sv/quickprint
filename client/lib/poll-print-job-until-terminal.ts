import { fetchPrintJobDetail } from "@/lib/api";
import { isPrintJobTerminal } from "@/lib/map-print-job-status";
import type { PrintJobDetail } from "@/lib/types";

const POLL_MS = 2000;

export async function pollPrintJobUntilTerminal(
  jobId: string,
  onUpdate?: (job: PrintJobDetail) => void
): Promise<PrintJobDetail> {
  const load = async () => {
    const job = await fetchPrintJobDetail(jobId);
    onUpdate?.(job);
    return job;
  };

  const first = await load();
  if (isPrintJobTerminal(first)) return first;

  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      void load()
        .then((updated) => {
          if (isPrintJobTerminal(updated)) {
            clearInterval(timer);
            resolve(updated);
          }
        })
        .catch((e) => {
          clearInterval(timer);
          reject(e);
        });
    }, POLL_MS);
  });
}

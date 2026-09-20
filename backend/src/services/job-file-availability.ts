export function isJobFileInStorage(job: {
  cleanupStatus: string | null;
  saveFile: boolean;
  fileRetentionUntil: Date | null;
}): boolean {
  if (job.cleanupStatus === "SUCCESS") return false;
  if (job.saveFile) {
    if (!job.fileRetentionUntil) return false;
    return job.fileRetentionUntil.getTime() > Date.now();
  }
  return true;
}

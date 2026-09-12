import type { InferSelectModel } from "drizzle-orm";
import type { kiosks, printJobs, savedFiles } from "../db/schema";

export function serializePrintJob(job: InferSelectModel<typeof printJobs>) {
  return {
    id: job.id,
    job_number: job.jobNumber,
    user_id: job.userId,
    status: job.status,
    payment_status: job.paymentStatus,
    original_filename: job.originalFilename,
    page_count: job.pageCount,
    copies: job.copies,
    page_range: job.pageRange,
    color_mode: job.colorMode,
    paper_size: job.paperSize,
    duplex: job.duplex,
    pages_per_sheet: job.pagesPerSheet,
    order: job.order,
    orientation: job.orientation,
    fit_to_page: job.fitToPage,
    physical_sheets: job.physicalSheets,
    amount_paise: job.amountPaise,
    currency: job.currency,
    save_file: job.saveFile,
    file_retention_until: job.fileRetentionUntil,
    kiosk_id: job.kioskId,
    saved_file_id: job.savedFileId,
    created_at: job.createdAt,
    paid_at: job.paidAt,
    claimed_at: job.claimedAt,
  };
}

export function serializeSavedFile(
  file: InferSelectModel<typeof savedFiles>,
  downloadUrl?: string | null
) {
  return {
    id: file.id,
    original_filename: file.originalFilename,
    file_size_bytes: file.fileSizeBytes,
    page_count: file.pageCount,
    retention_until: file.retentionUntil,
    created_at: file.createdAt,
    download_url: downloadUrl ?? null,
  };
}

export function serializeKiosk(kiosk: InferSelectModel<typeof kiosks>) {
  return {
    id: kiosk.id,
    kiosk_code: kiosk.kioskCode,
    public_token: kiosk.publicToken,
    name: kiosk.name,
    location: kiosk.location,
    status: kiosk.status,
  };
}

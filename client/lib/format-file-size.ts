/** Matches backend `MAX_UPLOAD_BYTES` default (50 MiB). */
export const MAX_UPLOAD_BYTES = 52_428_800;

const KB = 1000;
const MB = KB * 1000;
const GB = MB * 1000;

/** Human-readable size using decimal units (1 KB = 1000 B, 1 MB = 1000 KB). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return formatUnit(bytes / KB, "KB");
  if (bytes < GB) return formatUnit(bytes / MB, "MB");
  return formatUnit(bytes / GB, "GB");
}

function formatUnit(value: number, unit: string): string {
  if (value >= 100) return `${Math.round(value)} ${unit}`;
  if (value >= 10) return `${value.toFixed(1)} ${unit}`;
  return `${value.toFixed(value < 1 ? 2 : 1)} ${unit}`;
}

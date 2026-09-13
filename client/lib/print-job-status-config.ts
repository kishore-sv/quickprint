import type { DisplayStatus } from "@/lib/types";

export type PrintJobStatusKey = DisplayStatus;

export type PrintJobStatusConfig = {
  label: string;
  chipClassName: string;
};

const chip = (light: string, dark: string) =>
  `border-transparent ${light} ${dark}`;

export const PRINT_JOB_STATUS_CONFIG: Record<PrintJobStatusKey, PrintJobStatusConfig> = {
  AWAITING_PAYMENT: {
    label: "Needs payment",
    chipClassName: chip(
      "bg-amber-100 text-amber-950 hover:bg-amber-100",
      "dark:bg-amber-950/80 dark:text-amber-100 dark:hover:bg-amber-950/80 dark:border-[1px] border-border"
    ),
  },
  QUEUED: {
    label: "In queue",
    chipClassName: chip(
      "bg-sky-100 text-sky-950 hover:bg-sky-100",
      "dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-950/50 dark:border-[1px] border-border"
    ),
  },
  RECEIVED: {
    label: "Kiosk received",
    chipClassName: chip(
      "bg-violet-100 text-violet-950 hover:bg-violet-100",
      "dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-950/50 dark:border-[1px] border-border"
    ),
  },
  DOWNLOADING: {
    label: "Downloading",
    chipClassName: chip(
      "bg-cyan-100 text-cyan-950 hover:bg-cyan-100",
      "dark:bg-cyan-950/50 dark:text-cyan-200 dark:hover:bg-cyan-950/50 dark:border-[1px] border-border"
    ),
  },
  READY: {
    label: "File prepared",
    chipClassName: chip(
      "bg-yellow-100 text-yellow-950 hover:bg-yellow-100",
      "dark:bg-yellow-950/50 dark:text-yellow-200 dark:hover:bg-yellow-950/50 dark:border-[1px] border-border"
    ),
  },
  PRINTING: {
    label: "Printing",
    chipClassName: chip(
      "bg-indigo-100 text-indigo-950 hover:bg-indigo-100",
      "dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-950/50 dark:border-[1px] border-border"
    ),
  },
  COMPLETED: {
    label: "Printed",
    chipClassName: chip(
      "bg-green-100 text-green-950 hover:bg-green-100",
      "dark:bg-green-950/50 dark:text-green-200 dark:hover:bg-green-950/50 dark:border-[1px] border-border"
    ),
  },
  FAILED: {
    label: "Failed",
    chipClassName: chip(
      "bg-red-100 text-red-950 hover:bg-red-100",
      "dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/50 dark:border-[1px] border-border"
    ),
  },
  CANCELLED: {
    label: "Cancelled",
    chipClassName: chip(
      "bg-muted text-muted-foreground hover:bg-muted",
      "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:border-[1px] border-border"
    ),
  },
  EXPIRED: {
    label: "Expired",
    chipClassName: chip(
      "bg-slate-100 text-slate-800 hover:bg-slate-100",
      "dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:border-[1px] border-border"
    ),
  },
};

export const PRINT_JOB_STATUS_LABELS: Record<PrintJobStatusKey, string> = Object.fromEntries(
  Object.entries(PRINT_JOB_STATUS_CONFIG).map(([key, cfg]) => [key, cfg.label])
) as Record<PrintJobStatusKey, string>;

export function getPrintJobStatusConfig(status: PrintJobStatusKey): PrintJobStatusConfig {
  return PRINT_JOB_STATUS_CONFIG[status];
}

export function getPrintJobStatusChipClassName(status: PrintJobStatusKey): string {
  return PRINT_JOB_STATUS_CONFIG[status].chipClassName;
}

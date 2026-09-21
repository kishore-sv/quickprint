export type KioskDisplayState =
  | "IDLE"
  | "RECEIVED"
  | "PREPARED"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED";

export type KioskJobDisplayStatus =
  | "RECEIVED"
  | "PREPARED"
  | "PRINTING"
  | "COMPLETED"
  | "FAILED";

export type KioskDisplayEvent = {
  type: "kiosk.job.status";
  kioskCode: string;
  jobId: string;
  status: KioskJobDisplayStatus;
  updatedAt: string;
};

export type KioskDisplayPrinterSnapshot = {
  display_state: string;
  connection_state: string;
  operational_state: string;
  reasons: string[];
  telemetry_fresh: boolean;
  updated_at: string | null;
};

export type KioskDisplayPrinterEvent = {
  type: "kiosk.printer.status";
  kioskCode: string;
  printer: KioskDisplayPrinterSnapshot;
  updatedAt: string;
};

export type KioskDisplayStateResponse = {
  kioskCode: string;
  kioskName: string;
  scanUrl: string;
  state: KioskDisplayState;
  jobId: string | null;
  updatedAt: string;
  printer: KioskDisplayPrinterSnapshot;
};

export type KioskDisplayViewState = {
  state: KioskDisplayState;
  kioskCode: string;
  kioskName: string;
  scanUrl: string;
  jobId: string | null;
  updatedAt: string;
  printer: KioskDisplayPrinterSnapshot | null;
};

/** Time on "Printed!" before returning to QR (collect-from-tray buffer). */
export const KIOSK_DISPLAY_COMPLETED_MS = 5300;
export const KIOSK_DISPLAY_FAILED_MS = 7000;

export const WS_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;

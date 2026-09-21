export const ConnectionState = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  UNKNOWN: "UNKNOWN",
} as const;
export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export const OperationalState = {
  IDLE: "IDLE",
  PRINTING: "PRINTING",
  ERROR: "ERROR",
  PAPER_OUT: "PAPER_OUT",
  PAPER_JAM: "PAPER_JAM",
  TONER_LOW: "TONER_LOW",
  TONER_OUT: "TONER_OUT",
  COVER_OPEN: "COVER_OPEN",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  UNKNOWN: "UNKNOWN",
} as const;
export type OperationalState = (typeof OperationalState)[keyof typeof OperationalState];

export const PrinterDisplayState = {
  READY: "READY",
  PRINTING: "PRINTING",
  OFFLINE: "OFFLINE",
  ERROR: "ERROR",
  PAPER_OUT: "PAPER_OUT",
  PAPER_JAM: "PAPER_JAM",
  TONER_LOW: "TONER_LOW",
  TONER_OUT: "TONER_OUT",
  COVER_OPEN: "COVER_OPEN",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  UNKNOWN: "UNKNOWN",
  TELEMETRY_STALE: "TELEMETRY_STALE",
} as const;
export type PrinterDisplayState =
  (typeof PrinterDisplayState)[keyof typeof PrinterDisplayState];

export type PrinterCapabilitiesJson = {
  manufacturer?: string | null;
  model?: string | null;
  connection_type?: string;
  supports_printer_state_reasons?: boolean;
  supports_supply_information?: boolean;
};

export type KioskDisplayPrinterSnapshot = {
  display_state: string;
  connection_state: string;
  operational_state: string;
  reasons: string[];
  telemetry_fresh: boolean;
  updated_at: string | null;
};

export type ResolvedPrinterTelemetry = {
  printer_name: string | null;
  connection_state: ConnectionState;
  operational_state: OperationalState;
  display_state: PrinterDisplayState;
  reasons: string[];
  raw_reasons: string[];
  capabilities: PrinterCapabilitiesJson | null;
  telemetry_fresh: boolean;
  telemetry_last_seen_at: string | null;
  updated_at: string | null;
};

/** Customer-facing printer snapshot on print-job detail (same resolver as kiosk display). */
export type CustomerPrinterSnapshot = {
  display_state: string;
  connection_state: string;
  operational_state: string;
  telemetry_fresh: boolean;
  telemetry_last_seen_at: string | null;
};

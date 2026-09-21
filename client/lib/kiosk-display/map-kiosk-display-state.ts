import type {
  KioskDisplayEvent,
  KioskDisplayPrinterEvent,
  KioskDisplayPrinterSnapshot,
  KioskDisplayState,
  KioskDisplayStateResponse,
  KioskDisplayViewState,
  KioskJobDisplayStatus,
} from "./types";
import { KIOSK_DISPLAY_COMPLETED_MS, KIOSK_DISPLAY_FAILED_MS } from "./types";

export function jobStatusToDisplayState(status: KioskJobDisplayStatus): KioskDisplayState {
  switch (status) {
    case "RECEIVED":
      return "RECEIVED";
    case "PREPARED":
      return "PREPARED";
    case "PRINTING":
      return "PRINTING";
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
  }
}

export function isTerminalDisplayState(state: KioskDisplayState): boolean {
  return state === "COMPLETED" || state === "FAILED";
}

export function shouldReturnToIdle(
  state: KioskDisplayState,
  updatedAt: string,
  now = Date.now()
): boolean {
  if (state === "COMPLETED") {
    return now - new Date(updatedAt).getTime() > KIOSK_DISPLAY_COMPLETED_MS;
  }
  if (state === "FAILED") {
    return now - new Date(updatedAt).getTime() > KIOSK_DISPLAY_FAILED_MS;
  }
  return false;
}

export function applyDisplayEvent(
  current: KioskDisplayViewState,
  event: KioskDisplayEvent
): KioskDisplayViewState {
  if (event.kioskCode !== current.kioskCode) return current;

  const nextState = jobStatusToDisplayState(event.status);
  const eventTime = new Date(event.updatedAt).getTime();
  const currentTime = new Date(current.updatedAt).getTime();

  if (current.jobId && current.jobId !== event.jobId && !isTerminalDisplayState(current.state)) {
    return current;
  }

  if (eventTime < currentTime && current.jobId === event.jobId) {
    return current;
  }

  return {
    ...current,
    state: nextState,
    jobId: event.jobId,
    updatedAt: event.updatedAt,
  };
}

export function reconcileDisplayState(
  current: KioskDisplayViewState,
  server: KioskDisplayStateResponse
): KioskDisplayViewState {
  if (
    server.state === "IDLE" ||
    shouldReturnToIdle(server.state, server.updatedAt)
  ) {
    return {
      ...current,
      state: "IDLE",
      jobId: null,
      kioskCode: server.kioskCode,
      kioskName: server.kioskName,
      scanUrl: server.scanUrl,
      updatedAt: server.updatedAt,
      printer: server.printer,
    };
  }

  return {
    state: server.state,
    kioskCode: server.kioskCode,
    kioskName: server.kioskName,
    scanUrl: server.scanUrl,
    jobId: server.jobId,
    updatedAt: server.updatedAt,
    printer: server.printer,
  };
}

export function applyPrinterEvent(
  current: KioskDisplayViewState,
  event: KioskDisplayPrinterEvent
): KioskDisplayViewState {
  if (event.kioskCode !== current.kioskCode) return current;
  const eventTime = new Date(event.updatedAt).getTime();
  const printerTime = current.printer?.updated_at
    ? new Date(current.printer.updated_at).getTime()
    : 0;
  if (eventTime < printerTime) return current;
  return {
    ...current,
    printer: event.printer as KioskDisplayPrinterSnapshot,
  };
}

export type ProgressStep = "received" | "prepared" | "printing" | "printed";

export type ProgressStepState = {
  key: ProgressStep;
  label: string;
  status: "completed" | "current" | "future";
};

const PROGRESS_STEPS: { key: ProgressStep; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "prepared", label: "Prepared" },
  { key: "printing", label: "Printing" },
  { key: "printed", label: "Printed" },
];

const STATE_TO_STEP: Record<KioskDisplayState, ProgressStep | null> = {
  IDLE: null,
  RECEIVED: "received",
  PREPARED: "prepared",
  PRINTING: "printing",
  COMPLETED: "printed",
  FAILED: "printing",
};

export function buildProgressSteps(state: KioskDisplayState): ProgressStepState[] {
  const activeKey = STATE_TO_STEP[state];
  const activeIndex = activeKey ? PROGRESS_STEPS.findIndex((s) => s.key === activeKey) : -1;

  return PROGRESS_STEPS.map((step, index) => {
    if (state === "COMPLETED") {
      return { ...step, status: "completed" as const };
    }
    if (state === "FAILED") {
      return {
        ...step,
        status: index < PROGRESS_STEPS.findIndex((s) => s.key === "printing")
          ? ("completed" as const)
          : index === PROGRESS_STEPS.findIndex((s) => s.key === "printing")
            ? ("current" as const)
            : ("future" as const),
      };
    }
    if (activeIndex < 0) {
      return { ...step, status: "future" as const };
    }
    if (index < activeIndex) return { ...step, status: "completed" as const };
    if (index === activeIndex) return { ...step, status: "current" as const };
    return { ...step, status: "future" as const };
  });
}

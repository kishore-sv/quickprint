export const SUPPORT_EMAIL = "help@quickprint.fun";

export type UserErrorCode =
  | "KIOSK_OFFLINE"
  | "PAYMENT_FAILED"
  | "JOB_CREATION_FAILED"
  | "FILE_DOWNLOAD_FAILED"
  | "PI_AGENT_ERROR"
  | "PRINT_FAILED"
  | "JOB_TIMEOUT"
  | "SERVICE_UNAVAILABLE"
  | "FILE_CLEANUP_FAILED";

const SAFE_MESSAGES: Record<UserErrorCode, string> = {
  KIOSK_OFFLINE:
    "Kiosk service is currently unavailable. Please try again later or contact the QuickPrint team.",
  PAYMENT_FAILED: "Payment could not be completed. Please try again.",
  JOB_CREATION_FAILED: "We could not create your print job. Please try again.",
  FILE_DOWNLOAD_FAILED:
    "The kiosk could not prepare your document. Please contact the QuickPrint team.",
  PI_AGENT_ERROR:
    "The kiosk encountered an error. Please contact the QuickPrint team.",
  PRINT_FAILED: "Printing failed. The kiosk could not process your document.",
  JOB_TIMEOUT: "Print service timed out. Please contact the QuickPrint team.",
  SERVICE_UNAVAILABLE:
    "This kiosk is not available right now. Please try another kiosk or contact the QuickPrint team.",
  FILE_CLEANUP_FAILED:
    "Your document was printed successfully. File cleanup is pending.",
};

export function safeMessageForErrorCode(code: UserErrorCode | string | null | undefined): string {
  if (code && code in SAFE_MESSAGES) {
    return `${SAFE_MESSAGES[code as UserErrorCode]} Contact us at ${SUPPORT_EMAIL}.`;
  }
  return `Something went wrong. Contact the QuickPrint team at ${SUPPORT_EMAIL}.`;
}

export function classifyPiFailure(rawError?: string | null): UserErrorCode {
  if (!rawError) return "PRINT_FAILED";
  const lower = rawError.toLowerCase();
  if (lower.includes("download") || lower.includes("fetch") || lower.includes("http")) {
    return "FILE_DOWNLOAD_FAILED";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "JOB_TIMEOUT";
  }
  if (lower.includes("offline") || lower.includes("unavailable") || lower.includes("printer")) {
    return "PI_AGENT_ERROR";
  }
  return "PRINT_FAILED";
}

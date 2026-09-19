import { ApiError } from "@/lib/api";

export type KioskScanErrorMessage = {
  title: string;
  description: string;
};

export function kioskScanErrorMessage(error: unknown): KioskScanErrorMessage {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.code === "NOT_FOUND") {
      return {
        title: "Kiosk not found",
        description:
          "This QR code isn't valid or has expired. Please scan the QR on the printer you're standing at.",
      };
    }

    if (error.status === 0) {
      return {
        title: "Can't reach QuickPrint",
        description: "Check your internet connection and try scanning again.",
      };
    }
  }

  return {
    title: "Couldn't connect to kiosk",
    description: "Please scan the QR code shown on the printer.",
  };
}

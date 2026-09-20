import { apiFetch } from "@/lib/api";

/** Expire the user's active kiosk session on the server (no client storage). */
export async function clearKioskServerSession(): Promise<void> {
  try {
    await apiFetch("/kiosks/session", { method: "DELETE" });
  } catch {
    /* ignore — session may already be expired */
  }
}

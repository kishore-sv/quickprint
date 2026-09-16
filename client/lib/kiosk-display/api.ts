import type { KioskDisplayStateResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function unwrapSuccess<T>(body: unknown): T {
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    (body as { success: boolean }).success === true &&
    "data" in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export async function fetchKioskDisplayState(
  kioskCode: string
): Promise<KioskDisplayStateResponse> {
  const res = await fetch(`${API_URL}/kiosks/${encodeURIComponent(kioskCode)}/display-state`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`display-state failed: ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  return unwrapSuccess<KioskDisplayStateResponse>(json);
}

export function kioskDisplayWsUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const wsBase = api.replace(/^http/, "ws");
  return `${wsBase}/ws/kiosk-display`;
}

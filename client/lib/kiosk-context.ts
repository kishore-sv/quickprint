const STORAGE_KEY = "quickprint.kiosk.v1";

export type KioskContext = {
  publicToken: string;
  name: string;
};

export function readKioskContext(): KioskContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KioskContext;
    if (!parsed.publicToken || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeKioskContext(ctx: KioskContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

export function clearKioskContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

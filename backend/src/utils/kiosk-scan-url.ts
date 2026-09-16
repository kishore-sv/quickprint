export function buildKioskScanUrl(publicToken: string, appBaseUrl: string): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}/scan/${encodeURIComponent(publicToken)}`;
}

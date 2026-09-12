import { Suspense } from "react";
import ScanPage from "./scan-content";

export default function ScanRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ScanPage />
    </Suspense>
  );
}

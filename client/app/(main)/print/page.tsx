import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import PrintPageContent from "./print-page-content";

export default function PrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Spinner className="size-8 text-primary" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      }
    >
      <PrintPageContent />
    </Suspense>
  );
}

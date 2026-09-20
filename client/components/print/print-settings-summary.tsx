"use client";

import { Badge } from "@/components/ui/badge";
import type { PrintSettings } from "@/lib/types";

type PrintSettingsSummaryProps = {
  settings: PrintSettings;
  pageCount: number;
  className?: string;
};

export function PrintSettingsSummary({
  settings,
  pageCount,
  className,
}: PrintSettingsSummaryProps) {
  const sides = settings.duplex === "DOUBLE" ? "Duplex" : "Single-sided";
  const color = settings.color_mode === "BW" ? "B&W" : "Color";

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      <Badge variant="secondary">{pageCount} pages</Badge>
      <Badge variant="secondary">{settings.copies} cop{settings.copies === 1 ? "y" : "ies"}</Badge>
      <Badge variant="secondary">{color}</Badge>
      <Badge variant="secondary">{settings.pages_per_sheet}-up</Badge>
      <Badge variant="secondary">{sides}</Badge>
    </div>
  );
}

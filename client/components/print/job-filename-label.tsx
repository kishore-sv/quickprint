"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type JobFilenameLabelProps = {
  label: string;
  filenames?: string[];
  className?: string;
  as?: "p" | "h2";
};

export function JobFilenameLabel({
  label,
  filenames,
  className,
  as = "p",
}: JobFilenameLabelProps) {
  const showTooltip = (filenames?.length ?? 0) > 1;

  if (!showTooltip) {
    if (as === "h2") {
      return <h2 className={className}>{label}</h2>;
    }
    return <p className={className}>{label}</p>;
  }

  const list = (
    <ul className="max-h-48 space-y-1 overflow-y-auto text-left">
      {filenames!.map((name, index) => (
        <li key={`${index}-${name}`} className="break-all leading-snug">
          {index + 1}. {name}
        </li>
      ))}
    </ul>
  );

  if (as === "h2") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <h2
              className={cn(className, "cursor-default underline decoration-dotted underline-offset-2")}
            />
          }
        >
          {label}
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-sm px-3 py-2">
          {list}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <p
            className={cn(className, "cursor-default underline decoration-dotted underline-offset-2")}
          />
        }
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-sm px-3 py-2">
        {list}
      </TooltipContent>
    </Tooltip>
  );
}

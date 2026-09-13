"use client";

import { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { CameraIcon, UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type FileDropzoneProps = {
  onFilesSelected: (files: File[]) => void;
  validating?: boolean;
  disabled?: boolean;
  className?: string;
};

export function FileDropzone({
  onFilesSelected,
  validating = false,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const cameraRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFilesSelected(accepted);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: disabled || validating,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Card
        {...getRootProps()}
        size="sm"
        className={cn(
          "cursor-pointer border-dashed py-0 px-2 mx-auto w-[99%] shadow-none transition-colors",
          isDragActive && "border-primary bg-primary/5",
          (disabled || validating) && "pointer-events-none opacity-60"
        )}
      >
        <CardContent className="px-4 py-6 text-center sm:px-6">
          <input {...getInputProps()} />
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {validating ? (
              <Spinner className="size-5" />
            ) : (
              <UploadIcon className="size-5" />
            )}
          </div>
          <p className="text-base font-semibold">Choose files</p>
          <p className="text-muted-foreground mt-1 text-sm">
            pick as many as you need, or drop them here
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            PDF only — validated before upload · up to 20 MB
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full max-w-xs"
            disabled={disabled || validating}
          >
            Browse files
          </Button>
        </CardContent>
      </Card>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFilesSelected([f]);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full gap-2"
        disabled={disabled || validating}
        onClick={() => cameraRef.current?.click()}
      >
        <CameraIcon className="size-4" />
        Take a photo
      </Button>
    </div>
  );
}

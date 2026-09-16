"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

type KioskQrProps = {
  scanUrl: string;
  size?: number;
};

export function KioskQr({ scanUrl, size = 320 }: KioskQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!scanUrl || !canvasRef.current) return;
    void QRCode.toCanvas(canvasRef.current, scanUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: size,
      color: { dark: "#1e3a8a", light: "#ffffff" },
    });
  }, [scanUrl, size]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-2xl border-4 border-primary/20 bg-white p-3 shadow-lg"
      aria-label="QR code to start printing"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";
import { renderBarcodeToCanvas } from "@/lib/barcode-label";

interface BarcodePreviewProps {
  code: string;
  className?: string;
}

export function BarcodePreview({ code, className }: BarcodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !code) return;
    try {
      renderBarcodeToCanvas(code, canvasRef.current);
    } catch {
      // Invalid barcode value for CODE128 — leave canvas blank
    }
  }, [code]);

  if (!code) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className || "max-w-[180px] h-auto bg-white border rounded-sm"}
    />
  );
}

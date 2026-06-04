"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { renderBarcodeSvg } from "@/lib/barcode-svg";

export function Barcode({
  code,
  label = true,
  size = "md",
  className,
}: {
  code: string;
  label?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const heightMm = size === "lg" ? 20 : size === "sm" ? 10 : 14;
  const rendered = React.useMemo(() => renderBarcodeSvg({ code, type: "code128", heightMm, scale: 4 }), [code, heightMm]);

  return (
    <div className={cn("barcode", `barcode--${size}`, className)} aria-label={`Codigo ${rendered.text}`}>
      <div className="barcode-bars" aria-hidden="true" dangerouslySetInnerHTML={{ __html: rendered.svg }} />
      {label && <div className="barcode-label">{rendered.text}</div>}
    </div>
  );
}

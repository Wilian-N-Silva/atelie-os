"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

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
  const bars = React.useMemo(() => {
    const source = `91${code}73`;
    return source.split("").flatMap((char, index) => {
      const value = char.charCodeAt(0) + index;
      return [
        { w: 1 + (value % 3), gap: 1 },
        { w: 1 + ((value >> 1) % 2), gap: value % 2 ? 2 : 1 },
      ];
    });
  }, [code]);

  return (
    <div className={cn("barcode", `barcode--${size}`, className)} aria-label={`Codigo ${code}`}>
      <div className="barcode-bars" aria-hidden="true">
        {bars.map((bar, index) => (
          <span key={index} style={{ width: bar.w, marginRight: bar.gap }} />
        ))}
      </div>
      {label && <div className="barcode-label">{code}</div>}
    </div>
  );
}

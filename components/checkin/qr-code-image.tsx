"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

// Generado 100% client-side con la lib `qrcode` — no hace falta pasar por
// el servidor para armar la imagen, el valor a codificar ya viene resuelto
// (URL completa) desde el Server Component padre.
export function useQrDataUrl(value: string, size = 240) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return dataUrl;
}

export function QrCodeImage({
  value,
  size = 240,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const dataUrl = useQrDataUrl(value, size);

  if (!dataUrl) {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- es un data: URL generado en el cliente, next/image no aplica acá.
  return <img src={dataUrl} alt="Código QR" width={size} height={size} className={className} />;
}

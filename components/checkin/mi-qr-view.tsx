"use client";

import { DownloadIcon } from "lucide-react";

import { useQrDataUrl } from "@/components/checkin/qr-code-image";
import { Button } from "@/components/ui/button";

export function MiQrView({
  scanUrl,
  memberName,
  gymName,
}: {
  scanUrl: string;
  memberName: string;
  gymName: string;
}) {
  const dataUrl = useQrDataUrl(scanUrl, 280);

  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 px-6 py-10 text-center">
      <span className="text-sm font-medium text-muted-foreground">{gymName}</span>

      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URL generado en el cliente.
        <img
          src={dataUrl}
          alt="Tu código QR"
          width={280}
          height={280}
          className="rounded-xl border border-border"
        />
      ) : (
        <div className="size-[280px] animate-pulse rounded-xl bg-muted" />
      )}

      <span className="text-xl font-semibold text-foreground">{memberName}</span>

      <p className="max-w-xs text-sm text-muted-foreground">
        Guardá esta imagen en tu celular o mostrala en la entrada del gimnasio para marcar tu
        asistencia.
      </p>

      {dataUrl ? (
        <Button
          nativeButton={false}
          render={
            <a href={dataUrl} download={`qr-${memberName.replace(/\s+/g, "-").toLowerCase()}.png`} />
          }
        >
          <DownloadIcon />
          Descargar imagen
        </Button>
      ) : (
        <Button disabled>
          <DownloadIcon />
          Descargar imagen
        </Button>
      )}
    </div>
  );
}

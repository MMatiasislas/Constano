"use client";

import { PrinterIcon } from "lucide-react";

import { QrCodeImage } from "@/components/checkin/qr-code-image";
import { Button } from "@/components/ui/button";

export function ImprimirQrView({
  scanUrl,
  memberName,
  gymName,
}: {
  scanUrl: string;
  memberName: string;
  gymName: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
      <Button variant="outline" onClick={() => window.print()} className="print:hidden">
        <PrinterIcon />
        Imprimir
      </Button>
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border p-8 print:border-none print:p-0">
        <span className="text-sm font-medium text-muted-foreground">{gymName}</span>
        <QrCodeImage value={scanUrl} size={320} className="rounded-lg" />
        <span className="text-xl font-semibold text-foreground">{memberName}</span>
        <span className="text-sm text-muted-foreground">
          Mostrá este código en la entrada para marcar tu asistencia
        </span>
      </div>
    </div>
  );
}

import { CircleCheckIcon, InfoIcon } from "lucide-react";

import { formatearHoraCheckIn } from "@/lib/attendance";
import type { CheckinScanResult } from "@/app/checkin/[gymSlug]/actions";

export function CheckinResultView({ result }: { result: CheckinScanResult }) {
  if (result.status === "invalid") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <InfoIcon className="size-16 text-amber-500" />
        <p className="text-2xl font-semibold text-foreground">QR no reconocido</p>
        <p className="text-lg text-muted-foreground">Hablá con el encargado del gimnasio.</p>
      </div>
    );
  }

  const hora = formatearHoraCheckIn(result.checkedInAt);

  if (result.status === "already_checked_in") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <InfoIcon className="size-16 text-amber-500" />
        <p className="text-2xl font-semibold text-foreground">
          Ya registraste tu entrada hoy a las {hora}
        </p>
        <p className="text-lg text-muted-foreground">¡Nos vemos adentro!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <CircleCheckIcon className="size-16 text-emerald-500" />
      <p className="text-2xl font-semibold text-foreground">
        ¡Bienvenido {result.memberName}! 💪
      </p>
      <p className="text-lg text-muted-foreground">Entrada registrada a las {hora}</p>
    </div>
  );
}

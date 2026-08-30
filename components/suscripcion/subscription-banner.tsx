import Link from "next/link";
import { AlertTriangle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SubscriptionStatusInfo } from "@/lib/subscription";

function diasLabel(dias: number) {
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}

/**
 * Banner persistente (no descartable — no tiene botón de cerrar a
 * propósito) arriba de todo el dashboard cuando el gym está en
 * `grace_period` o `suspended`. No renderiza nada en `trial`/`active`.
 */
export function SubscriptionBanner({ statusInfo }: { statusInfo: SubscriptionStatusInfo }) {
  if (statusInfo.status === "grace_period") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning-subtle px-4 py-2.5 print:hidden">
        <div className="flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0 text-warning" />
          <span>
            Tu prueba gratuita venció. Te quedan {diasLabel(statusInfo.daysRemaining)} para
            activar un plan antes de perder acceso a crear y editar.
          </span>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/configuracion/suscripcion" />}
        >
          Ver planes
        </Button>
      </div>
    );
  }

  if (statusInfo.status === "suspended") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 print:hidden">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <XCircle className="size-4 shrink-0" />
          <span>Tu cuenta está suspendida. Activá un plan para volver a crear y editar.</span>
        </div>
        <Button
          size="sm"
          variant="destructive"
          nativeButton={false}
          render={<Link href="/dashboard/configuracion/suscripcion" />}
        >
          Ver planes
        </Button>
      </div>
    );
  }

  return null;
}

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CalendarClock, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SubscriptionStatusInfo } from "@/lib/subscription";

function diasLabel(dias: number) {
  return `${dias} ${dias === 1 ? "día" : "días"}`;
}

export function EstadoSuscripcionCard({
  statusInfo,
  planName,
}: {
  statusInfo: SubscriptionStatusInfo;
  planName: string | null;
}) {
  if (statusInfo.status === "trial") {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Estás en período de prueba</p>
              <p className="text-sm text-muted-foreground">
                Te quedan {diasLabel(statusInfo.daysRemaining)} de prueba gratis.
              </p>
            </div>
          </div>
          <Badge variant="secondary">{diasLabel(statusInfo.daysRemaining)} restantes</Badge>
        </CardContent>
      </Card>
    );
  }

  if (statusInfo.status === "grace_period") {
    return (
      <Card className="border-warning/40 bg-warning-subtle">
        <CardContent className="flex items-start gap-3 py-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Tu prueba venció</p>
            <p className="text-sm text-warning/90">
              Tenés {diasLabel(statusInfo.daysRemaining)} para activar un plan antes de perder
              acceso a Constano.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusInfo.status === "active") {
    const nextChargeLabel = statusInfo.currentPeriodEnd
      ? format(new Date(statusInfo.currentPeriodEnd), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;

    return (
      <Card className="border-success/40 bg-success-subtle">
        <CardContent className="flex items-center gap-3 py-5">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <div>
            <p className="font-medium text-foreground">
              Plan {planName ?? statusInfo.planId} activo
            </p>
            {nextChargeLabel && (
              <p className="text-sm text-muted-foreground">Próximo cobro: {nextChargeLabel}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // suspended
  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="flex items-start gap-3 py-5">
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Tu cuenta está suspendida</p>
          <p className="text-sm text-destructive/90">
            Activá un plan para recuperar el acceso a Constano. Mientras tanto podés seguir viendo
            tus datos, pero no crear ni editar nada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

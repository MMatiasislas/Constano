import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { getInitials, nombreCompleto, whatsappHref } from "@/lib/members";
import { ALERT_STATUS_BADGE, ALERT_STATUS_LABELS, resolutionReasonLabel } from "@/lib/retention";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactarButton } from "./contactar-button";
import { ResolverAlertaDialog } from "./resolver-alerta-dialog";
import { DescartarAlertaDialog } from "./descartar-alerta-dialog";
import { ReabrirAlertaDialog } from "./reabrir-alerta-dialog";
import type { RetentionAlertWithDetails } from "@/types/db";

export function AlertaCard({ alerta }: { alerta: RetentionAlertWithDetails }) {
  const alumno = alerta.members;
  const nombre = nombreCompleto(alumno.first_name, alumno.last_name);
  const esAbierta = alerta.status === "active" || alerta.status === "contacted";
  const motivo = resolutionReasonLabel(alerta.resolution_reason);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar>
            {alumno.photo_url && <AvatarImage src={alumno.photo_url} alt={nombre} />}
            <AvatarFallback>{getInitials(alumno.first_name, alumno.last_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/alumnos/${alumno.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {nombre}
              </Link>
              <Badge variant="outline" className={ALERT_STATUS_BADGE[alerta.status]}>
                {ALERT_STATUS_LABELS[alerta.status]}
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {alerta.days_without_attendance} días sin venir · disparada por &quot;
              {alerta.retention_rules.name}&quot;
            </span>
            <span className="text-xs text-muted-foreground">
              Detectada{" "}
              {formatDistanceToNow(new Date(alerta.triggered_at), { locale: es, addSuffix: true })}
              {!esAbierta && motivo && <> · {motivo}</>}
            </span>
            {alerta.notes && (
              <span className="text-xs text-muted-foreground italic">
                &quot;{alerta.notes}&quot;
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {esAbierta && alumno.phone && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a
                  href={whatsappHref(
                    alumno.phone,
                    `Hola ${alumno.first_name}! Te extrañamos por el gym, ¿todo bien?`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <MessageCircleIcon />
              WhatsApp
            </Button>
          )}
          {alerta.status === "active" && <ContactarButton alertId={alerta.id} />}
          {esAbierta && (
            <>
              <ResolverAlertaDialog alertId={alerta.id} />
              <DescartarAlertaDialog alertId={alerta.id} />
            </>
          )}
          {!esAbierta && <ReabrirAlertaDialog alertId={alerta.id} />}
        </div>
      </CardContent>
    </Card>
  );
}

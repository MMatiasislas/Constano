import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { getInitials, nombreCompleto, parseFechaLocal } from "@/lib/members";
import { formatCurrency, type MembershipStatusLabel } from "@/lib/payments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CobrarRenovarDialog } from "./cobrar-renovar-dialog";
import type { Member, MembershipWithPlan } from "@/types/db";

export function AlumnoPagoRow({
  member,
  membership,
  status,
  dias,
}: {
  member: Member;
  membership: MembershipWithPlan | null;
  status: MembershipStatusLabel;
  dias: number | null;
}) {
  const nombre = nombreCompleto(member.first_name, member.last_name);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar>
            {member.photo_url && <AvatarImage src={member.photo_url} alt={nombre} />}
            <AvatarFallback>{getInitials(member.first_name, member.last_name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <Link
              href={`/dashboard/alumnos/${member.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {nombre}
            </Link>
            <span className="text-sm text-muted-foreground">
              {member.phone || "Sin teléfono"}
            </span>
            {membership ? (
              <span className="text-sm text-muted-foreground">
                {membership.plans.name} · {formatCurrency(membership.plans.price)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Sin plan asignado</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VencimientoTexto membership={membership} status={status} dias={dias} />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/alumnos/${member.id}`} />}
            >
              Ver alumno
            </Button>
            {membership && (
              <CobrarRenovarDialog
                memberId={member.id}
                membership={membership}
                triggerVariant="outline"
                triggerLabel="Cobrar y renovar"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VencimientoTexto({
  membership,
  status,
  dias,
}: {
  membership: MembershipWithPlan | null;
  status: MembershipStatusLabel;
  dias: number | null;
}) {
  if (!membership || dias === null) {
    return <span className="text-sm text-muted-foreground">Sin plan</span>;
  }

  const fecha = format(parseFechaLocal(membership.end_date), "dd/MM/yyyy", { locale: es });

  if (status === "vencido") {
    return (
      <span className="text-sm font-medium text-danger">
        Vencido hace {Math.abs(dias)} {Math.abs(dias) === 1 ? "día" : "días"} ({fecha})
      </span>
    );
  }

  if (status === "vence_pronto") {
    return (
      <span className="text-sm font-medium text-warning">
        Vence en {dias} {dias === 1 ? "día" : "días"} ({fecha})
      </span>
    );
  }

  return <span className="text-sm text-muted-foreground">Vence el {fecha}</span>;
}

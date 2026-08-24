import { format } from "date-fns";
import { es } from "date-fns/locale";

import { formatCurrency, getMethodLabel } from "@/lib/payments";
import { parseFechaLocal } from "@/lib/members";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Payment } from "@/types/db";

// `payments.paid_at` es `timestamptz` (no `date` como `memberships.start_date`/`end_date`):
// llega como ISO completo ("2026-08-24T00:00:00+00:00"). `.slice(0, 10)` toma los primeros 10
// caracteres del string crudo antes de pasarlo a `parseFechaLocal` — mismo patrón ya usado con
// `routine.created_at` en la ficha del alumno — para no arrastrar timezone al recortar la fecha.
export function HistorialPagos({ pagos }: { pagos: Payment[] }) {
  if (pagos.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-center text-muted-foreground">
          Todavía no se registraron pagos para este alumno.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map((pago) => (
              <TableRow key={pago.id}>
                <TableCell>
                  {format(parseFechaLocal(pago.paid_at.slice(0, 10)), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {formatCurrency(pago.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getMethodLabel(pago.method)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{pago.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

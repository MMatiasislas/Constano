import { createClient } from "@/lib/supabase/server";
import { formatFrequency } from "@/lib/retention";
import { Card, CardContent } from "@/components/ui/card";
import { NuevaReglaDialog } from "@/components/retencion/nueva-regla-dialog";
import { EditarReglaDialog } from "@/components/retencion/editar-regla-dialog";
import { BorrarReglaDialog } from "@/components/retencion/borrar-regla-dialog";
import { ReglaToggle } from "@/components/retencion/regla-toggle";
import { ReglasSugeridas } from "@/components/retencion/reglas-sugeridas";
import type { RetentionRule } from "@/types/db";

export default async function RetencionConfigPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("retention_rules")
    .select("*")
    .order("created_at", { ascending: false });

  const reglas = (data ?? []) as RetentionRule[];
  const activas = reglas.filter((regla) => regla.active).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reglas de retención</h1>
          <p className="text-muted-foreground">
            Definí cuándo el sistema te avisa que un alumno está en riesgo. Podés tener varias
            reglas activas al mismo tiempo.
          </p>
        </div>
        {reglas.length > 0 && <NuevaReglaDialog />}
      </div>

      {reglas.length === 0 ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-medium text-foreground">Todavía no tenés reglas de retención</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Una regla le dice a Constano cuándo avisarte que un alumno dejó de venir. Por
                ejemplo: &quot;avisame si un alumno de 3x/sem no viene hace 5 días&quot;.
              </p>
            </CardContent>
          </Card>

          <ReglasSugeridas />

          <div className="text-center">
            <NuevaReglaDialog triggerVariant="link" triggerLabel="O creá una regla personalizada" />
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {activas} {activas === 1 ? "regla activa" : "reglas activas"} de {reglas.length}{" "}
            {reglas.length === 1 ? "total" : "totales"}
          </p>
          <div className="flex flex-col gap-3">
            {reglas.map((regla) => (
              <Card key={regla.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{regla.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Alumnos {formatFrequency(regla.applies_to_frequency)} · sin venir hace{" "}
                      {regla.days_without_attendance} días
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ReglaToggle rule={regla} />
                    <EditarReglaDialog rule={regla} />
                    <BorrarReglaDialog rule={regla} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

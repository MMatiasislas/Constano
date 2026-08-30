import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { NuevoPlanDialog } from "@/components/planes/nuevo-plan-dialog";
import { EditarPlanDialog } from "@/components/planes/editar-plan-dialog";
import { BorrarPlanDialog } from "@/components/planes/borrar-plan-dialog";
import { PlanToggle } from "@/components/planes/plan-toggle";
import { PlanesSugeridos } from "@/components/planes/planes-sugeridos";
import type { Plan } from "@/types/db";

export default async function PlanesConfigPage() {
  const supabase = await createClient();

  const { data } = await supabase.from("plans").select("*").order("price", { ascending: true });

  const planes = (data ?? []) as Plan[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Planes del gimnasio</h1>
          <p className="text-muted-foreground">
            Definí los planes que ofrecés a tus alumnos.
          </p>
        </div>
        {planes.length > 0 && <NuevoPlanDialog />}
      </div>

      {planes.length === 0 ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-medium text-foreground">Todavía no armaste tus planes</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Un plan define cuánto le cobrás a un alumno y por cuántos días. Después se lo
                podés asignar desde su ficha.
              </p>
            </CardContent>
          </Card>

          <PlanesSugeridos />

          <div className="text-center">
            <NuevoPlanDialog triggerVariant="outline" triggerLabel="Crear un plan personalizado" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {planes.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{plan.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${Number(plan.price).toLocaleString("es-AR")} · {plan.duration_days} días
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PlanToggle plan={plan} />
                  <EditarPlanDialog plan={plan} />
                  <BorrarPlanDialog plan={plan} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

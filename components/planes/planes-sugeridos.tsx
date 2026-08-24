"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createPlan } from "@/app/(dashboard)/dashboard/configuracion/planes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PlanFormValues } from "@/lib/validations/plan";

const planesSugeridos: { name: string; price: string; duration_days: string }[] = [
  { name: "3 veces por semana", price: "15000", duration_days: "30" },
  { name: "Libre", price: "20000", duration_days: "30" },
];

export function PlanesSugeridos() {
  const router = useRouter();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  async function handleCreate(index: number) {
    const sugerido = planesSugeridos[index];
    setLoadingIndex(index);

    const values: PlanFormValues = {
      name: sugerido.name,
      price: sugerido.price,
      duration_days: sugerido.duration_days,
      active: true,
    };

    const result = await createPlan(values);
    setLoadingIndex(null);

    if (result?.error) {
      toast.error("No pudimos crear el plan", { description: result.error });
      return;
    }

    toast.success("Plan creado");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Planes sugeridos</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {planesSugeridos.map((sugerido, index) => (
          <Card key={sugerido.name}>
            <CardContent className="flex flex-col gap-2 py-4">
              <span className="font-medium text-foreground">
                {sugerido.name} - ${Number(sugerido.price).toLocaleString("es-AR")}/
                {sugerido.duration_days} días
              </span>
              <Button
                variant="outline"
                className="w-fit"
                disabled={loadingIndex === index}
                onClick={() => handleCreate(index)}
              >
                {loadingIndex === index ? "Creando..." : "Crear este plan"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

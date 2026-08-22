"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createRetentionRule } from "@/app/(dashboard)/dashboard/configuracion/retencion/actions";
import { formatFrequency, frequencyOptionToDbValue, getDefaultRules } from "@/lib/retention";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ReglasSugeridas() {
  const router = useRouter();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const reglas = getDefaultRules();

  async function handleCreate(index: number) {
    const regla = reglas[index];
    setLoadingIndex(index);

    const result = await createRetentionRule({
      name: regla.name,
      days_without_attendance: String(regla.days_without_attendance),
      applies_to_frequency: regla.applies_to_frequency,
      active: true,
    });

    setLoadingIndex(null);

    if (result?.error) {
      toast.error("No pudimos crear la regla", { description: result.error });
      return;
    }

    toast.success("Regla creada");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">Reglas sugeridas</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {reglas.map((regla, index) => (
          <Card key={regla.name}>
            <CardContent className="flex flex-col gap-2 py-4">
              <span className="font-medium text-foreground">
                {regla.name} - {regla.days_without_attendance} días sin venir
              </span>
              <span className="text-sm text-muted-foreground">
                {formatFrequency(frequencyOptionToDbValue(regla.applies_to_frequency))}
              </span>
              <Button
                variant="outline"
                className="w-fit"
                disabled={loadingIndex === index}
                onClick={() => handleCreate(index)}
              >
                {loadingIndex === index ? "Creando..." : "Crear esta regla"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

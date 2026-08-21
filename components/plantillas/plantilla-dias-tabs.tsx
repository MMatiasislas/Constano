"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorEjerciciosDia } from "@/components/rutinas/editor-ejercicios-dia";
import { AgregarDiaPlantillaDialog } from "./agregar-dia-plantilla-dialog";
import { RenombrarDiaPlantillaDialog } from "./renombrar-dia-plantilla-dialog";
import { EliminarDiaPlantillaDialog } from "./eliminar-dia-plantilla-dialog";
import type { TemplateDayWithExercises } from "@/types/db";

export function PlantillaDiasTabs({
  templateId,
  days,
}: {
  templateId: string;
  days: TemplateDayWithExercises[];
}) {
  const [activeDayId, setActiveDayId] = useState<string | undefined>(days[0]?.id);
  const resolvedActiveDayId = days.some((day) => day.id === activeDayId)
    ? activeDayId
    : days[0]?.id;

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Todavía no hay días en esta plantilla.</p>
          <AgregarDiaPlantillaDialog templateId={templateId} onDayAdded={setActiveDayId} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={resolvedActiveDayId} onValueChange={setActiveDayId}>
      <div className="flex flex-wrap items-center gap-2">
        <TabsList>
          {days.map((day) => (
            <TabsTrigger key={day.id} value={day.id}>
              {day.name}
              <span className="ml-1 text-[10px] text-muted-foreground">D{day.day_number}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <AgregarDiaPlantillaDialog templateId={templateId} onDayAdded={setActiveDayId} />
      </div>
      {days.map((day) => (
        <TabsContent key={day.id} value={day.id}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h3 className="text-base font-medium text-foreground">{day.name}</h3>
                <span className="text-xs text-muted-foreground">Día {day.day_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <RenombrarDiaPlantillaDialog day={day} templateId={templateId} />
                <EliminarDiaPlantillaDialog day={day} templateId={templateId} />
              </div>
            </div>
            <EditorEjerciciosDia
              context="template"
              dayId={day.id}
              ejercicios={day.routine_template_exercises}
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

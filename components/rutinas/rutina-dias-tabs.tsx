"use client";

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgregarDiaDialog } from "./agregar-dia-dialog";
import { RenombrarDiaDialog } from "./renombrar-dia-dialog";
import { EliminarDiaDialog } from "./eliminar-dia-dialog";
import { EditorEjerciciosDia } from "./editor-ejercicios-dia";
import type { RoutineDayWithExercises } from "@/types/db";

export function RutinaDiasTabs({
  routineId,
  memberId,
  days,
}: {
  routineId: string;
  memberId: string;
  days: RoutineDayWithExercises[];
}) {
  const [activeDayId, setActiveDayId] = useState<string | undefined>(days[0]?.id);
  const resolvedActiveDayId = days.some((day) => day.id === activeDayId)
    ? activeDayId
    : days[0]?.id;

  if (days.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">Todavía no hay días en esta rutina.</p>
          <AgregarDiaDialog routineId={routineId} memberId={memberId} onDayAdded={setActiveDayId} />
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
        <AgregarDiaDialog routineId={routineId} memberId={memberId} onDayAdded={setActiveDayId} />
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
                <RenombrarDiaDialog day={day} memberId={memberId} />
                <EliminarDiaDialog day={day} memberId={memberId} />
              </div>
            </div>
            <EditorEjerciciosDia routineDayId={day.id} ejercicios={day.routine_exercises} />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

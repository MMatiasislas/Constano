"use client";

import { CircleCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

export function PasoResultado({
  created,
  updated,
  omitidos,
  onVerAlumnos,
  onImportarOtro,
}: {
  created: number;
  updated: number;
  omitidos: number;
  onVerAlumnos: () => void;
  onImportarOtro: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheckIcon className="size-10 text-success" />
        <div className="flex flex-col gap-1">
          <p className="text-lg font-medium text-foreground">
            Se importaron {created} {created === 1 ? "alumno nuevo" : "alumnos nuevos"}.
          </p>
          <p className="text-sm text-muted-foreground">
            Se actualizaron {updated}. Se omitieron {omitidos}.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onImportarOtro}>
          Importar otro archivo
        </Button>
        <Button type="button" onClick={onVerAlumnos}>
          Ver alumnos
        </Button>
      </DialogFooter>
    </div>
  );
}

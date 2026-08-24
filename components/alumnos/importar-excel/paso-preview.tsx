"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2Icon, Loader2Icon, TriangleAlertIcon, XCircleIcon } from "lucide-react";

import { nombreCompleto, parseFechaLocal, frecuenciaLabel } from "@/lib/members";
import type { ProcessedRow } from "./procesar-filas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DUPLICATE_ACTION_ITEMS = { omitir: "Omitir", actualizar: "Actualizar" };

export function PasoPreview({
  rows,
  onChangeDuplicateAction,
  onBack,
  onImport,
  importing,
}: {
  rows: ProcessedRow[];
  onChangeDuplicateAction: (rowIndex: number, action: "omitir" | "actualizar") => void;
  onBack: () => void;
  onImport: () => void;
  importing: boolean;
}) {
  const { nuevas, duplicados, errores, aImportar } = useMemo(() => {
    let nuevas = 0;
    let duplicados = 0;
    let errores = 0;
    let aImportar = 0;

    for (const row of rows) {
      if (row.status === "nueva") {
        nuevas++;
        aImportar++;
      } else if (row.status === "duplicado") {
        duplicados++;
        if (row.duplicateAction === "actualizar") aImportar++;
      } else {
        errores++;
      }
    }

    return { nuevas, duplicados, errores, aImportar };
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground">
        <span className="font-medium">{nuevas}</span> {nuevas === 1 ? "nueva" : "nuevas"} ·{" "}
        <span className="font-medium">{duplicados}</span>{" "}
        {duplicados === 1 ? "duplicado" : "duplicados"} ·{" "}
        <span className="font-medium">{errores}</span>{" "}
        {errores === 1 ? "con error" : "con errores"}
      </p>

      <div className="max-h-96 overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estado</TableHead>
              <TableHead>Alumno</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Fecha de alta</TableHead>
              <TableHead>Frecuencia</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead className="w-36">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.rowIndex}>
                <TableCell>
                  <EstadoBadge status={row.status} />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.data ? nombreCompleto(row.data.first_name, row.data.last_name) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.data?.phone || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.data
                    ? format(parseFechaLocal(row.data.joined_at), "dd/MM/yyyy", { locale: es })
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.data ? frecuenciaLabel(row.data.weekly_frequency) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.status === "error" && row.errorMessage}
                  {row.status === "duplicado" && `Ya existe: ${row.duplicateOf?.label}`}
                  {row.status === "nueva" && "—"}
                </TableCell>
                <TableCell>
                  {row.status === "duplicado" ? (
                    <Select
                      items={DUPLICATE_ACTION_ITEMS}
                      value={row.duplicateAction}
                      onValueChange={(value) =>
                        onChangeDuplicateAction(row.rowIndex, value as "omitir" | "actualizar")
                      }
                    >
                      <SelectTrigger className="w-full" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="omitir">Omitir</SelectItem>
                        <SelectItem value="actualizar">Actualizar</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={importing}>
          Atrás
        </Button>
        <Button type="button" disabled={aImportar === 0 || importing} onClick={onImport}>
          {importing && <Loader2Icon className="animate-spin" />}
          {importing ? "Importando..." : `Importar ${aImportar} ${aImportar === 1 ? "alumno" : "alumnos"}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

function EstadoBadge({ status }: { status: ProcessedRow["status"] }) {
  if (status === "nueva") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      >
        <CheckCircle2Icon className="size-3" />
        Nueva
      </Badge>
    );
  }

  if (status === "duplicado") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400"
      >
        <TriangleAlertIcon className="size-3" />
        Duplicado
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-transparent bg-red-500/15 text-red-700 dark:text-red-400"
    >
      <XCircleIcon className="size-3" />
      Error
    </Badge>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUpIcon } from "lucide-react";

import {
  getExistingMembersForImport,
  importMembers,
  type ExistingMemberForImport,
  type ImportRow,
} from "@/app/(dashboard)/dashboard/alumnos/importar/actions";
import { detectarMapeoColumna, type ImportField } from "@/lib/validations/member-import";
import { procesarFilas, type ProcessedRow } from "./procesar-filas";
import { PasoSubirArchivo } from "./paso-subir-archivo";
import { PasoMapeoColumnas } from "./paso-mapeo-columnas";
import { PasoPreview } from "./paso-preview";
import { PasoResultado } from "./paso-resultado";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type WizardStep = 1 | 2 | 3 | 4;

const TITULOS_POR_PASO: Record<WizardStep, { titulo: string; descripcion: string }> = {
  1: {
    titulo: "Importar alumnos desde Excel",
    descripcion: "Subí un archivo .xlsx, .xls o .csv con tu lista de alumnos.",
  },
  2: {
    titulo: "Mapear columnas",
    descripcion: "Indicá qué campo de Constano corresponde a cada columna.",
  },
  3: {
    titulo: "Revisar antes de importar",
    descripcion: "Chequeá los datos y resolvé los duplicados detectados.",
  },
  4: {
    titulo: "Importación completa",
    descripcion: "",
  },
};

const estadoInicial = {
  step: 1 as WizardStep,
  fileName: null as string | null,
  headers: [] as string[],
  rawRows: [] as string[][],
  mapping: [] as ImportField[],
  existingMembers: [] as ExistingMemberForImport[],
  processedRows: [] as ProcessedRow[],
  resultado: null as { created: number; updated: number } | null,
};

export function ImportarExcelDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(estadoInicial);
  const [loadingPaso2, setLoadingPaso2] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setState(estadoInicial);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  }

  function handleParsed(fileName: string, headers: string[], rows: string[][]) {
    setState((prev) => ({
      ...prev,
      fileName,
      headers,
      rawRows: rows,
      mapping: headers.map((header) => detectarMapeoColumna(header)),
    }));
  }

  function handleChangeMapping(colIndex: number, field: ImportField) {
    setState((prev) => {
      const mapping = [...prev.mapping];
      mapping[colIndex] = field;
      return { ...prev, mapping };
    });
  }

  async function handleAvanzarAPreview() {
    setLoadingPaso2(true);
    const { members, error } = await getExistingMembersForImport();
    setLoadingPaso2(false);

    if (error) {
      toast.error("No pudimos cargar los alumnos existentes", { description: error });
      return;
    }

    const processedRows = procesarFilas(state.rawRows, state.mapping, members);
    setState((prev) => ({ ...prev, existingMembers: members, processedRows, step: 3 }));
  }

  function handleChangeDuplicateAction(rowIndex: number, action: "omitir" | "actualizar") {
    setState((prev) => ({
      ...prev,
      processedRows: prev.processedRows.map((row) =>
        row.rowIndex === rowIndex ? { ...row, duplicateAction: action } : row
      ),
    }));
  }

  async function handleImportar() {
    const rows: ImportRow[] = [];

    for (const row of state.processedRows) {
      if (!row.data) continue;
      if (row.status === "nueva") {
        rows.push({ action: "create", data: row.data });
      } else if (row.status === "duplicado" && row.duplicateAction === "actualizar") {
        rows.push({ action: "update", data: row.data, existingId: row.duplicateOf?.id });
      }
    }

    setImporting(true);
    const resultado = await importMembers(rows);
    setImporting(false);

    if (resultado.error) {
      toast.error("No pudimos completar la importación", { description: resultado.error });
      return;
    }

    setState((prev) => ({ ...prev, resultado, step: 4 }));
  }

  function handleVerAlumnos() {
    setOpen(false);
    reset();
    router.push("/dashboard/alumnos");
    router.refresh();
  }

  const omitidos = state.processedRows.filter(
    (row) => row.status === "error" || (row.status === "duplicado" && row.duplicateAction === "omitir")
  ).length;

  const { titulo, descripcion } = TITULOS_POR_PASO[state.step];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FileUpIcon />
        Importar desde Excel
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>

        {state.step === 1 && (
          <PasoSubirArchivo
            fileName={state.fileName}
            headers={state.headers}
            rows={state.rawRows}
            onParsed={handleParsed}
            onNext={() => setState((prev) => ({ ...prev, step: 2 }))}
          />
        )}

        {state.step === 2 && (
          <PasoMapeoColumnas
            headers={state.headers}
            mapping={state.mapping}
            onChangeMapping={handleChangeMapping}
            onBack={() => setState((prev) => ({ ...prev, step: 1 }))}
            onNext={handleAvanzarAPreview}
            loading={loadingPaso2}
          />
        )}

        {state.step === 3 && (
          <PasoPreview
            rows={state.processedRows}
            onChangeDuplicateAction={handleChangeDuplicateAction}
            onBack={() => setState((prev) => ({ ...prev, step: 2 }))}
            onImport={handleImportar}
            importing={importing}
          />
        )}

        {state.step === 4 && state.resultado && (
          <PasoResultado
            created={state.resultado.created}
            updated={state.resultado.updated}
            omitidos={omitidos}
            onVerAlumnos={handleVerAlumnos}
            onImportarOtro={reset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

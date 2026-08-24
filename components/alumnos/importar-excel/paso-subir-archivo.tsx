"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheetIcon, Loader2Icon, UploadIcon } from "lucide-react";

import { parsearArchivoExcel } from "./parse-archivo";
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

const EXTENSIONES_ACEPTADAS = ".xlsx,.xls,.csv";
const PREVIEW_ROWS = 5;

export function PasoSubirArchivo({
  fileName,
  headers,
  rows,
  onParsed,
  onNext,
}: {
  fileName: string | null;
  headers: string[];
  rows: string[][];
  onParsed: (fileName: string, headers: string[], rows: string[][]) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLoading(true);
    try {
      const parsed = await parsearArchivoExcel(file);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("El archivo está vacío", {
          description: "No encontramos filas con datos para importar.",
        });
        return;
      }

      onParsed(file.name, parsed.headers, parsed.rows);
    } catch {
      toast.error("No pudimos leer el archivo", {
        description: "Verificá que sea un .xlsx, .xls o .csv válido.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
        <FileSpreadsheetIcon className="size-8 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">
            {fileName ?? "Subí tu lista de alumnos"}
          </p>
          <p className="text-sm text-muted-foreground">
            Aceptamos archivos .xlsx, .xls o .csv
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
          {loading ? "Leyendo..." : fileName ? "Elegir otro archivo" : "Elegir archivo"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={EXTENSIONES_ACEPTADAS}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {headers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Vista previa · {rows.length} {rows.length === 1 ? "fila detectada" : "filas detectadas"}
          </p>
          <div className="max-h-64 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header, index) => (
                    <TableHead key={index}>{header || `Columna ${index + 1}`}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {headers.map((_, colIndex) => (
                      <TableCell key={colIndex} className="text-muted-foreground">
                        {row[colIndex] || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" disabled={headers.length === 0} onClick={onNext}>
          Siguiente
        </Button>
      </DialogFooter>
    </div>
  );
}

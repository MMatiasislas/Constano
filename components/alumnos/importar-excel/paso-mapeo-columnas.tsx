"use client";

import { Loader2Icon } from "lucide-react";

import {
  IMPORT_FIELDS,
  importFieldItems,
  type ImportField,
} from "@/lib/validations/member-import";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PasoMapeoColumnas({
  headers,
  mapping,
  onChangeMapping,
  onBack,
  onNext,
  loading,
}: {
  headers: string[];
  mapping: ImportField[];
  onChangeMapping: (colIndex: number, field: ImportField) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  const tieneNombreMapeado = mapping.includes("first_name");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Decidí a qué campo de Constano corresponde cada columna de tu archivo. &quot;Nombre&quot; es
        obligatorio.
      </p>

      <div className="flex flex-col gap-3">
        {headers.map((header, colIndex) => (
          <div key={colIndex} className="flex items-center gap-3">
            <span className="w-1/2 truncate text-sm font-medium text-foreground">
              {header || `Columna ${colIndex + 1}`}
            </span>
            <Select
              items={importFieldItems}
              value={mapping[colIndex]}
              onValueChange={(value) => onChangeMapping(colIndex, value as ImportField)}
            >
              <SelectTrigger className="w-1/2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {!tieneNombreMapeado && (
        <p className="text-sm text-danger">
          Mapeá al menos una columna a &quot;Nombre&quot; para continuar.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          Atrás
        </Button>
        <Button type="button" disabled={!tieneNombreMapeado || loading} onClick={onNext}>
          {loading && <Loader2Icon className="animate-spin" />}
          {loading ? "Procesando..." : "Siguiente"}
        </Button>
      </DialogFooter>
    </div>
  );
}

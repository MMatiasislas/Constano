import { format } from "date-fns";

import { nombreCompleto } from "@/lib/members";
import {
  memberImportRowSchema,
  parseEmailImportacion,
  parseFechaImportacion,
  parseFrecuenciaImportacion,
  type ImportField,
  type MemberImportData,
} from "@/lib/validations/member-import";
import type { ExistingMemberForImport } from "@/app/(dashboard)/dashboard/alumnos/importar/actions";

export type ProcessedRow = {
  rowIndex: number;
  status: "nueva" | "duplicado" | "error";
  data: MemberImportData | null;
  errorMessage?: string;
  duplicateOf?: { id: string; label: string };
  duplicateAction: "omitir" | "actualizar";
};

function normalizarNombre(nombre: string) {
  return nombre.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizarTelefono(telefono: string) {
  return telefono.replace(/[^\d]/g, "");
}

// Corre todas las filas crudas del Excel a través del mapeo de columnas
// elegido en el paso 2, valida cada una y chequea duplicados contra los
// alumnos ya existentes del gym (por nombre completo O teléfono, ambos
// normalizados). Es una función pura — el wizard la llama al entrar al
// paso 3 y cada vez que cambia el mapeo.
export function procesarFilas(
  rows: string[][],
  mapping: ImportField[],
  existingMembers: ExistingMemberForImport[]
): ProcessedRow[] {
  const nombresExistentes = new Map<string, ExistingMemberForImport>();
  const telefonosExistentes = new Map<string, ExistingMemberForImport>();

  for (const member of existingMembers) {
    const nombre = normalizarNombre(nombreCompleto(member.first_name, member.last_name));
    if (nombre) nombresExistentes.set(nombre, member);
    if (member.phone) {
      const telefono = normalizarTelefono(member.phone);
      if (telefono) telefonosExistentes.set(telefono, member);
    }
  }

  const hoy = format(new Date(), "yyyy-MM-dd");

  return rows.map((row, rowIndex): ProcessedRow => {
    const valores: Partial<Record<ImportField, string>> = {};
    mapping.forEach((field, colIndex) => {
      if (field === "ignore") return;
      const valor = row[colIndex] ?? "";
      // Si dos columnas del Excel se mapean al mismo campo, gana el primer
      // valor no vacío.
      if (!valores[field]) valores[field] = valor;
    });

    const first_name = (valores.first_name ?? "").trim();
    if (!first_name) {
      return {
        rowIndex,
        status: "error",
        data: null,
        errorMessage: "Falta el nombre",
        duplicateAction: "omitir",
      };
    }

    const candidato: MemberImportData = {
      first_name,
      last_name: (valores.last_name ?? "").trim() || null,
      phone: (valores.phone ?? "").trim() || null,
      email: parseEmailImportacion(valores.email ?? ""),
      birth_date: parseFechaImportacion(valores.birth_date ?? ""),
      joined_at: parseFechaImportacion(valores.joined_at ?? "") ?? hoy,
      weekly_frequency: parseFrecuenciaImportacion(valores.weekly_frequency ?? ""),
      notes: (valores.notes ?? "").trim() || null,
    };

    const parsed = memberImportRowSchema.safeParse(candidato);
    if (!parsed.success) {
      return {
        rowIndex,
        status: "error",
        data: null,
        errorMessage: parsed.error.issues[0]?.message ?? "Datos inválidos",
        duplicateAction: "omitir",
      };
    }

    const data = parsed.data;
    const nombreNormalizado = normalizarNombre(nombreCompleto(data.first_name, data.last_name));
    const telefonoNormalizado = data.phone ? normalizarTelefono(data.phone) : "";

    const existente =
      nombresExistentes.get(nombreNormalizado) ??
      (telefonoNormalizado ? telefonosExistentes.get(telefonoNormalizado) : undefined);

    if (existente) {
      return {
        rowIndex,
        status: "duplicado",
        data,
        duplicateOf: {
          id: existente.id,
          label: nombreCompleto(existente.first_name, existente.last_name),
        },
        duplicateAction: "omitir",
      };
    }

    return {
      rowIndex,
      status: "nueva",
      data,
      duplicateAction: "omitir",
    };
  });
}

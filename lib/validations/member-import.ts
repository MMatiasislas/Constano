import { z } from "zod";
import { format, isValid, parse } from "date-fns";

export const IMPORT_FIELDS = [
  { value: "first_name", label: "Nombre", required: true, keywords: ["nombre", "alumno"] },
  { value: "last_name", label: "Apellido", keywords: ["apellido"] },
  {
    value: "phone",
    label: "Teléfono",
    keywords: ["telefono", "tel", "celular", "whatsapp", "numero"],
  },
  { value: "email", label: "Email", keywords: ["email", "correo", "mail"] },
  {
    value: "birth_date",
    label: "Fecha de nacimiento",
    keywords: ["nacimiento", "cumple", "fecha nac"],
  },
  {
    value: "joined_at",
    label: "Fecha de alta",
    keywords: ["alta", "ingreso", "inscripcion"],
  },
  {
    value: "weekly_frequency",
    label: "Frecuencia semanal",
    keywords: ["frecuencia", "dias por semana", "dias semana"],
  },
  { value: "notes", label: "Notas", keywords: ["nota", "observacion", "comentario"] },
  { value: "ignore", label: "No importar esta columna", keywords: [] },
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number]["value"];

export const importFieldItems = Object.fromEntries(
  IMPORT_FIELDS.map((field) => [field.value, field.label])
);

function normalizarHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Sugiere a qué campo de Constano mapear una columna del Excel según su
// nombre. Se recorre IMPORT_FIELDS en orden y se toma el primer match: por
// eso `first_name` (con la keyword genérica "nombre") va antes que
// `last_name` — una columna "Nombre y Apellido" así sugiere `first_name`
// (un solo campo combinado) en vez de matchear "apellido" y sugerir
// `last_name`, tal como pide el producto.
export function detectarMapeoColumna(header: string): ImportField {
  const normalizado = normalizarHeader(header);

  for (const field of IMPORT_FIELDS) {
    if (field.value === "ignore") continue;
    if (field.keywords.some((keyword) => normalizado.includes(keyword))) {
      return field.value;
    }
  }

  return "ignore";
}

const DATE_FORMATS = ["dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"];

// Intenta parsear una fecha en varios formatos comunes de Excel/CSV
// (prioriza dd/MM/yyyy, la convención argentina). Devuelve `null` si no se
// pudo interpretar en ningún formato — el campo se descarta en silencio en
// vez de hacer fallar toda la fila, salvo que sea `joined_at` (ahí se usa
// hoy como default).
export function parseFechaImportacion(valor: string): string | null {
  const trimmed = valor.trim();
  if (!trimmed) return null;

  for (const formato of DATE_FORMATS) {
    const parsed = parse(trimmed, formato, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  return null;
}

// Acepta números ("3"), texto con número ("3x", "3 veces por semana") y
// "libre"/"Libre" → `null` (mismo sentinel que usa el resto de la app para
// "sin frecuencia fija"). Cualquier otra cosa no reconocida también cae en
// `null` en vez de hacer fallar la fila — la frecuencia nunca bloquea una
// importación.
export function parseFrecuenciaImportacion(valor: string): number | null {
  const trimmed = valor.trim().toLowerCase();
  if (!trimmed || trimmed === "libre" || trimmed === "-") return null;

  const match = trimmed.match(/\d+/);
  if (!match) return null;

  const numero = Number(match[0]);
  if (!Number.isInteger(numero) || numero < 1 || numero > 6) return null;

  return numero;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailImportacion(valor: string): string | null {
  const trimmed = valor.trim();
  if (!trimmed) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

// Shape ya normalizado (fechas a "YYYY-MM-DD", frecuencia a número|null,
// email validado) — a diferencia de `memberFormSchema` de lib/validations/member.ts,
// que valida strings crudos de un form. Acá solo queda por chequear lo
// mínimo indispensable: el nombre.
export const memberImportRowSchema = z.object({
  first_name: z.string().trim().min(1, "Falta el nombre"),
  last_name: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  email: z.string().trim().nullable(),
  birth_date: z.string().nullable(),
  joined_at: z.string().min(1),
  weekly_frequency: z.number().int().min(1).max(6).nullable(),
  notes: z.string().trim().nullable(),
});

export type MemberImportData = z.infer<typeof memberImportRowSchema>;

import * as XLSX from "xlsx";

export type ArchivoParseado = {
  headers: string[];
  rows: string[][];
};

// Parseo 100% client-side (SheetJS soporta .xlsx/.xls/.csv con el mismo
// código, detecta el formato solo por el contenido del buffer). El insert
// final a Supabase sí pasa por Server Action, esto solo lee el archivo.
export async function parsearArchivoExcel(file: File): Promise<ArchivoParseado> {
  // Un .csv sin BOM se lee como texto (Blob.text() decodifica UTF-8 según
  // el spec de la Web API) y se le pasa a XLSX.read con `type: "string"` —
  // pasarlo como ArrayBuffer crudo con `type: "array"` deja que SheetJS
  // adivine el codepage, y encontramos en vivo que adivinaba mal con
  // acentos/ñ (mojibake: "MarÃa" en vez de "María"). Un .xlsx/.xls sí es
  // binario real, así que ese sigue leyéndose como ArrayBuffer.
  const esCSV = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";

  const workbook = esCSV
    ? XLSX.read(await file.text(), { type: "string" })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const primeraHoja = workbook.SheetNames[0];

  if (!primeraHoja) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[primeraHoja];
  const data = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  if (data.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = (data[0] ?? []).map((valor) => String(valor ?? "").trim());

  const rows = data
    .slice(1)
    .map((fila) => headers.map((_, colIndex) => String(fila[colIndex] ?? "").trim()))
    .filter((fila) => fila.some((celda) => celda !== ""));

  return { headers, rows };
}

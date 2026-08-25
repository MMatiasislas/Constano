// Pura (sin imports de servidor): nombre de archivo sugerido para el
// download del PDF, a partir del título de la rutina/plantilla.
export function pdfFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${slug || "rutina"}.pdf`;
}

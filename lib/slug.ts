/**
 * Genera un slug a partir de un texto (ej. nombre de gimnasio) y le agrega
 * un sufijo aleatorio corto para evitar colisiones entre gimnasios con
 * nombres iguales o parecidos.
 */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function generateGymSlug(gymName: string) {
  const base = slugify(gymName) || "gimnasio"
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

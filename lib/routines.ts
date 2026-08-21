import { MESES } from "@/types/db";

export function monthLabel(monthNumber: number | null) {
  if (!monthNumber || monthNumber < 1 || monthNumber > 12) return null;
  return MESES[monthNumber - 1];
}

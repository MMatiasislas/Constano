import type { ApplyToFrequencyValue } from "@/types/db";

// `applies_to_frequency` en la tabla es un int nullable: `null` = todos los
// alumnos, `0` es un sentinel para "plan libre" (weekly_frequency IS NULL en
// members), y 1-6 significa "esa frecuencia o más". El 0 nunca colisiona con
// una frecuencia real porque weekly_frequency arranca en 1.
export function formatFrequency(value: number | null) {
  if (value === null) return "Todos";
  if (value === 0) return "Plan libre";
  return `${value}x/sem o más`;
}

export function frequencyOptionToDbValue(value: ApplyToFrequencyValue): number | null {
  if (value === "all") return null;
  if (value === "free") return 0;
  return Number(value);
}

export function dbValueToFrequencyOption(value: number | null): ApplyToFrequencyValue {
  if (value === null) return "all";
  if (value === 0) return "free";
  return String(value) as ApplyToFrequencyValue;
}

export type DefaultRetentionRule = {
  name: string;
  days_without_attendance: number;
  applies_to_frequency: ApplyToFrequencyValue;
};

// Sugeridas en el estado vacío de la pantalla de configuración. A propósito
// NO se insertan solas al crear el gym — el usuario elige si quiere usarlas.
export function getDefaultRules(): DefaultRetentionRule[] {
  return [
    { name: "Alerta estándar", days_without_attendance: 10, applies_to_frequency: "all" },
    { name: "Alerta premium", days_without_attendance: 5, applies_to_frequency: "3" },
  ];
}

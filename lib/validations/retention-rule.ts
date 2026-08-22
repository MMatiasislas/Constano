import { z } from "zod";

import { FREQUENCY_OPTIONS, type ApplyToFrequencyValue } from "@/types/db";

export const frequencyItems = Object.fromEntries(
  FREQUENCY_OPTIONS.map((option) => [option.value, option.label])
);

const frequencyValues = FREQUENCY_OPTIONS.map((option) => option.value) as [
  ApplyToFrequencyValue,
  ...ApplyToFrequencyValue[],
];

export const retentionRuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "Máximo 100 caracteres"),
  days_without_attendance: z
    .string()
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90;
    }, "Tiene que ser un número entero entre 1 y 90"),
  applies_to_frequency: z.enum(frequencyValues),
  active: z.boolean(),
});

export type RetentionRuleFormValues = z.infer<typeof retentionRuleSchema>;

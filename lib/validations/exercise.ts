import { z } from "zod";

import { MUSCLE_GROUPS } from "@/types/db";

export const muscleGroupOptions = [
  { value: "ninguno", label: "Sin grupo" },
  ...MUSCLE_GROUPS.map((group) => ({ value: group, label: group })),
] as const;

export const muscleGroupItems = Object.fromEntries(
  muscleGroupOptions.map((option) => [option.value, option.label])
);

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  muscle_group: z.enum(["ninguno", ...MUSCLE_GROUPS]),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
